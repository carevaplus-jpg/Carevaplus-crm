package com.carevaplus.jarvis.brain

import org.json.JSONObject

/** Observed behaviour of one model on THIS user's keys and network. */
data class Stat(
    var ok: Int = 0, var fail: Int = 0, var avgMs: Double = 0.0, var good: Int = 0, var bad: Int = 0,
    var coolUntil: Long = 0, var verified: Boolean = false, var lastError: String = "",
) {
    val reliability get() = if (ok + fail == 0) 0.7 else (ok + 1.0) / (ok + fail + 1.5)
    fun toJson() = JSONObject().put("ok", ok).put("fail", fail).put("ms", avgMs).put("good", good).put("bad", bad)
        .put("cool", coolUntil).put("ver", verified).put("err", lastError)
    companion object {
        fun fromJson(j: JSONObject) = Stat(j.optInt("ok"), j.optInt("fail"), j.optDouble("ms", 0.0), j.optInt("good"), j.optInt("bad"),
            j.optLong("cool"), j.optBoolean("ver"), j.optString("err"))
    }
}

/**
 * Picks the best model for each role, from what the user can actually use.
 * Score = capability prior x live reliability + speed + user preference. A model that errors or rate-limits is
 * cooled off and the next one is used automatically.
 */
class ModelRouter(private val store: Store, private val client: LlmClient = LlmClient(), private val clock: () -> Long = System::currentTimeMillis) {
    private val models = LinkedHashMap<String, ModelInfo>()
    private val stats = HashMap<String, Stat>()
    private val pinned = HashMap<Role, String>()
    @Volatile private var providerBias = mapOf(Provider.DEEPSEEK to 4.0, Provider.NVIDIA to 2.0, Provider.OPENROUTER to 0.0)

    init { load() }

    val all: List<ModelInfo> @Synchronized get() = models.values.toList()
    @Synchronized fun statOf(m: ModelInfo) = stats[m.key]
    @Synchronized fun pinnedFor(role: Role) = pinned[role]

    /** Refresh every ready provider's real model list. Failures on one provider never block the others. */
    fun refresh(providers: List<Provider>): Map<String, String> {
        val errors = HashMap<String, String>()
        val found = LinkedHashMap<String, ModelInfo>()
        for (p in providers) {
            if (!p.ready) continue
            try { client.listModels(p).mapNotNull { Catalog.parse(p.id, it) }.forEach { found[it.key] = it } }
            catch (e: LlmException) { errors[p.id] = e.message ?: "failed" }
        }
        synchronized(this) {
            // keep models from providers that errored this time, so a flaky network doesn't empty the list
            models.values.filter { it.provider in errors.keys }.forEach { found.putIfAbsent(it.key, it) }
            models.clear(); models.putAll(found)
            save()
        }
        return errors
    }

    @Synchronized fun score(m: ModelInfo, role: Role): Double {
        val s = stats[m.key] ?: Stat()
        var v = Catalog.prior(m, role)
        if (v <= 0) return 0.0
        v = v * (0.55 + 0.45 * s.reliability)
        if (s.verified) v += 6 else if (s.ok == 0 && s.fail > 0) v -= 12
        if (s.avgMs > 0) v += (if (role == Role.FAST) 18.0 else 6.0) * (1.0 - (s.avgMs / 8000.0).coerceIn(0.0, 1.0))
        v += (s.good - s.bad).coerceIn(-5, 8) * 1.5
        v += providerBias[m.provider] ?: 0.0
        if (m.free) v -= 1.0
        if (pinned[role] == m.key) v += 60
        if (s.coolUntil > clock()) v -= 200
        return v
    }

    /** Best-first candidates for a role (cooled-off models last), restricted to providers the caller can use. */
    @Synchronized fun rank(role: Role, usable: Set<String>, limit: Int = 8): List<ModelInfo> =
        models.values.filter { it.provider in usable && (role != Role.VISION || it.vision) }
            .map { it to score(it, role) }.filter { it.second > -150 }.sortedByDescending { it.second }.take(limit).map { it.first }

    @Synchronized fun recordOk(m: ModelInfo, ms: Long) {
        val s = stats.getOrPut(m.key) { Stat() }
        s.ok++; s.avgMs = if (s.avgMs == 0.0) ms.toDouble() else s.avgMs * 0.7 + ms * 0.3; s.coolUntil = 0; s.lastError = ""
        save()
    }

    @Synchronized fun recordFail(m: ModelInfo, e: LlmException) {
        val s = stats.getOrPut(m.key) { Stat() }
        s.fail++; s.lastError = e.message ?: ""
        s.coolUntil = clock() + when { e.rateLimited -> 5 * 60_000L; e.authFailed -> 60 * 60_000L; else -> 60_000L }
        save()
    }

    @Synchronized fun feedback(m: ModelInfo, good: Boolean) {
        val s = stats.getOrPut(m.key) { Stat() }
        if (good) s.good++ else s.bad++
        save()
    }

    @Synchronized fun pin(role: Role, m: ModelInfo?) { if (m == null) pinned.remove(role) else pinned[role] = m.key; save() }
    fun setProviderBias(b: Map<String, Double>) { providerBias = b }

    /** Tiny live test of the top candidates so the ranking reflects what really works for this user. */
    fun probe(providers: List<Provider>, perRole: Int = 2, onProgress: (String) -> Unit = {}) {
        val usable = providers.filter { it.ready }.associateBy { it.id }
        val targets = LinkedHashSet<ModelInfo>()
        for (r in listOf(Role.PLAN, Role.CODE, Role.FAST, Role.CHAT)) targets += rank(r, usable.keys, perRole)
        for (m in targets) {
            val p = usable[m.provider] ?: continue
            onProgress(m.short)
            try {
                val r = client.chat(p, m.id, listOf(Msg.user("Reply with the single word: OK")), 0.0, 24)
                synchronized(this) { stats.getOrPut(m.key) { Stat() }.verified = true }
                recordOk(m, r.latencyMs)
            } catch (e: LlmException) { recordFail(m, e) }
        }
    }

    private fun save() {
        store.put("router.models", org.json.JSONArray().also { a -> models.values.forEach {
            a.put(JSONObject().put("p", it.provider).put("id", it.id).put("c", it.context).put("v", it.vision).put("r", it.reasoning).put("f", it.free)) } }.toString())
        store.put("router.stats", JSONObject().also { o -> stats.forEach { (k, v) -> o.put(k, v.toJson()) } }.toString())
        store.put("router.pins", JSONObject().also { o -> pinned.forEach { (k, v) -> o.put(k.name, v) } }.toString())
    }

    private fun load() {
        runCatching {
            store.get("router.models")?.let { s -> org.json.JSONArray(s).objects().forEach {
                val m = ModelInfo(it.getString("p"), it.getString("id"), it.optInt("c"), it.optBoolean("v"), it.optBoolean("r"), it.optBoolean("f")); models[m.key] = m } }
            store.get("router.stats")?.let { s -> JSONObject(s).let { o -> o.keys().forEach { k -> stats[k] = Stat.fromJson(o.getJSONObject(k)) } } }
            store.get("router.pins")?.let { s -> JSONObject(s).let { o -> o.keys().forEach { k -> runCatching { pinned[Role.valueOf(k)] = o.getString(k) } } } }
        }
    }
}
