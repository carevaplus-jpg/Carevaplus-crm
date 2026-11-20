package com.carevaplus.ai

/**
 * The models the app can download and run on the phone. All are free, open-weight models
 * (Apache-2.0 or MIT) published in LiteRT-LM format; no account or API key is needed.
 */
data class AiModel(
    val id: String,
    val name: String,          // our tier name
    val tagline: String,
    val bestFor: String,
    val baseModel: String,     // the open model it runs
    val license: String,
    val repo: String,
    val file: String,
    val sizeBytes: Long,
    val minRamGb: Int,
    val contextTokens: Int,
    val supportsThinking: Boolean,
    val alwaysThinks: Boolean = false,
    val defaultEffort: Effort,
    val recommended: Boolean = false,
    /** Replacement chat template, for model packages whose built-in one doesn't handle system messages. */
    val chatTemplate: String? = null,
    /** Runs on the Careva+ cloud instead of the phone: no download, storage or phone memory needed. */
    val cloud: Boolean = false,
) {
    val url get() = "https://huggingface.co/$repo/resolve/main/$file"
    val sizeLabel get() = "%.1f GB".format(sizeBytes / 1e9)
    /** The engine also writes a weight cache about as large as the model on first load. */
    val storageNeeded get() = sizeBytes * 2 + 300_000_000L
}

object Catalog {
    val models = listOf(
        AiModel(
            id = "plus", name = "Careva Plus", recommended = true,
            tagline = "Balanced and multilingual",
            bestFor = "Everyday chat, writing, Tamil and English",
            baseModel = "Google Gemma 4 E2B", license = "Apache-2.0",
            repo = "litert-community/gemma-4-E2B-it-litert-lm", file = "gemma-4-E2B-it.litertlm",
            sizeBytes = 2_588_147_712, minRamGb = 6, contextTokens = 8192,
            supportsThinking = true, defaultEffort = Effort.LOW,
        ),
        AiModel(
            id = "pro", name = "Careva Pro",
            tagline = "Most capable all-rounder",
            bestFor = "Detailed answers, documents, harder questions",
            baseModel = "Google Gemma 4 E4B", license = "Apache-2.0",
            repo = "litert-community/gemma-4-E4B-it-litert-lm", file = "gemma-4-E4B-it.litertlm",
            sizeBytes = 3_659_530_240, minRamGb = 8, contextTokens = 8192,
            supportsThinking = true, defaultEffort = Effort.MEDIUM,
        ),
        AiModel(
            id = "think", name = "Careva Think",
            tagline = "Reasoning specialist",
            bestFor = "Maths, logic, planning, step-by-step problems",
            baseModel = "Qwen3 4B Thinking 2507", license = "Apache-2.0",
            repo = "litert-community/Qwen3-4B-Thinking-2507", file = "Qwen3_4b_thinking_dynamic_wi4b32_afp32.litertlm",
            sizeBytes = 2_274_213_888, minRamGb = 6, contextTokens = 8192,
            supportsThinking = true, alwaysThinks = true, defaultEffort = Effort.HIGH,
        ),
        AiModel(
            id = "code", name = "Careva Code",
            tagline = "Coding and technical work",
            bestFor = "Writing and fixing code, spreadsheets, technical questions",
            baseModel = "Qwen3.5 4B", license = "Apache-2.0",
            repo = "litert-community/Qwen3.5-4B", file = "Qwen3.5-4B_mixed_int4.litertlm",
            sizeBytes = 2_754_166_784, minRamGb = 6, contextTokens = 8192,
            supportsThinking = true, defaultEffort = Effort.HIGH,
        ),
        AiModel(
            id = "max", name = "Careva Max",
            tagline = "Strongest model that fits on a phone",
            bestFor = "Hardest tasks on flagship phones",
            baseModel = "Qwen3 8B", license = "Apache-2.0",
            repo = "litert-community/Qwen3-8B", file = "qwen3_8b_mixed_int4.litertlm",
            sizeBytes = 4_887_412_736, minRamGb = 12, contextTokens = 6144,
            supportsThinking = true, defaultEffort = Effort.HIGH,
            chatTemplate = QWEN_CHATML,
        ),
        AiModel(
            id = "lite", name = "Careva Lite",
            tagline = "Small and fast",
            bestFor = "Quick answers on phones with less memory",
            baseModel = "Qwen3 1.7B", license = "Apache-2.0",
            repo = "litert-community/Qwen3-1.7B", file = "Qwen3-1.7B_dynamic_wi4b32_afp32.litertlm",
            sizeBytes = 977_184_032, minRamGb = 4, contextTokens = 8192,
            supportsThinking = true, defaultEffort = Effort.LOW,
        ),
    )

