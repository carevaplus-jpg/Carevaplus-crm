package com.carevaplus.jarvis.brain

import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import java.time.LocalDateTime
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.test.*

class BrainTest {
    private val models = listOf("deepseek-reasoner", "deepseek-chat", "nvidia/nemotron-3-ultra-550b-a55b", "nvidia/nemotron-3.5-embed-8b",
        "nvidia/nemotron-3.5-content-safety", "nvidia/nemotron-3.5-bolt-e4b", "nvidia/nemotron-3.5-super-vl-120b-a12b")

    private fun jarvis(server: FakeServer, store: Store = MemoryStore(), voice: Boolean = false): Triple<Jarvis, ModelRouter, List<Provider>> {
        val ps = listOf(server.provider(Provider.DEEPSEEK))
        val router = ModelRouter(store)
        val j = Jarvis(router, LlmClient(), Memory(store), { ps }, { voice })
        router.refresh(ps)
        return Triple(j, router, ps)
    }

    private fun collect(j: Jarvis, text: String, screen: String? = null, images: List<String> = emptyList()): List<Event> {
        val ev = CopyOnWriteArrayList<Event>()
        runBlocking { j.run(text, screen = screen, images = images) { ev += it } }
        return ev
    }

    // ---------- catalog ----------
    @Test fun catalogDropsNonChatAndPaidOpenRouterModels() {
        assertNull(Catalog.parse(Provider.NVIDIA, JSONObject().put("id", "nvidia/nemotron-3.5-embed-8b")))
        assertNull(Catalog.parse(Provider.NVIDIA, JSONObject().put("id", "nvidia/nemotron-3.5-content-safety")))
        assertNotNull(Catalog.parse(Provider.NVIDIA, JSONObject().put("id", "nvidia/nemotron-3-ultra-550b-a55b")))
        val paid = JSONObject("""{"id":"x/big","pricing":{"prompt":"0.001","completion":"0.002"}}""")
        val free = JSONObject("""{"id":"x/big:free","pricing":{"prompt":"0","completion":"0"}}""")
        assertNull(Catalog.parse(Provider.OPENROUTER, paid), "must never offer paid OpenRouter models")
        assertNotNull(Catalog.parse(Provider.OPENROUTER, free))
        assertNotNull(Catalog.parse(Provider.DEEPSEEK, paid), "direct providers are the user's own paid keys")
    }

    @Test fun visionDetectedFromModalitiesOrName() {
        assertTrue(Catalog.parse(Provider.NVIDIA, JSONObject().put("id", "nvidia/nemotron-3.5-super-vl-120b-a12b"))!!.vision)
        val v = JSONObject("""{"id":"a/b:free","pricing":{"prompt":"0","completion":"0"},"architecture":{"input_modalities":["text","image"],"output_modalities":["text"]}}""")
        assertTrue(Catalog.parse(Provider.OPENROUTER, v)!!.vision)
        assertNull(Catalog.parse(Provider.OPENROUTER, JSONObject("""{"id":"a/m:free","pricing":{"prompt":"0","completion":"0"},"architecture":{"output_modalities":["text","audio"]}}""")))
    }

    // ---------- router ----------
    @Test fun routerPrefersStrongModelsPerRoleAndSkipsGarbage() = FakeServer(models) { _, _ -> Reply(content = "OK") }.use { s ->
        val (_, r, ps) = jarvis(s)
        assertEquals(5, r.all.size, "embed and safety models are filtered out")
        val plan = r.rank(Role.PLAN, setOf("deepseek"))
        assertTrue(plan.first().id in setOf("deepseek-reasoner", "nvidia/nemotron-3-ultra-550b-a55b", "deepseek-chat"), "planner should be a strong model, got ${plan.first().id}")
        assertTrue(r.rank(Role.FAST, setOf("deepseek")).first().id.contains("bolt"), "FAST role should prefer the small model")
        assertTrue(r.rank(Role.VISION, setOf("deepseek")).all { it.vision })
        assertTrue(r.rank(Role.CHAT, setOf("other")).isEmpty(), "providers without a key are never used")
    }

