package com.carevaplus.jarvis.brain

/** Detects "Hey Jarvis" in recogniser output. Returns what was said after it ("" if nothing), or null if no wake phrase. */
object WakePhrase {
    private val RE = Regex("""\b(?:(?:hey|hi|hello|ok|okay|yo)\s+(?:jarvis|jarvas|jarves|jervis|travis|service)|jarvis)\b[\s,.!?:;-]*(.*)""", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
    fun match(text: String): String? = RE.find(text.take(400))?.groupValues?.get(1)?.trim()
}
