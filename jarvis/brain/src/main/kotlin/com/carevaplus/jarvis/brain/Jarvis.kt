package com.carevaplus.jarvis.brain

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

data class PlanTask(val id: Int, val role: Role, val goal: String, val dep: List<Int>)

sealed interface Event {
    data class Stage(val name: String, val detail: String = "") : Event
    data class Clarify(val question: String, val options: List<String>) : Event
    data class Planned(val tasks: List<PlanTask>) : Event
    data class TaskStart(val id: Int, val role: Role, val model: ModelInfo, val goal: String) : Event
    data class TaskDone(val id: Int, val model: ModelInfo, val ms: Long) : Event
    data class Token(val text: String) : Event
    data class Done(val answer: String, val model: ModelInfo?, val tokens: Int, val ms: Long, val tasks: Int) : Event
    data class Failed(val message: String) : Event
    class Image(val bytes: ByteArray) : Event
}

/**
 * Jarvis' controller, after HuggingGPT/JARVIS (Shen et al., 2023): an LLM plans the request into tasks with
 * dependencies, a model is chosen for each task, independent tasks run in parallel, and one voice answers.
 * Differences: the experts are LLMs from DeepSeek / NVIDIA / OpenRouter chosen by a learning router, simple
 * requests skip planning to save calls (free tiers are limited), and the planner may ask YOU a question.
 */
