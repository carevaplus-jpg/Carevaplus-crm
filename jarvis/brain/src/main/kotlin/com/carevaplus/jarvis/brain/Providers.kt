package com.carevaplus.jarvis.brain

import org.json.JSONObject

/** An OpenAI-compatible endpoint. OpenRouter, DeepSeek and NVIDIA NIM all speak this protocol. */
data class Provider(val id: String, val name: String, val baseUrl: String, val key: String, val extraHeaders: Map<String, String> = emptyMap()) {
    val ready get() = key.isNotBlank() || id == NVIDIA_PUBLIC_LIST_ONLY
    companion object {
        const val OPENROUTER = "openrouter"
        const val DEEPSEEK = "deepseek"
        const val NVIDIA = "nvidia"
        const val NVIDIA_PUBLIC_LIST_ONLY = "-"

        fun openRouter(key: String) = Provider(OPENROUTER, "OpenRouter", "https://openrouter.ai/api/v1", key,
            mapOf("HTTP-Referer" to "https://careva-ai.netlify.app", "X-Title" to "Jarvis"))
        fun deepSeek(key: String) = Provider(DEEPSEEK, "DeepSeek", "https://api.deepseek.com", key)
        fun nvidia(key: String) = Provider(NVIDIA, "NVIDIA", "https://integrate.api.nvidia.com/v1", key)
    }
}

data class Msg(val role: String, val text: String, val imageDataUrls: List<String> = emptyList()) {
    fun toJson(): JSONObject {
        val o = JSONObject().put("role", role)
        if (imageDataUrls.isEmpty()) return o.put("content", text)
        val parts = org.json.JSONArray().put(JSONObject().put("type", "text").put("text", text.ifBlank { "Describe this." }))
        imageDataUrls.forEach { parts.put(JSONObject().put("type", "image_url").put("image_url", JSONObject().put("url", it))) }
        return o.put("content", parts)
    }
    companion object {
        fun system(t: String) = Msg("system", t)
        fun user(t: String, images: List<String> = emptyList()) = Msg("user", t, images)
        fun assistant(t: String) = Msg("assistant", t)
    }
}

class LlmException(val status: Int, message: String) : Exception(message) {
    val rateLimited get() = status == 429
    val authFailed get() = status == 401 || status == 403
    val retryable get() = status == 429 || status >= 500 || status == 0 || status == 408
}

data class ChatResult(val text: String, val reasoning: String, val completionTokens: Int, val latencyMs: Long)
