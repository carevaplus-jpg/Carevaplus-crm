package com.carevaplus.ai

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.StatFs
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Channel
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.LogSeverity
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.RepetitionPenaltyConfig
import com.google.ai.edge.litertlm.SamplerConfig
import com.google.ai.edge.litertlm.ThinkingConfig
import java.io.File

/** Downloads models with Android's DownloadManager, so downloads continue in the background. */
class ModelDownloader(private val ctx: Context) {
    private val dm = ctx.getSystemService(DownloadManager::class.java)
    private val prefs = ctx.getSharedPreferences("downloads", Context.MODE_PRIVATE)

    data class Progress(val status: Int, val done: Long, val total: Long, val reason: Int)

    private fun dir() = File(ctx.getExternalFilesDir(null), "models").apply { mkdirs() }

    fun file(m: AiModel) = File(dir(), m.file)

    fun isInstalled(m: AiModel) = file(m).let { it.exists() && it.length() == m.sizeBytes }

    fun downloadId(m: AiModel) = prefs.getLong(m.id, -1L)

    fun start(m: AiModel): Long {
        cancel(m)
        file(m).delete()
        val req = DownloadManager.Request(Uri.parse(m.url))
            .setTitle("${m.name} model")
            .setDescription("${m.baseModel}, ${m.sizeLabel}")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(ctx, null, "models/${m.file}")
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(false)
        val id = dm.enqueue(req)
        prefs.edit().putLong(m.id, id).apply()
        return id
    }

    fun status(m: AiModel): Progress? {
        val id = downloadId(m)
        if (id < 0) return null
        return dm.query(DownloadManager.Query().setFilterById(id)).use { c ->
            if (!c.moveToFirst()) return null
            Progress(
                status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)),
                done = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)),
                total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)),
                reason = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)),
            )
        }
    }

    fun forget(m: AiModel) = prefs.edit().remove(m.id).apply()

    fun cancel(m: AiModel) {
        val id = downloadId(m)
        if (id >= 0) dm.remove(id)
        forget(m)
    }

    fun delete(m: AiModel) {
        cancel(m); file(m).delete()
        // and the engine's weight cache for it (named after the model file)
        File(ctx.cacheDir, "litertlm").listFiles()?.filter { it.name.startsWith(m.file) }?.forEach { it.delete() }
    }

    /** Free space for models, counting what an existing download of [m] already uses. */
    fun freeBytes(m: AiModel): Long = StatFs(dir().path).availableBytes + file(m).length()

    fun hasRoomFor(m: AiModel) = freeBytes(m) >= m.storageNeeded

    /** Removes the model file used by version 1.0 of the app (a different format), freeing 1.6 GB. */
    fun removeLegacy() {
        File(ctx.getExternalFilesDir(null), "qwen2.5-1.5b-instruct-q8-ekv4096.task").delete()
        ctx.getSharedPreferences("model", Context.MODE_PRIVATE).edit().clear().apply()
    }
}

/** Runs one model at a time on the phone with Google's LiteRT-LM, keeping the chat in the model's memory between turns. */
class AiEngine(private val ctx: Context) {
    private var engine: Engine? = null
    private var conversation: Conversation? = null
    private var conversationKey: String? = null
    var loaded: AiModel? = null; private set
    var loadedOnGpu = false; private set

    init { Engine.setNativeMinLogSeverity(LogSeverity.ERROR) }

    /** Loads [model]; with [gpu], tries the GPU first and falls back to the CPU. Blocking: call off the main thread. */
    fun load(model: AiModel, path: String, gpu: Boolean) {
        if (loaded?.id == model.id && engine != null && loadedOnGpu == gpu) return
        unload()
        val cache = File(ctx.cacheDir, "litertlm").apply { mkdirs() }.absolutePath
        fun open(backend: Backend) = Engine(EngineConfig(modelPath = path, backend = backend, maxNumTokens = model.contextTokens, cacheDir = cache)).also { it.initialize() }
        engine = if (gpu) {
            try { open(Backend.GPU()).also { loadedOnGpu = true } } catch (e: Throwable) { loadedOnGpu = false; open(Backend.CPU()) }
        } else { loadedOnGpu = false; open(Backend.CPU()) }
        loaded = model
    }

    fun unload() {
        closeConversation()
        try { engine?.close() } catch (_: Throwable) {}
        engine = null; loaded = null
    }

    fun closeConversation() {
        try { conversation?.close() } catch (_: Throwable) {}
        conversation = null; conversationKey = null
    }

    /**
     * Streams a reply to [userText] in chat [chatId]. A new model conversation is started (seeded with
     * [history]) when the chat or model changed or after an error; otherwise the engine's memory is reused.
     */
    suspend fun reply(
        chatId: String, history: List<Msg>, userText: String, effort: Effort,
        onThought: (String) -> Unit, onText: (String) -> Unit,
    ) {
        val model = loaded ?: error("No model loaded")
        val e = engine ?: error("No model loaded")
        val plan = effort.plan(model)
        // Thinking only takes effect when set on the conversation, so a change of effort starts a new
        // model conversation seeded with the chat so far.
        val key = "$chatId|${model.id}|${effort.name}"
        if (conversationKey != key || conversation?.isAlive != true) {
            closeConversation()
            conversation = e.createConversation(
                ConversationConfig(
                    chatTemplate = model.chatTemplate,
                    channels = if (model.chatTemplate != null) listOf(Channel("thought", "<think>", "</think>")) else null,
                    systemInstruction = Contents.of(Prompt.system()),
                    initialMessages = Prompt.seed(history, model),
                    samplerConfig = SamplerConfig(40, 0.95, plan.temperature, 0),
                    maxOutputToken = plan.maxOutput,
                    thinkingConfig = ThinkingConfig(plan.thinking, plan.thinkingBudget),
                )
            )
            conversationKey = key
        }
        val conv = conversation!!
        val text = if (plan.instruction != null) "$userText\n\n(${plan.instruction})" else userText
        try {
            conv.sendMessageAsync(
                Message.user(text),
                repetitionPenaltyConfig = RepetitionPenaltyConfig(1.12f, null, null, 256),
                maxOutputToken = plan.maxOutput,
                thinkingConfig = ThinkingConfig(plan.thinking, plan.thinkingBudget),
            ).collect { m ->
                m.channels.values.forEach { if (it.isNotEmpty()) onThought(it) }
                m.contents.contents.forEach { c -> if (c is Content.Text && c.text.isNotEmpty()) onText(c.text) }
            }
        } catch (t: Throwable) {
            closeConversation() // a stopped or failed conversation can't continue; rebuild from saved history next time
            throw t
        }
    }

    fun stop() { try { conversation?.cancelProcess() } catch (_: Throwable) {} }
}
