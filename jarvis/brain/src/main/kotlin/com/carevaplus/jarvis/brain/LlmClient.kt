package com.carevaplus.jarvis.brain

import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL

/** Minimal, dependency-free chat client (works on Android and the JVM). Blocking: call from Dispatchers.IO. */
class LlmClient(private val connectTimeoutMs: Int = 15_000, private val readTimeoutMs: Int = 120_000) {

    private fun open(p: Provider, path: String, post: Boolean): HttpURLConnection {
        val c = URL(p.baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
        c.connectTimeout = connectTimeoutMs
        c.readTimeout = readTimeoutMs
        c.requestMethod = if (post) "POST" else "GET"
        if (p.key.isNotBlank()) c.setRequestProperty("Authorization", "Bearer ${p.key}")
        p.extraHeaders.forEach { (k, v) -> c.setRequestProperty(k, v) }
        if (post) { c.setRequestProperty("Content-Type", "application/json"); c.doOutput = true }
        return c
    }

    private fun fail(c: HttpURLConnection): Nothing {
        val code = c.responseCode
        val body = runCatching { (c.errorStream ?: c.inputStream).bufferedReader().readText() }.getOrDefault("")
        val msg = runCatching { JSONObject(body).optJSONObject("error")?.let { it.optJSONObject("metadata")?.optString("raw")?.takeIf { s -> s.isNotBlank() } ?: it.optString("message") } }.getOrNull()
        throw LlmException(code, (msg ?: body).take(300).ifBlank { "HTTP $code" })
    }

    private fun body(model: String, msgs: List<Msg>, stream: Boolean, temperature: Double?, maxTokens: Int?, json: Boolean): String {
        val o = JSONObject().put("model", model).put("stream", stream)
        o.put("messages", JSONArray().also { a -> msgs.forEach { a.put(it.toJson()) } })
        if (temperature != null) o.put("temperature", temperature)
        if (maxTokens != null) o.put("max_tokens", maxTokens)
        if (json) o.put("response_format", JSONObject().put("type", "json_object"))
        if (stream) o.put("stream_options", JSONObject().put("include_usage", true))
        return o.toString()
    }

    fun chat(p: Provider, model: String, msgs: List<Msg>, temperature: Double? = 0.4, maxTokens: Int? = null, json: Boolean = false): ChatResult {
        val t0 = System.currentTimeMillis()
        val c = try { open(p, "/chat/completions", true) } catch (e: Exception) { throw LlmException(0, e.message ?: "connection failed") }
        try {
            c.outputStream.use { it.write(body(model, msgs, false, temperature, maxTokens, json).toByteArray()) }
            if (c.responseCode !in 200..299) fail(c)
            val j = JSONObject(c.inputStream.bufferedReader().readText())
            j.optJSONObject("error")?.let { throw LlmException(j.optInt("code", 500), it.optString("message")) }
            val m = j.getJSONArray("choices").getJSONObject(0).getJSONObject("message")
            val text = m.optString("content", "").replace(Regex("<think>[\\s\\S]*?</think>"), "").trim()
            val reasoning = m.optString("reasoning_content", m.optString("reasoning", ""))
            if (text.isBlank()) throw LlmException(0, "empty answer from $model")
            return ChatResult(text, reasoning, j.optJSONObject("usage")?.optInt("completion_tokens") ?: 0, System.currentTimeMillis() - t0)
        } catch (e: LlmException) { throw e
        } catch (e: java.io.IOException) { throw LlmException(0, e.message ?: "network error")
        } finally { c.disconnect() }
    }

    /** Streams content deltas to [onDelta]; returns the full result. */
    fun stream(p: Provider, model: String, msgs: List<Msg>, temperature: Double? = 0.5, onDelta: (String) -> Unit): ChatResult {
        val t0 = System.currentTimeMillis()
        val c = try { open(p, "/chat/completions", true) } catch (e: Exception) { throw LlmException(0, e.message ?: "connection failed") }
        try {
            c.outputStream.use { it.write(body(model, msgs, true, temperature, null, false).toByteArray()) }
            if (c.responseCode !in 200..299) fail(c)
            val sb = StringBuilder(); var tokens = 0; var chunks = 0
            val inThink = StringBuilder()
            c.inputStream.bufferedReader().use { r: BufferedReader ->
                while (true) {
                    val line = r.readLine() ?: break
                    if (!line.startsWith("data:")) continue
                    val data = line.removePrefix("data:").trim()
                    if (data == "[DONE]") break
                    val j = runCatching { JSONObject(data) }.getOrNull() ?: continue
                    j.optJSONObject("error")?.let { throw LlmException(j.optInt("code", 500), it.optString("message")) }
                    j.optJSONObject("usage")?.optInt("completion_tokens")?.takeIf { it > 0 }?.let { tokens = it }
                    val delta = j.optJSONArray("choices")?.optJSONObject(0)?.optJSONObject("delta") ?: continue
                    val piece = delta.optString("content", "")
                    if (piece.isNotEmpty()) { chunks++; sb.append(piece); onDelta(piece) }
                }
            }
            val text = sb.toString().replace(Regex("<think>[\\s\\S]*?</think>"), "").trim()
            if (text.isBlank()) throw LlmException(0, "empty answer from $model")
            return ChatResult(text, inThink.toString(), if (tokens > 0) tokens else chunks, System.currentTimeMillis() - t0)
        } catch (e: LlmException) { throw e
        } catch (e: java.io.IOException) { throw LlmException(0, e.message ?: "network error")
        } finally { c.disconnect() }
    }

    /** Raw model list (id + metadata) from a provider. */
    fun listModels(p: Provider): List<JSONObject> {
        val c = try { open(p, "/models", false) } catch (e: Exception) { throw LlmException(0, e.message ?: "connection failed") }
        try {
            if (c.responseCode !in 200..299) fail(c)
            val data = JSONObject(c.inputStream.bufferedReader().readText()).optJSONArray("data") ?: return emptyList()
            return data.objects()
        } catch (e: LlmException) { throw e
        } catch (e: java.io.IOException) { throw LlmException(0, e.message ?: "network error")
        } finally { c.disconnect() }
    }
}
