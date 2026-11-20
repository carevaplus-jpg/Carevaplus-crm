package com.carevaplus.ai

import android.app.Application
import android.app.DownloadManager
import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

sealed interface EngineState {
    data object NoModel : EngineState
    data class Loading(val model: AiModel, val firstTime: Boolean) : EngineState
    data class Ready(val model: AiModel, val gpu: Boolean) : EngineState
    data class Failed(val model: AiModel, val message: String) : EngineState
}

/** Cloud sync status, shown on the account screen. */
data class SyncStatus(val running: Boolean = false, val lastOk: Long = 0, val error: String? = null)

data class DownloadInfo(val done: Long, val total: Long, val paused: Boolean, val failed: String? = null)

enum class Screen { CHAT, MODELS, ACCOUNT, AGENTS }

/** What the AI is doing right now, shown live above the reply. */
enum class Phase(val label: String) { READING("Reading your message"), THINKING("Thinking"), WRITING("Writing") }

/** A one-line summary of the latest finished sentence of the model's reasoning, for the live status. */
fun thoughtSummary(thought: String): String {
    val clean = thought.replace(Regex("[*#`>_|]"), "").replace(Regex("^\\s*\\d+\\.\\s*", RegexOption.MULTILINE), "")
        .replace(Regex("\\s+"), " ").trim()
    if (clean.isEmpty()) return ""
    val sentences = clean.split(Regex("(?<=[.!?:])\\s+"))
    val done = sentences.dropLast(1).lastOrNull { it.length > 8 } ?: sentences.last()
    return if (done.length > 90) done.take(88).trimEnd() + "…" else done
}

private fun wordCount(s: String) = s.trim().split(Regex("\\s+")).count { it.isNotEmpty() }

class ChatViewModel(app: Application) : AndroidViewModel(app) {
    private val downloader = ModelDownloader(app)
    // The on-device engine loads a native library; create it only when a phone model is used.
    private val engineHolder = lazy { AiEngine(app) }
    private val engine by engineHolder
    private val store = ChatStore(app)
    private val prefs = app.getSharedPreferences("settings", Context.MODE_PRIVATE)
    private val cloud = Cloud(app)
    private val deleted = HashMap(store.loadDeleted())

    /** The signed-in email, or null when the app is used without an account. */
    var account by mutableStateOf(cloud.session?.email); private set
    var sync by mutableStateOf(SyncStatus()); private set
    var authBusy by mutableStateOf(false); private set
    var authError by mutableStateOf<String?>(null); private set
    var authInfo by mutableStateOf<String?>(null); private set
    private var syncJob: Job? = null

    var screen by mutableStateOf(Screen.CHAT)
    var engineState by mutableStateOf<EngineState>(EngineState.NoModel); private set
    val installed = mutableStateListOf<String>()
    val downloads = mutableStateMapOf<String, DownloadInfo>()
    var activeModelId by mutableStateOf(prefs.getString("model", null)); private set
    var effort by mutableStateOf(Effort.entries.firstOrNull { it.name == prefs.getString("effort", null) } ?: Effort.LOW); private set
    var useGpu by mutableStateOf(prefs.getBoolean("gpu", true)); private set

    val chats = mutableStateListOf<Chat>()
    var currentId by mutableStateOf<String?>(null); private set
    /** The reply being written, or null when idle. */
    var streaming by mutableStateOf<String?>(null); private set
    var streamingThought by mutableStateOf(""); private set
    var phase by mutableStateOf(Phase.READING); private set
    var startedAt by mutableStateOf(0L); private set
    var wordsPerSecond by mutableStateOf(0.0); private set
    /** What the team of agents is doing (Ultra effort), e.g. "Checker agent is working". */
    var streamingStep by mutableStateOf(""); private set

    // ---- custom agents ----
    val agents = mutableStateListOf<Agent>().apply { addAll(store.loadAgents()) }
    private val deletedAgents = HashMap<String, Long>(prefs.getString("agents_deleted", null)?.let { s ->
        org.json.JSONObject(s).let { o -> o.keys().asSequence().associateWith { o.getLong(it) } } } ?: emptyMap())
    /** The agent the next new chat will use. */
    var pendingAgentId by mutableStateOf<String?>(null); private set
    val currentAgent: Agent? get() = agents.firstOrNull { it.id == (current?.agentId ?: pendingAgentId.takeIf { current == null }) }
    /** Image replies are being made. */
    var makingImage by mutableStateOf(false); private set
    private var replyJob: Job? = null

