package com.carevaplus.jarvis.brain

import kotlin.test.Test
import kotlin.test.assertTrue

class ThinkerTest {
    private val chat = ModelInfo("deepseek", "deepseek-chat")
    private val reasoner = ModelInfo("deepseek", "deepseek-reasoner")
    @Test fun chatBeatsReasonerForEverydayRoles() {
        for (r in listOf(Role.CHAT, Role.PLAN, Role.FAST, Role.WRITE, Role.CODE)) assertTrue(Catalog.prior(chat, r) > Catalog.prior(reasoner, r), "role $r")
    }
    @Test fun reasonerStillWinsDeepReasoning() = assertTrue(Catalog.prior(reasoner, Role.REASON) > Catalog.prior(chat, Role.REASON))
}