    /** Large open models that run on the Careva+ cloud (Supabase function `careva-ai-chat`) for signed-in users. */
    val cloud = listOf(
        cloudModel("cloud-max", "Careva Cloud Max", "Strongest model, runs in the cloud", "Hard questions, long documents, careful writing", "GPT-OSS 120B or similar", recommended = true),
        cloudModel("cloud-think", "Careva Cloud Think", "Deep reasoning in the cloud", "Maths, logic, planning, step-by-step problems", "Qwen3 32B or similar"),
        cloudModel("cloud-code", "Careva Cloud Code", "Coding specialist in the cloud", "Writing and fixing code, technical work", "Qwen3 Coder, Kimi K2 or similar"),
        cloudModel("cloud-fast", "Careva Cloud Fast", "Very fast replies", "Quick everyday answers", "GPT-OSS 20B or similar", effort = Effort.LOW),
    )

    private fun cloudModel(id: String, name: String, tagline: String, bestFor: String, base: String, recommended: Boolean = false, effort: Effort = Effort.MEDIUM) =
        AiModel(id = id, name = name, tagline = tagline, bestFor = bestFor, baseModel = base, license = "Open model",
            repo = "", file = "", sizeBytes = 0, minRamGb = 0, contextTokens = 32768, supportsThinking = true,
            defaultEffort = effort, recommended = recommended, cloud = true)

    fun byId(id: String?) = models.firstOrNull { it.id == id } ?: cloud.firstOrNull { it.id == id }
}

/** Qwen chat format; used for Qwen3 8B, whose packaged template fails on system messages. Tested with LiteRT-LM 0.19.1. */
const val QWEN_CHATML = """{%- macro text(c) -%}{%- if c is string -%}{{ c }}{%- else -%}{%- for p in c -%}{%- if p.type == 'text' -%}{{ p.text }}{%- endif -%}{%- endfor -%}{%- endif -%}{%- endmacro -%}
{%- for m in messages -%}
{%- if m.role == 'model' or m.role == 'assistant' -%}{%- set role = 'assistant' -%}{%- else -%}{%- set role = m.role -%}{%- endif -%}
{{ '<|im_start|>' + role + '\n' }}{{ text(m.content) }}{{ '<|im_end|>\n' }}
{%- endfor -%}
{%- if add_generation_prompt -%}
{{ '<|im_start|>assistant\n' }}
{%- if enable_thinking is defined and enable_thinking is false -%}{{ '<think>\n\n</think>\n\n' }}{%- endif -%}
{%- endif -%}"""

/** How hard the model works on each reply: more thinking tokens and room to answer at higher effort. */
enum class Effort(val label: String, val blurb: String) {
    LOW("Low", "Fastest replies, no thinking"),
    MEDIUM("Medium", "Thinks briefly before answering"),
    HIGH("High", "Thinks carefully; best for most hard questions"),
    ULTRA("Ultra", "A team of agents works on it: Solver and Checker, then a Lead writes the answer. Slowest, best for hard tasks");

    data class Plan(val thinking: Boolean, val thinkingBudget: Int, val maxOutput: Int, val temperature: Double, val instruction: String?)

    fun plan(model: AiModel): Plan {
        val think = model.supportsThinking
        val room = model.contextTokens / 2
        return when (this) {
            LOW -> Plan(model.alwaysThinks, if (model.alwaysThinks) 256 else 0, minOf(1024, room), 0.7, null)
            MEDIUM -> Plan(think, 512, minOf(2048, room), 0.6, null)
            HIGH -> Plan(think, 1536, minOf(3072, room), 0.6,
                "Work through the problem carefully before answering, and check your answer.")
            ULTRA -> Plan(think, minOf(3072, room - 512), room, 0.5,
                "This may be a hard task. Reason step by step, consider other approaches, verify each step and correct any mistakes before giving the final answer.")
        }
    }
}