    val activeModel get() = Catalog.byId(activeModelId)
    val current: Chat? get() = chats.firstOrNull { it.id == currentId }
    val busy get() = streaming != null

    init {
        downloader.removeLegacy()
        chats.addAll(store.load())
        refreshInstalled()
        Catalog.models.filter { downloader.downloadId(it) >= 0 && it.id !in installed }.forEach { watch(it) }
        val start = activeModel?.takeIf { usable(it) } ?: Catalog.models.firstOrNull { it.id in installed }
            ?: Catalog.cloud.first().takeIf { account != null }
        if (start != null) selectModel(start.id) else screen = Screen.ACCOUNT // sign in first; nothing to download
        // keep chats up to date with the user's other phones while the app is open
        viewModelScope.launch { while (isActive) { if (account != null) syncNow(); delay(45_000) } }
    }

    /** A phone model that is downloaded, or a cloud model while signed in. */
    fun usable(m: AiModel) = if (m.cloud) account != null else m.id in installed

    private fun refreshInstalled() {
        installed.clear()
        installed.addAll(Catalog.models.filter { downloader.isInstalled(it) }.map { it.id })
    }

    // ---- models ----

    fun download(m: AiModel) {
        if (!downloader.hasRoomFor(m)) {
            downloads[m.id] = DownloadInfo(0, m.sizeBytes, false,
                "Not enough free space: ${m.name} needs about ${"%.1f".format(m.storageNeeded / 1e9)} GB (the model plus a cache the same size). Free up space or delete another model.")
            return
        }
        downloader.start(m); watch(m)
    }

    fun cancelDownload(m: AiModel) { downloader.cancel(m); downloads.remove(m.id) }

    fun deleteModel(m: AiModel) {
        if (busy) return
        if (engineHolder.isInitialized() && engine.loaded?.id == m.id) { engine.unload(); engineState = EngineState.NoModel }
        downloader.delete(m)
        refreshInstalled()
        if (activeModelId == m.id) {
            activeModelId = null; prefs.edit().remove("model").apply()
            (Catalog.models.firstOrNull { it.id in installed } ?: Catalog.cloud.first().takeIf { account != null })?.let { selectModel(it.id) }
        }
    }

    private fun watch(m: AiModel) {
        viewModelScope.launch {
            while (isActive) {
                val p = downloader.status(m)
                when {
                    p == null -> { downloads.remove(m.id); return@launch }
                    p.status == DownloadManager.STATUS_SUCCESSFUL -> {
                        downloader.forget(m); downloads.remove(m.id); refreshInstalled()
                        if (m.id in installed) { if (engineState !is EngineState.Ready) selectModel(m.id) }
                        else downloads[m.id] = DownloadInfo(0, m.sizeBytes, false, "The file was incomplete. Please try again.")
                        return@launch
                    }
                    p.status == DownloadManager.STATUS_FAILED -> {
                        downloader.forget(m)
                        downloads[m.id] = DownloadInfo(0, m.sizeBytes, false, "Download failed (code ${p.reason}). Check your connection and free space.")
                        return@launch
                    }
                    else -> downloads[m.id] = DownloadInfo(p.done, if (p.total > 0) p.total else m.sizeBytes, p.status == DownloadManager.STATUS_PAUSED)
                }
                delay(700)
            }
        }
    }

    fun selectModel(id: String) {
        val m = Catalog.byId(id) ?: return
        if (busy || !usable(m)) return
        if (activeModelId != id) effort = m.defaultEffort
        activeModelId = id
        prefs.edit().putString("model", id).putString("effort", effort.name).apply()
        load(m)
    }

    fun chooseEffort(e: Effort) { effort = e; prefs.edit().putString("effort", e.name).apply() }

    fun toggleGpu(on: Boolean) {
        useGpu = on; prefs.edit().putBoolean("gpu", on).apply()
        activeModel?.let { if (!it.cloud && it.id in installed && !busy) load(it) }
    }

    private fun load(m: AiModel) {
        if (m.cloud) { // nothing to load on the phone; free the memory a phone model was using
            if (engineHolder.isInitialized()) engine.unload()
            engineState = EngineState.Ready(m, gpu = false); return
        }
        engineState = EngineState.Loading(m, needsPreparing(getApplication(), m))
        viewModelScope.launch {
            engineState = try {
                withContext(Dispatchers.Default) { engine.load(m, downloader.file(m).absolutePath, useGpu) }
                EngineState.Ready(m, engine.loadedOnGpu)
            } catch (t: Throwable) {
                EngineState.Failed(m, "Couldn't start ${m.name}: ${t.message ?: t.javaClass.simpleName}. It needs about ${m.minRamGb} GB of RAM; try a smaller model.")
            }
        }
    }