class Jarvis(
    val router: ModelRouter,
    private val client: LlmClient,
    val memory: Memory,
    private val providers: () -> List<Provider>,
    private val voiceMode: () -> Boolean = { false },
) {
    private val usable get() = providers().filter { it.ready }
    private fun provider(id: String) = usable.firstOrNull { it.id == id }

    fun persona(): String {
        val voice = if (voiceMode()) " Your answers may be spoken aloud: keep them to 1-3 short sentences, no markdown, no lists, unless asked for detail." else " Be concise; use short paragraphs, and lists only when they help."
        val mem = memory.asPrompt()
        return "You are Jarvis, a sharp, warm, quietly witty personal AI assistant living on the user's phone. Be direct and useful. Never invent facts; say when you are unsure. Today is ${java.time.LocalDate.now()}.$voice" + if (mem.isNotBlank()) "\n\n$mem" else ""
    }

    var imageStudio: ImageStudio? = null

    /** Runs a request end to end, reporting progress through [emit]. */
    suspend fun run(text: String, history: List<Msg> = emptyList(), images: List<String> = emptyList(), screen: String? = null, emit: (Event) -> Unit): Unit = withContext(Dispatchers.IO) {
        val t0 = System.currentTimeMillis()
        val studio = imageStudio
        if (studio != null && images.isEmpty() && ImageStudio.isImageRequest(text)) {
            emit(Event.Stage("executing", "image"))
            when (val r = studio.generate(text)) {
                is ImageResult.Ok -> { emit(Event.Image(r.bytes)); emit(Event.Done("Here you go. It's saved in the Chat tab of the Jarvis app.", null, 0, System.currentTimeMillis() - t0, 1)) }
                is ImageResult.Blocked -> emit(Event.Done("I generated that but the safety check blocked it (${r.label}), so I'm not showing it. Try a different idea.", null, 0, System.currentTimeMillis() - t0, 1))
                is ImageResult.Failed -> emit(Event.Failed(r.message))
            }
            return@withContext
        }
        if (usable.isEmpty()) { emit(Event.Failed("Add an API key first (OpenRouter, DeepSeek or NVIDIA).")); return@withContext }
        if (router.all.isEmpty()) router.refresh(providers())
        var tokens = 0

        val request = buildString {
            append(text)
            if (!screen.isNullOrBlank()) append("\n\n[What is on my screen right now]\n").append(screen.take(5000))
        }
        val simple = images.isEmpty() && screen.isNullOrBlank() && isSimple(text)
        val tasks = if (simple) listOf(PlanTask(1, Role.CHAT, text, emptyList())) else {
            emit(Event.Stage("planning"))
            when (val plan = plan(request, history, images.isNotEmpty())) {
                is Plan.Ask -> { emit(Event.Clarify(plan.question, plan.options)); return@withContext }
                is Plan.Tasks -> plan.tasks
            }
        }
        emit(Event.Planned(tasks))

        val msgs = history.takeLast(8)
        val results = HashMap<Int, String>()
        var lastModel: ModelInfo? = null

        try {
            if (tasks.size == 1) {
                val t = tasks[0]
                val role = if (images.isNotEmpty()) Role.VISION else t.role
                emit(Event.Stage("answering"))
                val r = callRole(role, listOf(Msg.system(persona() + roleHint(role))) + msgs + Msg.user(request, images), onStart = { emit(Event.TaskStart(t.id, role, it, t.goal)) }) { emit(Event.Token(it)) }
                tokens += r.first.completionTokens; lastModel = r.second
                emit(Event.TaskDone(t.id, r.second, r.first.latencyMs))
                emit(Event.Done(r.first.text, r.second, tokens, System.currentTimeMillis() - t0, 1)); return@withContext
            }

            emit(Event.Stage("executing", "${tasks.size} tasks"))
            val pending = tasks.toMutableList()
            while (pending.isNotEmpty()) {
                val ready = pending.filter { it.dep.all { d -> d in results } }.ifEmpty { listOf(pending.first()) }   // cycles can't happen (deps are earlier ids) but never hang
                pending.removeAll(ready)
                coroutineScope {
                    ready.map { t -> async(Dispatchers.IO) {
                        val ctx = t.dep.mapNotNull { d -> results[d]?.let { "Result of task $d:\n$it" } }.joinToString("\n\n")
                        val prompt = "Original request:\n$request\n\nYour task (${t.role.label}): ${t.goal}" + if (ctx.isNotBlank()) "\n\n$ctx" else ""
                        val role = if (images.isNotEmpty() && t.role == Role.VISION) Role.VISION else t.role
                        val r = callRole(role, listOf(Msg.system(persona() + roleHint(role) + " You are one step of a larger job: do only your task and be complete but tight."), Msg.user(prompt, if (role == Role.VISION) images else emptyList())),
                            onStart = { emit(Event.TaskStart(t.id, role, it, t.goal)) })
                        synchronized(results) { results[t.id] = r.first.text; tokens += r.first.completionTokens; lastModel = r.second }
                        emit(Event.TaskDone(t.id, r.second, r.first.latencyMs))
                    } }.awaitAll()
                }
            }

            emit(Event.Stage("answering"))
            val digest = tasks.joinToString("\n\n") { "## Task ${it.id} (${it.role.label}): ${it.goal}\n${results[it.id].orEmpty()}" }
            val synth = "The user asked:\n$request\n\nSpecialist results:\n$digest\n\nWrite the final answer to the user in your own voice. Merge the results, resolve conflicts, drop anything wrong or redundant, and don't mention tasks, models or this process."
            val r = callRole(Role.CHAT, listOf(Msg.system(persona())) + msgs + Msg.user(synth), onStart = {}) { emit(Event.Token(it)) }
            tokens += r.first.completionTokens
            emit(Event.Done(r.first.text, r.second, tokens, System.currentTimeMillis() - t0, tasks.size))
        } catch (e: LlmException) {
            emit(Event.Failed(friendly(e)))
        }
    }

    sealed interface Plan { data class Tasks(val tasks: List<PlanTask>) : Plan; data class Ask(val question: String, val options: List<String>) : Plan }

    private fun plan(request: String, history: List<Msg>, hasImage: Boolean): Plan {
        val sys = """You are the planning stage of Jarvis. Break the user's request into the FEWEST tasks that solve it (usually 1-3, never more than 4). Reply with JSON only:
{"clarify": null or "one short question", "options": ["up to 3 short answers"], "tasks": [{"id": 1, "role": "reason|code|write|vision|fast|chat", "goal": "what this task must produce", "dep": [ids of earlier tasks whose result it needs]}]}
Roles: reason = analysis/maths/logic/research-style thinking; code = write or fix code; write = drafting text; vision = look at the attached image/screen; fast = trivial lookup or rewrite; chat = general answer.
Only set "clarify" when the request is genuinely ambiguous in a way that would change the answer and you cannot reasonably assume; otherwise null.${if (hasImage) " An image is attached." else ""}
${memory.asPrompt()}"""
        val msgs = listOf(Msg.system(sys)) + history.takeLast(4) + Msg.user(request.take(6000))
        val res = try { callRole(Role.PLAN, msgs, json = true, onStart = {}).first } catch (e: LlmException) { throw e }
        val j = extractJson(res.text) ?: return Plan.Tasks(listOf(PlanTask(1, Role.CHAT, request.take(300), emptyList())))
        val q = j.optString("clarify", "").takeIf { it.isNotBlank() && it != "null" }
        if (q != null) return Plan.Ask(q, j.optJSONArray("options")?.strings()?.take(3) ?: emptyList())
        val tasks = ArrayList<PlanTask>()
        (j.optJSONArray("tasks") ?: JSONArray()).objects().take(4).forEachIndexed { i, o ->
            val id = o.optInt("id", i + 1).takeIf { it > 0 && tasks.none { t -> t.id == it } } ?: (i + 1)
            val role = when (o.optString("role").lowercase()) {
                "reason", "reasoning", "analysis" -> Role.REASON; "code", "coding" -> Role.CODE; "write", "writing" -> Role.WRITE
                "vision", "image" -> Role.VISION; "fast", "quick" -> Role.FAST; else -> Role.CHAT }
            val dep = (o.optJSONArray("dep") ?: JSONArray()).let { a -> (0 until a.length()).map { a.optInt(it) } }.filter { d -> tasks.any { it.id == d } }
            tasks += PlanTask(id, role, o.optString("goal").ifBlank { request.take(200) }, dep)
        }
        return Plan.Tasks(tasks.ifEmpty { listOf(PlanTask(1, Role.CHAT, request.take(300), emptyList())) })
    }

    /** Try ranked models for [role] until one answers. Returns the result and the model that produced it. */
    internal fun callRole(role: Role, msgs: List<Msg>, json: Boolean = false, onStart: (ModelInfo) -> Unit, onDelta: ((String) -> Unit)? = null): Pair<ChatResult, ModelInfo> {
        var candidates = router.rank(role, usable.map { it.id }.toSet())
        if (candidates.isEmpty() && role == Role.VISION) candidates = router.rank(Role.CHAT, usable.map { it.id }.toSet())   // no vision model: degrade gracefully
        if (candidates.isEmpty()) throw LlmException(0, "No usable model found for ${role.label}. Open Models and tap Refresh.")
        var last: LlmException? = null
        for (m in candidates) {
            val p = provider(m.provider) ?: continue
            onStart(m)
            try {
                val r = if (onDelta != null) client.stream(p, m.id, msgs, onDelta = onDelta) else client.chat(p, m.id, msgs, json = json)
                router.recordOk(m, r.latencyMs)
                return r to m
            } catch (e: LlmException) {
                router.recordFail(m, e); last = e
                if (e.authFailed && usable.size == 1) break
            }
        }
        throw last ?: LlmException(0, "No model answered.")
    }

    private fun roleHint(r: Role) = when (r) {
        Role.CODE -> " For code: give correct, runnable code and the key explanation only."
        Role.REASON -> " Think carefully and verify before you answer."
        Role.VISION -> " Describe and reason about what you actually see; say if something is unreadable."
        else -> ""
    }

    private fun friendly(e: LlmException) = when {
        e.authFailed -> "A provider rejected your key. Check it in Settings."
        e.rateLimited -> "Every model is rate-limited right now (free tiers have daily limits). Try again in a minute, or add DeepSeek or NVIDIA keys."
        else -> e.message ?: "Something went wrong."
    }

    companion object {
        private val COMPLEX = Regex("\\b(code|build|write|draft|analy[sz]e|compare|plan|research|explain|step|why|debug|fix|design|essay|summari[sz]e|translate|calculate|prove|strategy|review|improve)\\b", RegexOption.IGNORE_CASE)
        /** Short conversational asks go straight to one model: no planning call (saves latency and free-tier quota). */
        fun isSimple(t: String) = t.length < 90 && !COMPLEX.containsMatchIn(t) && t.count { it == '\n' } < 2
    }
}