    @Test fun pinningAndFeedbackChangeTheRanking() = FakeServer(models) { _, _ -> Reply(content = "OK") }.use { s ->
        val (_, r, _) = jarvis(s)
        val weak = r.all.first { it.id.contains("bolt") }
        assertNotEquals(weak, r.rank(Role.CODE, setOf("deepseek")).first())
        r.pin(Role.CODE, weak)
        assertEquals(weak, r.rank(Role.CODE, setOf("deepseek")).first(), "a pinned model wins")
        r.pin(Role.CODE, null)
        val a = r.rank(Role.CHAT, setOf("deepseek")).first(); val b = r.rank(Role.CHAT, setOf("deepseek"))[1]
        repeat(8) { r.feedback(b, true); r.feedback(a, false) }
        assertTrue(r.score(b, Role.CHAT) > r.score(a, Role.CHAT) - 12, "thumbs move scores")
    }

    @Test fun rateLimitedModelIsCooledAndStatsPersist() = FakeServer(models) { _, _ -> Reply(content = "OK") }.use { s ->
        val store = MemoryStore()
        val (_, r, _) = jarvis(s, store)
        val top = r.rank(Role.CHAT, setOf("deepseek")).first()
        r.recordFail(top, LlmException(429, "slow down"))
        assertNotEquals(top, r.rank(Role.CHAT, setOf("deepseek")).first())
        val again = ModelRouter(store)                       // new process, same storage
        assertEquals(models.size - 2, again.all.size)
        assertEquals(1, again.statOf(top)!!.fail)
    }

    @Test fun probeVerifiesWorkingModelsAndMarksBrokenOnes() = FakeServer(models) { m, _ -> if (m == "deepseek-chat") Reply(401, "bad key") else Reply(content = "OK") }.use { s ->
        val (_, r, ps) = jarvis(s)
        r.probe(ps, perRole = 3)
        assertTrue(r.all.any { r.statOf(it)?.verified == true })
        val broken = r.all.first { it.id == "deepseek-chat" }
        assertEquals(1, r.statOf(broken)!!.fail)
        assertTrue(r.score(broken, Role.PLAN) < 0, "an auth-failing model drops out")
    }

    // ---------- pipeline ----------
    @Test fun simpleChatSkipsPlanningAndStreams() = FakeServer(models) { _, _ -> Reply(content = "Hello! All systems nominal.") }.use { s ->
        val (j, _, _) = jarvis(s)
        val ev = collect(j, "hey jarvis, how are you")
        assertEquals(1, s.requests.size, "one model call, no planner")
        assertTrue(ev.any { it is Event.Token })
        val done = ev.filterIsInstance<Event.Done>().single()
        assertEquals("Hello! All systems nominal.", done.answer)
        assertEquals(1, done.tasks)
    }

    @Test fun complexRequestIsPlannedRunInDependencyOrderThenSynthesised() {
        val order = CopyOnWriteArrayList<String>()
        FakeServer(models) { _, body ->
            val sys = body.getJSONArray("messages").getJSONObject(0).getString("content")
            val last = body.getJSONArray("messages").let { it.getJSONObject(it.length() - 1).optString("content") }
            when {
                sys.contains("planning stage") -> Reply(content = """Sure! ```json
{"clarify": null, "options": [], "tasks": [
 {"id": 1, "role": "reason", "goal": "work out the maths", "dep": []},
 {"id": 2, "role": "write", "goal": "write it up", "dep": [1]},
 {"id": 3, "role": "code", "goal": "make a script", "dep": []}]}
``` done""")
                last.contains("Specialist results") -> { order += "synth"; Reply(content = "FINAL ANSWER") }
                last.contains("work out the maths") -> { order += "t1"; Reply(content = "RESULT-ONE", delayMs = 150) }
                last.contains("write it up") -> { order += "t2"; assertTrue(last.contains("RESULT-ONE"), "task 2 must receive task 1's output"); Reply(content = "RESULT-TWO") }
                last.contains("make a script") -> { order += "t3"; Reply(content = "RESULT-THREE") }
                else -> Reply(content = "?")
            }
        }.use { s ->
            val (j, _, _) = jarvis(s)
            val ev = collect(j, "Analyze the growth numbers and write a short report plus a script to chart them")
            val planned = ev.filterIsInstance<Event.Planned>().single().tasks
            assertEquals(listOf(Role.REASON, Role.WRITE, Role.CODE), planned.map { it.role })
            assertEquals(listOf(1), planned[1].dep)
            assertTrue(order.indexOf("t1") < order.indexOf("t2"), "dependency order: $order")
            assertTrue(order.indexOf("t3") < order.indexOf("t2"), "independent task 3 runs in the first wave, in parallel with task 1: $order")
            assertEquals("synth", order.last())
            assertEquals("FINAL ANSWER", ev.filterIsInstance<Event.Done>().single().answer)
            assertEquals(3, ev.filterIsInstance<Event.TaskDone>().size)
        }
    }

