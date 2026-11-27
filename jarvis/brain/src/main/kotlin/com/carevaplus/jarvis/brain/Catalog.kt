package com.carevaplus.jarvis.brain

import org.json.JSONObject

/** What a task needs from a model. Adapted from HuggingGPT's task types, for chat models. */
enum class Role(val label: String) {
    PLAN("Planning"), REASON("Deep reasoning"), CODE("Code"), WRITE("Writing"), VISION("Vision"), FAST("Quick answers"), CHAT("Conversation")
}

data class ModelInfo(
    val provider: String,
    val id: String,
    val context: Int = 0,
    val vision: Boolean = false,
    val reasoning: Boolean = false,
    val free: Boolean = false,
) {
    val key get() = "$provider:$id"
    val short get() = id.substringAfterLast('/').removeSuffix(":free")
}

object Catalog {
    private val NOT_CHAT = Regex("embed|rerank|guard|safety|moderation|whisper|tts|speech|clip|parakeet|canary|gliner|pii|diffusion|flux|sdxl|stable-|imagen|reward|nv-|bge-|e5-|retriev|classif|translate|riva|starcoder|codegemma-base|fuyu|paligemma|vila|kosmos|lyria|veo|sora", RegexOption.IGNORE_CASE)

    fun isChatModel(id: String) = !NOT_CHAT.containsMatchIn(id)

    /** Normalise a provider /models entry. Returns null for non-chat models. */
    fun parse(provider: String, j: JSONObject): ModelInfo? {
        val id = j.optString("id").ifBlank { return null }
        if (!isChatModel(id)) return null
        val arch = j.optJSONObject("architecture")
        val inputs = arch?.optJSONArray("input_modalities")?.strings() ?: emptyList()
        val outputs = arch?.optJSONArray("output_modalities")?.strings() ?: listOf("text")
        if (outputs.size != 1 || outputs[0] != "text") return null
        val params = j.optJSONArray("supported_parameters")?.strings() ?: emptyList()
        val pricing = j.optJSONObject("pricing")
        val free = id.endsWith(":free") || (pricing != null && pricing.optString("prompt") == "0" && pricing.optString("completion") == "0")
        // OpenRouter is a marketplace of paid models: only offer the free ones so nothing bills by surprise
        if (provider == Provider.OPENROUTER && !free) return null
        val lower = id.lowercase()
        return ModelInfo(
            provider, id,
            context = j.optInt("context_length", 0),
            vision = "image" in inputs || Regex("(^|[-/_])(vl|vision|omni|llava|pixtral|multimodal)([-_/]|$)").containsMatchIn(lower),
            reasoning = "reasoning" in params || Regex("reasoner|r1|reasoning|thinking|think|nemotron-3-(ultra|super)").containsMatchIn(lower),
            free = free,
        )
    }

    /** How good a model family is at each role (0-100), from public benchmarks and experience. Patterns, not exact IDs, so new versions slot in. */
    fun prior(m: ModelInfo, role: Role): Double {
        val id = m.id.lowercase()
        val strong = when {
            Regex("deepseek.*(r2|v4|v3\\.[1-9])").containsMatchIn(id) -> 96.0
            "nemotron-3-ultra" in id || "nemotron-ultra" in id -> 95.0
            Regex("deepseek-reasoner|deepseek-r1").containsMatchIn(id) -> 93.0
            "deepseek-chat" in id || "deepseek-v3" in id -> 92.0
            Regex("kimi-k2|glm-(4\\.[5-9]|5)|qwen3.*(max|235b|480b|next)").containsMatchIn(id) -> 93.0
            "nemotron-3.5-super" in id || "nemotron-super" in id -> 91.0
            Regex("gpt-oss-120b|gemma-4-31b|llama-4-maverick|mistral-(large|medium)").containsMatchIn(id) -> 89.0
            Regex("ernie-5|ling-3|gemma-4-26b|qwen3|llama-3\\.3-70b").containsMatchIn(id) -> 84.0
            Regex("nemotron-3-nano|nemotron-3\\.5-lightning|gpt-oss-20b|gemma-3").containsMatchIn(id) -> 76.0
            else -> 55.0 + minOf(20.0, sizeB(id) / 10.0)
        }
        val small = Regex("(^|[-/])(1b|3b|4b|7b|8b|mini|tiny|bolt|lightning|flash|nano|e4b|lite)([-_./]|$)").containsMatchIn(id)
        return when (role) {
            Role.PLAN -> strong + (if (m.reasoning) 3 else 0) - (if (small) 20 else 0)
            Role.REASON -> strong + (if (m.reasoning) 8 else -6) - (if (small) 25 else 0)
            Role.CODE -> strong + (if (Regex("coder|devstral|deepseek|codestral|qwen3").containsMatchIn(id)) 5 else 0) - (if (small) 15 else 0)
            Role.WRITE, Role.CHAT -> strong - (if (m.reasoning && role == Role.CHAT) 2 else 0) - (if (small) 10 else 0)
            Role.VISION -> if (m.vision) strong + 10 else 0.0
            Role.FAST -> (if (small) 85.0 else strong * 0.8) + (if (m.reasoning) -10 else 0)
        }
    }

    private fun sizeB(id: String): Double =
        Regex("(\\d+(?:\\.\\d+)?)b(?![a-z])").findAll(id).mapNotNull { it.groupValues[1].toDoubleOrNull() }.maxOrNull()?.coerceAtMost(1000.0) ?: 0.0
}