    // ---- chats ----

    fun newChat() { if (!busy) { currentId = null; pendingAgentId = null; screen = Screen.CHAT } }

    /** Starts a new chat with a custom agent. */
    fun chatWith(agentId: String?) { if (!busy) { currentId = null; pendingAgentId = agentId; screen = Screen.CHAT } }

    private fun saveAgentsLocally() {
        store.saveAgents(agents)
        prefs.edit().putString("agents_deleted", org.json.JSONObject(deletedAgents as Map<*, *>).toString()).apply()
    }

    fun saveAgent(a: Agent) {
        val fresh = a.copy(name = a.name.trim().take(40), emoji = a.emoji.trim().ifEmpty { "🤖" }.take(4), updated = System.currentTimeMillis())
        val i = agents.indexOfFirst { it.id == a.id }
        if (i >= 0) agents[i] = fresh else agents.add(0, fresh)
        saveAgentsLocally(); syncNow()
    }

    fun deleteAgent(id: String) {
        agents.removeAll { it.id == id }
        deletedAgents[id] = System.currentTimeMillis()
        if (pendingAgentId == id) pendingAgentId = null
        saveAgentsLocally(); syncNow()
    }

    /** Newest version of each agent wins; deletions win over older edits. */
    private suspend fun syncAgents() {
        val remote = withContext(Dispatchers.IO) { cloud.pullAgents() }
        val upload = ArrayList<Agent>(); val uploadDeleted = HashMap<String, Long>()
        val byId = LinkedHashMap<String, Agent>().apply { agents.forEach { put(it.id, it) } }
        val seen = HashSet<String>()
        for ((r, gone) in remote) {
            seen += r.id
            val mine = byId[r.id]; val myDelete = deletedAgents[r.id]
            when {
                gone -> if (mine != null && mine.updated > r.updated) upload += mine else { byId.remove(r.id); deletedAgents[r.id] = maxOf(r.updated, myDelete ?: 0) }
                myDelete != null && myDelete >= r.updated -> uploadDeleted[r.id] = myDelete
                mine == null -> { byId[r.id] = r; deletedAgents.remove(r.id) }
                mine.updated > r.updated -> upload += mine
                mine.updated < r.updated -> byId[r.id] = r
            }
        }
        byId.values.filter { it.id !in seen }.forEach { upload += it }
        deletedAgents.filter { it.key !in seen }.forEach { uploadDeleted[it.key] = it.value }
        val merged = byId.values.toList()
        if (merged != agents.toList()) { agents.clear(); agents.addAll(merged) }
        saveAgentsLocally()
        withContext(Dispatchers.IO) { cloud.pushAgents(upload, uploadDeleted) }
    }

    /** Makes a picture from [prompt] with a free image model and adds it to the chat. */
    fun createImage(prompt: String) {
        val p = prompt.trim()
        if (p.isEmpty() || busy || makingImage) return
        val base = current ?: Chat(agentId = pendingAgentId)
        val now = System.currentTimeMillis()
        val seed = (now % 1_000_000).toInt()
        val url = "https://image.pollinations.ai/prompt/" + java.net.URLEncoder.encode(p, "UTF-8").replace("+", "%20") +
            "?width=1024&height=1024&seed=$seed&nologo=true&enhance=true"
        put(base.copy(
            title = if (base.messages.isEmpty()) p.lineSequence().first().take(48) else base.title,
            messages = base.messages + Msg("user", p) +
                Msg("assistant", "", model = "Careva Image", stats = "Image · 1024 × 1024 · free model", image = url),
            updated = now,
        ))
        store.save(chats); syncNow()
    }

    fun open(id: String) { if (!busy) { currentId = id; screen = Screen.CHAT } }

    fun delete(id: String) {
        if (busy && id == currentId) return
        chats.removeAll { it.id == id }
        if (currentId == id) currentId = null
        store.save(chats)
        deleted[id] = System.currentTimeMillis(); store.saveDeleted(deleted)
        syncNow()
    }

    private fun put(chat: Chat) {
        val i = chats.indexOfFirst { it.id == chat.id }
        if (i >= 0) chats.removeAt(i)
        chats.add(0, chat)
        currentId = chat.id
    }

