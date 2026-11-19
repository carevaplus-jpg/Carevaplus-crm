package com.carevaplus.ai

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import androidx.core.content.ContextCompat
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession
import com.google.mediapipe.tasks.genai.llminference.ProgressListener
import com.google.mediapipe.tasks.genai.llminference.PromptTemplates
import java.io.File

/** The open model the app runs on the phone. Downloaded once from Hugging Face; no account or key needed. */
object ModelInfo {
    const val NAME = "Qwen 2.5 · 1.5B Instruct"
    const val LICENSE = "Apache-2.0"
    const val FILE_NAME = "qwen2.5-1.5b-instruct-q8-ekv4096.task"
    const val URL =
        "https://huggingface.co/litert-community/Qwen2.5-1.5B-Instruct/resolve/main/Qwen2.5-1.5B-Instruct_multi-prefill-seq_q8_ekv4096.task"
    const val SIZE_BYTES = 1_598_556_720L
    const val CONTEXT_TOKENS = 4096
}

/** Downloads the model with Android's DownloadManager, so it survives the app going to the background. */
class ModelDownloader(private val ctx: Context) {
    private val dm = ctx.getSystemService(DownloadManager::class.java)
    private val prefs = ctx.getSharedPreferences("model", Context.MODE_PRIVATE)

    data class Progress(val status: Int, val done: Long, val total: Long, val reason: Int)

    fun modelFile(): File = File(ctx.getExternalFilesDir(null), ModelInfo.FILE_NAME)

    fun isReady(): Boolean = modelFile().let { it.exists() && it.length() == ModelInfo.SIZE_BYTES }

    fun currentId(): Long = prefs.getLong("id", -1L)

    fun start(): Long {
        cancel()
        modelFile().delete()
        val req = DownloadManager.Request(Uri.parse(ModelInfo.URL))
            .setTitle("Careva+ AI model")
            .setDescription("One-time download, about 1.6 GB")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalFilesDir(ctx, null, ModelInfo.FILE_NAME)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(false)
        val id = dm.enqueue(req)
        prefs.edit().putLong("id", id).apply()
        return id
    }

    fun status(id: Long): Progress? =
        dm.query(DownloadManager.Query().setFilterById(id)).use { c ->
            if (!c.moveToFirst()) return null
            Progress(
                status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)),
                done = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)),
                total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)),
                reason = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON)),
            )
        }

    fun cancel() {
        val id = currentId()
        if (id >= 0) dm.remove(id)
        prefs.edit().remove("id").apply()
    }
}

/** Runs the model with Google's MediaPipe LLM Inference, entirely on the device. */
class Engine(private val ctx: Context) {
    private var llm: LlmInference? = null
    @Volatile private var session: LlmInferenceSession? = null

    val isLoaded get() = llm != null

    fun load(path: String) {
        if (llm != null) return
        llm = LlmInference.createFromOptions(
            ctx,
            LlmInference.LlmInferenceOptions.builder()
                .setModelPath(path)
                .setMaxTokens(ModelInfo.CONTEXT_TOKENS)
                .setMaxTopK(64)
                .build()
        )
    }

    fun tokens(text: String): Int = llm?.sizeInTokens(text) ?: (text.length / 3)

    /**
     * Streams a reply to an already formatted prompt. [onToken] receives each new piece of text;
     * [onDone] runs on the main thread once, with an error if generation failed or was stopped.
     */
    fun generate(prompt: String, onToken: (String) -> Unit, onDone: (Throwable?) -> Unit) {
        val model = llm ?: return onDone(IllegalStateException("Model not loaded"))
        // The prompt is formatted by PromptBuilder, so the session must not add its own template.
        val noTemplate = PromptTemplates.builder()
            .setSystemPrefix("").setSystemSuffix("")
            .setUserPrefix("").setUserSuffix("")
            .setModelPrefix("").setModelSuffix("")
            .build()
        val s = LlmInferenceSession.createFromOptions(
            model,
            LlmInferenceSession.LlmInferenceSessionOptions.builder()
                .setTopK(40)
                .setTopP(0.9f)
                .setTemperature(0.7f)
                .setPromptTemplates(noTemplate)
                .build()
        )
        session = s
        s.addQueryChunk(prompt)
        val future = s.generateResponseAsync(ProgressListener<String> { partial, _ -> if (partial != null) onToken(partial) })
        future.addListener({
            val err = try { future.get(); null } catch (e: Throwable) { e }
            try { s.close() } catch (_: Throwable) {}
            if (session === s) session = null
            onDone(err)
        }, ContextCompat.getMainExecutor(ctx))
    }

    fun stop() {
        try { session?.cancelGenerateResponseAsync() } catch (_: Throwable) {}
    }
}