    @Test fun plannerQuestionIsAskedInsteadOfGuessing() = FakeServer(models) { _, body ->
        val sys = body.getJSONArray("messages").getJSONObject(0).getString("content")
        if (sys.contains("planning stage")) Reply(content = """{"clarify":"Formal or casual tone?","options":["Formal","Casual"],"tasks":[]}""") else Reply(content = "should not run")
    }.use { s ->
        val (j, _, _) = jarvis(s)
        val ev = collect(j, "Draft a reply to my landlord about the broken heater and the deposit")
        val q = ev.filterIsInstance<Event.Clarify>().single()
        assertEquals("Formal or casual tone?", q.question); assertEquals(listOf("Formal", "Casual"), q.options)
        assertTrue(ev.none { it is Event.Done }); assertEquals(1, s.requests.size, "nothing else is spent once Jarvis needs an answer")
    }

    @Test fun fallsBackToNextModelWhenOneIsRateLimited() {
        var first: String? = null
        FakeServer(models) { m, _ -> if (first == null) first = m; if (m == first) Reply(429, "rate limited") else Reply(content = "from $m") }.use { s ->
            val (j, r, _) = jarvis(s)
            val done = collect(j, "hi there").filterIsInstance<Event.Done>().single()
            assertNotEquals(first, done.model!!.id)
            assertTrue(done.answer.startsWith("from "))
            assertEquals(1, r.all.first { it.id == first }.let { r.statOf(it)!!.fail })
        }
    }

    @Test fun allModelsRateLimitedGivesAFriendlyError() = FakeServer(models) { _, _ -> Reply(429, "limit") }.use { s ->
        val (j, _, _) = jarvis(s)
        val f = collect(j, "hello").filterIsInstance<Event.Failed>().single()
        assertTrue(f.message.contains("rate-limited"), f.message)
    }

    @Test fun noKeyAsksForOne() {
        val j = Jarvis(ModelRouter(MemoryStore()), LlmClient(), Memory(MemoryStore()), { emptyList() })
        assertTrue(collect(j, "hello").filterIsInstance<Event.Failed>().single().message.contains("API key"))
    }

    @Test fun memoryIsInjectedAndVoiceModeShortensAnswers() = FakeServer(models) { _, _ -> Reply(content = "ok") }.use { s ->
        val store = MemoryStore(); val (j, _, _) = jarvis(s, store, voice = true)
        j.memory.remember("Prefers answers in Hindi")
        collect(j, "hi")
        val sys = s.requests.last().getJSONArray("messages").getJSONObject(0).getString("content")
        assertTrue(sys.contains("Prefers answers in Hindi")); assertTrue(sys.contains("spoken aloud"))
    }

    @Test fun screenContextRoutesThroughThePlanner() = FakeServer(models) { _, body ->
        val sys = body.getJSONArray("messages").getJSONObject(0).getString("content")
        if (sys.contains("planning stage")) Reply(content = """{"clarify":null,"tasks":[{"id":1,"role":"chat","goal":"summarise","dep":[]}]}""") else Reply(content = "Summary.")
    }.use { s ->
        val (j, _, _) = jarvis(s)
        collect(j, "what is this", screen = "Invoice #442 due 3 Dec, total 1,240")
        assertTrue(s.userMessages().any { it.contains("Invoice #442") }, "screen text reaches the model")
    }

    // ---------- JSON ----------
    @Test fun extractJsonSurvivesProseFencesAndThinking() {
        assertEquals(2, extractJson("<think>{\"a\":1}</think> here: ```json\n{\"a\": 2, \"s\": \"}{\"}\n```")!!.getInt("a"))
        assertNull(extractJson("no json here"))
    }

    // ---------- proactive ----------
    private fun engine(s: FakeServer?, store: Store = MemoryStore(), hour: Int = 14, policy: ProactivePolicy = ProactivePolicy(), t: () -> Long = { 1_000_000L }): ProactiveEngine {
        val ps = if (s != null) listOf(s.provider()) else emptyList()
        val router = ModelRouter(store, clock = t).also { if (s != null) it.refresh(ps) }
        return ProactiveEngine(router, LlmClient(), Memory(store), store, { ps }, { policy }, t, { LocalDateTime.of(2026, 11, 27, hour, 0) })
    }
    private val longText = "Hi team, please find attached the quarterly numbers. ".repeat(6)