    fun send(text: String) {
        val input = text.trim()
        val ready = engineState as? EngineState.Ready ?: return
        if (input.isEmpty() || busy) return
        val base = current ?: Chat(agentId = pendingAgentId)
        val agent = agents.firstOrNull { it.id == base.agentId }
        val history = base.messages
        val chat = base.copy(
            title = if (history.isEmpty()) input.lineSequence().first().take(48) else base.title,
            messages = history + Msg("user", input),
            updated = System.currentTimeMillis(),
        )
        put(chat); store.save(chats)
        streaming = ""; streamingThought = ""; streamingStep = ""; phase = Phase.READING; wordsPerSecond = 0.0
        val started = System.currentTimeMillis(); startedAt = started
        val effortUsed = effort
        // The engine's pieces arrive on a background thread; collect them in buffers and redraw the
        // screen at most ~12 times a second instead of on every word.
        val lock = Any()
        val text = StringBuilder(); val thought = StringBuilder()
        var firstThought = 0L; var firstText = 0L
        fun flush() {
            val (t, th) = synchronized(lock) { text.toString() to thought.toString() }
            if (th.length != streamingThought.length) streamingThought = th
            if (t.length != (streaming?.length ?: 0)) streaming = t
            phase = when { t.isNotEmpty() -> Phase.WRITING; th.isNotEmpty() -> Phase.THINKING; else -> Phase.READING }
            if (firstText > 0) {
                val secs = (System.currentTimeMillis() - firstText) / 1000.0
                if (secs > 0.5) wordsPerSecond = wordCount(t) / secs
            }
        }
        replyJob = viewModelScope.launch {
            val ticker = launch { while (isActive) { delay(80); flush() } }
            var error: Throwable? = null
            var servedBy: String? = null
            try {
                val onThought = { t: String -> synchronized(lock) { if (firstThought == 0L) firstThought = System.currentTimeMillis(); thought.append(t) }; Unit }
                val onText = { t: String -> synchronized(lock) { if (firstText == 0L) firstText = System.currentTimeMillis(); text.append(t) }; Unit }
                if (ready.model.cloud) withContext(Dispatchers.IO) {
                    servedBy = cloud.chat(ready.model.id, effortUsed, Prompt.cloudMessages(history, input, agent), onThought, onText,
                        onStep = { s -> viewModelScope.launch { streamingStep = s } })
                } else withContext(Dispatchers.Default) {
                    engine.reply(chat.id, history, input, effortUsed, onThought, onText, Prompt.system(agent = agent))
                }
            } catch (t: Throwable) { error = t }
            ticker.cancel(); flush()
            val end = System.currentTimeMillis()
            val thinkSecs = if (firstThought > 0) (((if (firstText > 0) firstText else end) - firstThought) / 1000).toInt() else 0
            val words = wordCount(streaming ?: "")
            val speed = if (firstText > 0 && end - firstText > 300) words * 1000.0 / (end - firstText) else 0.0
            val stats = buildList {
                add("$words words")
                if (speed > 0) add("%.0f words/s".format(speed))
                add("${(end - started) / 1000}s")
                add(if (ready.model.cloud) "Cloud" + (servedBy?.let { " · ${it.substringAfterLast('/')}" } ?: "") else if (engine.loadedOnGpu) "GPU" else "CPU")
            }.joinToString(" · ")
            finish(chat.id, ready.model, effortUsed, thinkSecs, stats, error)
        }
    }

    /** Asks again: removes the last reply and sends the last message once more. */
    fun retry() {
        if (busy) return
        val c = current ?: return
        val lastUser = c.messages.indexOfLast { it.isUser }
        if (lastUser < 0) return
        val text = c.messages[lastUser].text
        put(c.copy(messages = c.messages.take(lastUser), updated = System.currentTimeMillis()))
        send(text)
    }

    fun rename(id: String, title: String) {
        val i = chats.indexOfFirst { it.id == id }
        if (i < 0 || title.isBlank()) return
        chats[i] = chats[i].copy(title = title.trim().take(80), updated = System.currentTimeMillis())
        store.save(chats); syncNow()
    }

    fun stop() { if (activeModel?.cloud == true) cloud.stopChat() else engine.stop() }

