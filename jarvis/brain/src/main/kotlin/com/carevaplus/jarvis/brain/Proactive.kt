package com.carevaplus.jarvis.brain

import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDateTime

data class ScreenContext(val pkg: String, val app: String, val text: String, val at: Long = System.currentTimeMillis())

/** Something Jarvis wants to say. [prompt] is the job it runs if the user accepts. */
data class Suggestion(val message: String, val question: String?, val options: List<String>, val prompt: String, val pkg: String)

data class ProactivePolicy(
    val enabled: Boolean = true,
    val minGapMs: Long = 2 * 60_000,
    val appCooldownMs: Long = 15 * 60_000,
    val dailyBudget: Int = 12,
    val quietStartHour: Int = 23,
    val quietEndHour: Int = 7,
    val minChars: Int = 160,
    val extraBlocked: Set<String> = emptySet(),
)

sealed interface Gate { data object Allow : Gate; data class Deny(val reason: String) : Gate }

/**
 * Decides when Jarvis may speak up, and whether it has anything worth saying. Silence is the default:
 * several cheap local gates run first (no network), and only then does a model look at the screen.
 */
class ProactiveEngine(
    private val router: ModelRouter,
    private val client: LlmClient,
    private val memory: Memory,
    private val store: Store,
    private val providers: () -> List<Provider>,
    private val policy: () -> ProactivePolicy,
    private val clock: () -> Long = System::currentTimeMillis,
    private val now: () -> LocalDateTime = LocalDateTime::now,
) {
    private var lastAt = 0L
    private var lastHash = 0
    private val appLast = HashMap<String, Long>()

    private val sensitive = Regex("bank|wallet|upi|paytm|phonepe|gpay|pay\\b|password|authenticator|keepass|1password|bitwarden|lastpass|dashlane|vpn|keystore|\\.pay\\.|crypto|binance|coinbase|health|medical|dating|tinder", RegexOption.IGNORE_CASE)
    private val system = Regex("^(com\\.android\\.(systemui|launcher|inputmethod|settings|packageinstaller|permissioncontroller)|com\\.google\\.android\\.(inputmethod|apps\\.nexuslauncher|permissioncontroller)|com\\.carevaplus\\.jarvis|android$)")

    fun gate(ctx: ScreenContext): Gate {
        val p = policy()
        if (!p.enabled) return Gate.Deny("off")
        if (system.containsMatchIn(ctx.pkg) || ctx.pkg in p.extraBlocked) return Gate.Deny("ignored app")
        if (sensitive.containsMatchIn(ctx.pkg)) return Gate.Deny("sensitive app")
        val h = now().hour
        val quiet = if (p.quietStartHour > p.quietEndHour) (h >= p.quietStartHour || h < p.quietEndHour) else (h in p.quietStartHour until p.quietEndHour)
        if (quiet) return Gate.Deny("quiet hours")
        if (ctx.text.length < p.minChars) return Gate.Deny("not enough text")
        val hash = ctx.text.hashCode()
        if (hash == lastHash) return Gate.Deny("unchanged")
        val t = clock()
        if (t - lastAt < p.minGapMs) return Gate.Deny("too soon")
        if (t - (appLast[ctx.pkg] ?: 0L) < p.appCooldownMs) return Gate.Deny("app cooldown")
        if (t < suppressedUntil(ctx.pkg)) return Gate.Deny("you dismissed this app")
        if (usedToday() >= p.dailyBudget) return Gate.Deny("daily budget")
        if (providers().none { it.ready }) return Gate.Deny("no key")
        return Gate.Allow
    }

    /** Runs the gates, then asks a fast model whether anything here deserves a nudge. Returns null for silence. */
    fun consider(ctx: ScreenContext): Suggestion? {
        if (gate(ctx) != Gate.Allow) return null
        lastHash = ctx.text.hashCode(); lastAt = clock(); appLast[ctx.pkg] = lastAt
        bumpToday()
        val usable = providers().filter { it.ready }
        val m = router.rank(Role.FAST, usable.map { it.id }.toSet(), 4).firstOrNull() ?: return null
        val p = usable.firstOrNull { it.id == m.provider } ?: return null
        val sys = """You are the proactive layer of Jarvis, a personal assistant on the user's phone. You see text from the screen the user is using. STAY SILENT BY DEFAULT: speak only when you can offer clear, specific, valuable help right now, for example:
- a long text worth summarising, or a message/email the user is replying to (offer a draft)
- text in another language (offer a translation)
- a likely scam, phishing link, or something risky (warn plainly)
- an error, deadline, date or number that looks wrong, or a question visible on screen you can answer
- a decision where one short question to the user would let you help much better
Never comment on ordinary browsing, social feeds or entertainment. Reply with JSON only:
{"speak": false} or {"speak": true, "message": "max 120 chars, addressed to the user", "question": null or "a short question", "options": ["up to 3 short replies"], "prompt": "the full task you will run if the user says yes"}
${memory.asPrompt()}"""
        return try {
            val r = client.chat(p, m.id, listOf(Msg.system(sys), Msg.user("App: ${ctx.app} (${ctx.pkg})\nScreen text:\n${ctx.text.take(3500)}")), 0.2, 300, json = true)
            router.recordOk(m, r.latencyMs)
            parse(r.text, ctx.pkg)
        } catch (e: LlmException) { router.recordFail(m, e); null }
    }

    fun parse(text: String, pkg: String): Suggestion? {
        val j = extractJson(text) ?: return null
        if (!j.optBoolean("speak", false)) return null
        val msg = j.optString("message").trim().take(160).ifBlank { return null }
        val q = j.optString("question", "").trim().takeIf { it.isNotBlank() && it != "null" }
        val prompt = j.optString("prompt").trim().ifBlank { msg }
        return Suggestion(msg, q, j.optJSONArray("options")?.strings()?.take(3) ?: emptyList(), prompt, pkg)
    }

    /** The user accepted or dismissed. Two dismissals in a row mute that app for a day; acceptance relaxes its cooldown. */
    fun outcome(pkg: String, accepted: Boolean) {
        val key = "proactive.dismiss.$pkg"
        if (accepted) { store.remove(key); appLast[pkg] = clock() - policy().appCooldownMs / 2; return }
        val n = (store.get(key)?.toIntOrNull() ?: 0) + 1
        store.put(key, n.toString())
        if (n >= 2) store.put("proactive.mute.$pkg", (clock() + 24 * 3600_000L).toString())
    }

    fun suppressedUntil(pkg: String) = store.get("proactive.mute.$pkg")?.toLongOrNull() ?: 0L
    fun usedToday(): Int = store.get("proactive.day.${now().toLocalDate()}")?.toIntOrNull() ?: 0
    private fun bumpToday() = store.put("proactive.day.${now().toLocalDate()}", (usedToday() + 1).toString())
}