    @Test fun gatesBlockSensitiveSystemQuietShortAndRepeated() = FakeServer(models) { _, _ -> Reply(content = """{"speak":false}""") }.use { s ->
        val e = engine(s)
        assertEquals(Gate.Allow, e.gate(ScreenContext("com.whatsapp", "WhatsApp", longText)))
        assertTrue(e.gate(ScreenContext("com.phonepe.app", "PhonePe", longText)) is Gate.Deny)
        assertTrue(e.gate(ScreenContext("com.hdfc.bank", "Bank", longText)) is Gate.Deny)
        assertTrue(e.gate(ScreenContext("com.android.systemui", "UI", longText)) is Gate.Deny)
        assertTrue(e.gate(ScreenContext("com.carevaplus.jarvis", "Jarvis", longText)) is Gate.Deny)
        assertTrue(e.gate(ScreenContext("com.whatsapp", "WhatsApp", "short")) is Gate.Deny)
        assertTrue(engine(s, hour = 2).gate(ScreenContext("com.whatsapp", "W", longText)) is Gate.Deny, "quiet hours")
        assertTrue(engine(null).gate(ScreenContext("com.whatsapp", "W", longText)) is Gate.Deny, "no key")
        assertTrue(engine(s, policy = ProactivePolicy(enabled = false)).gate(ScreenContext("com.whatsapp", "W", longText)) is Gate.Deny)
    }

    @Test fun speaksOnlyWhenWorthItAndThrottlesAfterwards() {
        var clock = 1_000_000L
        FakeServer(models) { _, _ -> Reply(content = """{"speak":true,"message":"This looks like a phishing link.","question":"Want me to check it?","options":["Yes","No"],"prompt":"Analyse the link on screen for phishing"}""") }.use { s ->
            val e = engine(s, t = { clock })
            val sg = e.consider(ScreenContext("com.android.chrome", "Chrome", longText))!!
            assertEquals("This looks like a phishing link.", sg.message); assertEquals(listOf("Yes", "No"), sg.options); assertEquals(1, e.usedToday())
            assertNull(e.consider(ScreenContext("com.android.chrome", "Chrome", longText + "x")), "min gap")
            clock += 3 * 60_000
            assertNull(e.consider(ScreenContext("com.android.chrome", "Chrome", longText + "y")), "per-app cooldown")
            assertEquals(1, s.requests.size, "gates cost zero network calls")
            clock += 20 * 60_000
            assertNotNull(e.consider(ScreenContext("com.android.chrome", "Chrome", longText + "z")))
        }
    }

    @Test fun silenceIsTheDefault() = FakeServer(models) { _, _ -> Reply(content = """{"speak":false}""") }.use { s ->
        assertNull(engine(s).consider(ScreenContext("com.instagram.android", "Instagram", longText)))
        val e = engine(null)
        assertNull(e.parse("{\"speak\":true,\"message\":\"\"}", "x")); assertNull(e.parse("rambling without json", "x"))
    }

    @Test fun twoDismissalsMuteAnAppForADayAcceptingRelaxesIt() = FakeServer(models) { _, _ -> Reply(content = "{}") }.use { s ->
        var clock = 1_000_000L; val store = MemoryStore(); val e = engine(s, store, t = { clock })
        e.outcome("com.news", false); assertEquals(0L, e.suppressedUntil("com.news"))
        e.outcome("com.news", false); assertTrue(e.suppressedUntil("com.news") > clock + 20 * 3600_000L)
        assertTrue(e.gate(ScreenContext("com.news", "News", longText)) is Gate.Deny)
        e.outcome("com.mail", false); e.outcome("com.mail", true); e.outcome("com.mail", false)
        assertEquals(0L, e.suppressedUntil("com.mail"), "an accept resets the dismissal streak")
    }

    @Test fun dailyBudgetIsEnforced() = FakeServer(models) { _, _ -> Reply(content = """{"speak":false}""") }.use { s ->
        var clock = 1_000_000L; val e = engine(s, policy = ProactivePolicy(dailyBudget = 2, appCooldownMs = 0, minGapMs = 0), t = { clock })
        repeat(2) { clock += 10; e.consider(ScreenContext("a.b$it", "A", longText + it)) }
        assertEquals(2, e.usedToday())
        assertEquals(Gate.Deny("daily budget"), e.gate(ScreenContext("a.c", "A", longText + "new")))
    }
}