    private fun finish(chatId: String, model: AiModel, effortUsed: Effort, seconds: Int, stats: String, err: Throwable?) {
        var reply = Prompt.clean(streaming ?: "")
        if (reply.isEmpty()) reply = when {
            err is CancellationException -> "(Stopped.)"
            err != null -> "Sorry, something went wrong: ${err.message ?: err.javaClass.simpleName}"
            else -> "(Stopped.)"
        }
        val thought = streamingThought.trim()
        streaming = null; streamingThought = ""; streamingStep = ""
        val chat = chats.firstOrNull { it.id == chatId } ?: return
        put(chat.copy(
            messages = chat.messages + Msg("assistant", reply, thought, model.name, effortUsed.label, seconds, stats),
            updated = System.currentTimeMillis(),
        ))
        store.save(chats)
        syncNow()
    }

    // ---- account and cloud sync ----

    fun signIn(email: String, password: String) = auth(email, password) {
        cloud.signIn(email, password); null
    }

    fun signUp(email: String, password: String) = auth(email, password) {
        when (cloud.signUp(email, password)) {
            is SignUpResult.SignedIn -> null
            SignUpResult.CheckEmail -> "Account created. We sent a confirmation link to ${email.trim()}: open it, then come back and sign in."
        }
    }

    fun resendConfirmation(email: String) = auth(email, "-") { cloud.resendConfirmation(email); "Sent again. Check your inbox and spam folder." }

    private fun auth(email: String, password: String, action: () -> String?) {
        if (authBusy) return
        if (!email.contains('@') || password.isEmpty()) { authError = "Enter your email and password."; return }
        authBusy = true; authError = null; authInfo = null
        viewModelScope.launch {
            try {
                authInfo = withContext(Dispatchers.IO) { action() }
                account = cloud.session?.email
                if (account != null) {
                    screen = Screen.CHAT; syncNow()
                    if (engineState !is EngineState.Ready) selectModel(Catalog.cloud.first().id) // no phone model needed
                }
            } catch (e: Exception) {
                authError = e.message ?: "Something went wrong. Please try again."
            }
            authBusy = false
        }
    }

    /** Signs out and removes this account's chats from the phone; they stay safe in the cloud. */
    fun signOut() {
        if (busy) return
        viewModelScope.launch {
            syncJob?.join()
            try { pushPending() } catch (e: Exception) {
                if (cloud.session != null) { // still signed in but offline: don't lose chats that aren't uploaded yet
                    sync = sync.copy(error = "Couldn't upload your latest chats, so you are still signed in. ${e.message ?: ""}".trim())
                    return@launch
                }
            }
            withContext(Dispatchers.IO) { cloud.signOut() }
            account = null; sync = SyncStatus()
            if (activeModel?.cloud == true) {
                engineState = EngineState.NoModel
                Catalog.models.firstOrNull { it.id in installed }?.let { selectModel(it.id) }
            }
            chats.clear(); currentId = null; deleted.clear(); store.clear()
            agents.clear(); deletedAgents.clear(); pendingAgentId = null; prefs.edit().remove("agents_deleted").apply()
            engine.closeConversation()
            screen = Screen.CHAT
        }
    }

    private suspend fun pushPending() {
        val r = Sync.merge(chats.toList(), deleted.toMap(), withContext(Dispatchers.IO) { cloud.pull() })
        withContext(Dispatchers.IO) { cloud.push(r.upload, r.uploadDeleted) }
    }

    /** Downloads changes from the user's other phones and uploads this phone's. Does nothing while the AI is replying. */
    fun syncNow() {
        if (account == null || syncJob?.isActive == true) return
        syncJob = viewModelScope.launch {
            sync = sync.copy(running = true, error = null)
            sync = try {
                val remote = withContext(Dispatchers.IO) { cloud.pull() }
                while (busy) delay(500) // don't change chats under a reply being written
                val r = Sync.merge(chats.toList(), deleted.toMap(), remote)
                if (r.chats != chats.toList()) {
                    chats.clear(); chats.addAll(r.chats)
                    if (currentId != null && chats.none { it.id == currentId }) currentId = null
                    store.save(chats)
                }
                deleted.clear(); deleted.putAll(r.tombstones); store.saveDeleted(deleted)
                withContext(Dispatchers.IO) { cloud.push(r.upload, r.uploadDeleted) }
                syncAgents()
                SyncStatus(lastOk = System.currentTimeMillis())
            } catch (e: Exception) {
                if (cloud.session == null) account = null // sign-in expired
                sync.copy(running = false, error = e.message)
            }
        }
    }

    override fun onCleared() { if (engineHolder.isInitialized()) { engine.stop(); engine.unload() } }
}
