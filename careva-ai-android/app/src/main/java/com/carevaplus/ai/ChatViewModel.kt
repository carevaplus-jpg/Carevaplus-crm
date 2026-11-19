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

data class DownloadInfo(val done: Long, val total: Long, val paused: Boolean, val failed: String? = null)

enum class Screen { CHAT, MODELS }

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
    private val engine = AiEngine(app)
    private val store = ChatStore(app)
    private val prefs = app.getSharedPreferences("settings", Context.MODE_PRIVATE)

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
    private var replyJob: Job? = null

    val activeModel get() = Catalog.byId(activeModelId)
    val current: Chat? get() = chats.firstOrNull { it.id == currentId }
    val busy get() = streaming != null

    init {
        downloader.removeLegacy()
        chats.addAll(store.load())
        refreshInstalled()
        Catalog.models.filter { downloader.downloadId(it) >= 0 && it.id !in installed }.forEach { watch(it) }
        val start = activeModel?.takeIf { it.id in installed } ?: Catalog.models.firstOrNull { it.id in installed }
        if (start != null) selectModel(start.id) else if (installed.isEmpty()) screen = Screen.MODELS
    }

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
        if (engine.loaded?.id == m.id) { engine.unload(); engineState = EngineState.NoModel }
        downloader.delete(m)
        refreshInstalled()
        if (activeModelId == m.id) {
            activeModelId = null; prefs.edit().remove("model").apply()
            Catalog.models.firstOrNull { it.id in installed }?.let { selectModel(it.id) }
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
        if (busy || m.id !in installed) return
        if (activeModelId != id) effort = m.defaultEffort
        activeModelId = id
        prefs.edit().putString("model", id).putString("effort", effort.name).apply()
        load(m)
    }

    fun chooseEffort(e: Effort) { effort = e; prefs.edit().putString("effort", e.name).apply() }

    fun toggleGpu(on: Boolean) {
        useGpu = on; prefs.edit().putBoolean("gpu", on).apply()
        activeModel?.let { if (it.id in installed && !busy) load(it) }
    }

    private fun load(m: AiModel) {
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

    fun newChat() { if (!busy) { currentId = null; screen = Screen.CHAT } }

    fun open(id: String) { if (!busy) { currentId = id; screen = Screen.CHAT } }

    fun delete(id: String) {
        if (busy && id == currentId) return
        chats.removeAll { it.id == id }
        if (currentId == id) currentId = null
        store.save(chats)
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
        val base = current ?: Chat()
        val history = base.messages
        val chat = base.copy(
            title = if (history.isEmpty()) input.lineSequence().first().take(48) else base.title,
            messages = history + Msg("user", input),
            updated = System.currentTimeMillis(),
        )
        put(chat); store.save(chats)
        streaming = ""; streamingThought = ""; phase = Phase.READING; wordsPerSecond = 0.0
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
            try {
                withContext(Dispatchers.Default) {
                    engine.reply(chat.id, history, input, effortUsed,
                        onThought = { t -> synchronized(lock) { if (firstThought == 0L) firstThought = System.currentTimeMillis(); thought.append(t) } },
                        onText = { t -> synchronized(lock) { if (firstText == 0L) firstText = System.currentTimeMillis(); text.append(t) } })
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
                add(if (engine.loadedOnGpu) "GPU" else "CPU")
            }.joinToString(" · ")
            finish(chat.id, ready.model, effortUsed, thinkSecs, stats, error)
        }
    }

    fun stop() = engine.stop()

    private fun finish(chatId: String, model: AiModel, effortUsed: Effort, seconds: Int, stats: String, err: Throwable?) {
        var reply = Prompt.clean(streaming ?: "")
        if (reply.isEmpty()) reply = when {
            err is CancellationException -> "(Stopped.)"
            err != null -> "Sorry, something went wrong: ${err.message ?: err.javaClass.simpleName}"
            else -> "(Stopped.)"
        }
        val thought = streamingThought.trim()
        streaming = null; streamingThought = ""
        val chat = chats.firstOrNull { it.id == chatId } ?: return
        put(chat.copy(
            messages = chat.messages + Msg("assistant", reply, thought, model.name, effortUsed.label, seconds, stats),
            updated = System.currentTimeMillis(),
        ))
        store.save(chats)
    }

    override fun onCleared() { engine.stop(); engine.unload() }
}
