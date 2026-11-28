package com.carevaplus.jarvis.brain

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class WakePhraseTest {
    @Test fun bare() = assertEquals("", WakePhrase.match("hey Jarvis"))
    @Test fun withCommand() = assertEquals("what's the weather", WakePhrase.match("Hey Jarvis, what's the weather"))
    @Test fun misheard() = assertEquals("", WakePhrase.match("okay travis"))
    @Test fun justName() = assertEquals("open maps", WakePhrase.match("jarvis open maps"))
    @Test fun otherSpeechIgnored() { assertNull(WakePhrase.match("I met Travis yesterday")); assertNull(WakePhrase.match("what time is it")) }
}
