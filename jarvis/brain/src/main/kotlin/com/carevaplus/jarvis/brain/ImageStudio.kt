package com.carevaplus.jarvis.brain

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class ImageConfig(
    val hfToken: String = "",
    val genModel: String = "black-forest-labs/FLUX.1-schnell",
    val genBase: String = "https://router.huggingface.co/hf-inference/models",
    val spaceUrl: String = "",
    val spaceToken: String = "",
) { val ready get() = hfToken.isNotBlank() && spaceUrl.isNotBlank() }

sealed interface ImageResult {
    class Ok(val bytes: ByteArray, val label: String) : ImageResult
    class Blocked(val label: String) : ImageResult
    class Failed(val message: String) : ImageResult
}

/** Generates an image, then runs it through the safety detector. The image is only returned if the detector says it is safe. Fails closed. */
class ImageStudio(private val cfg: () -> ImageConfig) {
    fun generate(prompt: String): ImageResult {
        val c = cfg()
        if (!c.ready) return ImageResult.Failed("Image generation needs a Hugging Face token and your safety-check Space URL (Settings).")
        val bytes = try { gen(c, prompt) } catch (e: Exception) { return ImageResult.Failed("Image generation failed: ${e.message}") }
        return try {
            val v = JSONObject(check(c, bytes))
            if (v.optBoolean("safe", false)) ImageResult.Ok(bytes, v.optString("label")) else ImageResult.Blocked(v.optString("label"))
        } catch (e: Exception) { ImageResult.Failed("Couldn't verify the image is safe, so it was withheld (${e.message}).") }
    }

    private fun gen(c: ImageConfig, prompt: String): ByteArray {
        val conn = URL("${c.genBase.trimEnd('/')}/${c.genModel}").openConnection() as HttpURLConnection
        conn.requestMethod = "POST"; conn.doOutput = true; conn.connectTimeout = 15_000; conn.readTimeout = 120_000
        conn.setRequestProperty("Authorization", "Bearer ${c.hfToken}"); conn.setRequestProperty("Content-Type", "application/json")
        conn.outputStream.use { it.write(JSONObject().put("inputs", prompt).toString().toByteArray()) }
        val code = conn.responseCode
        if (code !in 200..299) throw LlmException(code, when (code) { 401, 403 -> "token rejected"; 429 -> "rate limited, try later"; 503 -> "model is loading, try again in a minute"; else -> "HTTP $code" })
        return conn.inputStream.use { it.readBytes() }.also { if (it.size < 100) throw IllegalStateException("empty image") }
    }

    private fun check(c: ImageConfig, img: ByteArray): String {
        val conn = URL(c.spaceUrl.trimEnd('/') + "/check").openConnection() as HttpURLConnection
        conn.requestMethod = "POST"; conn.doOutput = true; conn.connectTimeout = 15_000; conn.readTimeout = 90_000
        conn.setRequestProperty("Content-Type", "application/octet-stream")
        if (c.spaceToken.isNotBlank()) conn.setRequestProperty("Authorization", "Bearer ${c.spaceToken}")
        conn.outputStream.use { it.write(img) }
        if (conn.responseCode !in 200..299) throw IllegalStateException("safety service HTTP ${conn.responseCode}")
        return conn.inputStream.bufferedReader().use { it.readText() }
    }

    companion object {
        private val ASK = Regex("""^\s*(please\s+)?(can you\s+)?(draw|generate|create|make|paint|render|imagine|design)\b.*\b(image|picture|photo|illustration|drawing|logo|wallpaper|artwork|poster|sketch)\b|^\s*(draw|paint|sketch)\s+(me\s+)?(a|an|the)\b""", RegexOption.IGNORE_CASE)
        fun isImageRequest(t: String) = ASK.containsMatchIn(t.take(300))
    }
}
