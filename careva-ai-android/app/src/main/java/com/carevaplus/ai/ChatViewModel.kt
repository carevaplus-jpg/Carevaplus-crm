package com.carevaplus.ai

import android.app.Application
import android.app.DownloadManager
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.CancellationException

sealed interface ModelState {
    data object Missing : ModelState
    data class Downloading(val done: Long, val total: Long, val paused: Boolean) : ModelState
    data object Loading : ModelState
    data object Ready : ModelState
    data class Failed(val message: String) : ModelState
}

class ChatViewModel(app: Application) : AndroidViewModel(app) {
    private val downloader = ModelDownloader(app)
    private val engine = Engine(app)
    private val store = ChatStore(app)

    var modelState by mutableStateOf<ModelState>(ModelState.Missing); private set
    val chats = mutableStateListOf<Chat>()
    var currentId by mutableStateOf<String?>(null); private set
    /** The reply being written, or null when the model is idle. */
    var streaming by mutableStateOf<String?>(null); private set

    private var poll: Job? = null

    init {
        chats.addAll(store.load())
        when {
            downloader.isReady() -> loadModel()
            downloader.currentId() >= 0 -> watchDownload(downloader.currentId())
            else -> modelState = ModelState.Missing
        }
    }

    val current: Chat? get() = chats.firstOrNull { it.id == currentId }

    // ---- model ----

    fun download() { watchDownload(downloader.start()) }

    fun cancelDownload() { poll?.cancel(); downloader.cancel(); modelState = ModelState.Missing }

    private fun watchDownload(id: Long) {
        poll?.cancel()
        poll = viewModelScope.launch {
            while (true) {
                val p = downloader.status(id)
                when {
                    p == null -> { modelState = ModelState.Missing; return@launch }
                    p.status == DownloadManager.STATUS_SUCCESSFUL -> {
                        if (downloader.isReady()) loadModel()
                        else modelState = ModelState.Failed("The download finished but the file is incomplete. Please download again.")
                        return@launch
                    }
                    p.status == DownloadManager.STATUS_FAILED -> {
                        downloader.cancel()
                        modelState = ModelState.Failed("The download failed (code ${p.reason}). Check your internet connection and storage space, then try again.")
                        return@launch
                    }
                    else -> modelState = ModelState.Downloading(
                        p.done, if (p.total > 0) p.total else ModelInfo.SIZE_BYTES, p.status == DownloadManager.STATUS_PAUSED
                    )
                }
                delay(500)
            }
        }
    }

    fun loadModel() {
        modelState = ModelState.Loading
        viewModelScope.launch {
            try {
                withContext(Dispatchers.Default) { engine.load(downloader.modelFile().absolutePath) }
                modelState = ModelState.Ready
            } catch (e: Throwable) {
                modelState = ModelState.Failed("Couldn't start the model on this phone: ${e.message ?: e.javaClass.simpleName}. It needs about 3 GB of free memory.")
            }
        }
    }

    // ---- chats ----

    fun newChat() { if (streaming == null) currentId = null }

    fun open(id: String) { if (streaming == null) currentId = id }

    fun delete(id: String) {
        if (streaming != null && id == currentId) return
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
        if (input.isEmpty() || streaming != null || modelState != ModelState.Ready) return
        val base = current ?: Chat()
        val chat = base.copy(
            title = if (base.messages.isEmpty()) input.lineSequence().first().take(48) else base.title,
            messages = base.messages + Msg("user", input),
            updated = System.currentTimeMillis(),
        )
        put(chat)
        store.save(chats)
        streaming = ""
        viewModelScope.launch {
            val prompt = withContext(Dispatchers.Default) { PromptBuilder.build(chat.messages) { engine.tokens(it) } }
            engine.generate(
                prompt,
                onToken = { piece -> viewModelScope.launch(Dispatchers.Main) { streaming = (streaming ?: "") + piece } },
                onDone = { err -> finish(chat.id, err) },
            )
        }
    }

    fun stop() = engine.stop()

    private fun finish(chatId: String, err: Throwable?) {
        // Let queued tokens land first.
        viewModelScope.launch(Dispatchers.Main) {
            val cancelled = err is CancellationException || err?.cause is CancellationException
            var reply = PromptBuilder.clean(streaming ?: "")
            if (reply.isEmpty()) reply = when {
                cancelled -> "(Stopped.)"
                err != null -> "Sorry, something went wrong: ${err.cause?.message ?: err.message ?: "unknown error"}"
                else -> "(No reply.)"
            }
            streaming = null
            val chat = chats.firstOrNull { it.id == chatId } ?: return@launch
            put(chat.copy(messages = chat.messages + Msg("assistant", reply), updated = System.currentTimeMillis()))
            store.save(chats)
        }
    }

    override fun onCleared() { engine.stop() }
}
