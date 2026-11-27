package com.carevaplus.jarvis

import com.carevaplus.jarvis.brain.ProactivePolicy
import com.carevaplus.jarvis.brain.Provider
import com.carevaplus.jarvis.brain.Store

/** User preferences. Backed by the same encrypted store as the keys. */
class Settings(private val s: Store) {
    var openRouterKey: String get() = s.get("key.openrouter").orEmpty(); set(v) = s.put("key.openrouter", v.trim())
    var deepSeekKey: String get() = s.get("key.deepseek").orEmpty(); set(v) = s.put("key.deepseek", v.trim())
    var nvidiaKey: String get() = s.get("key.nvidia").orEmpty(); set(v) = s.put("key.nvidia", v.trim())

    var hfToken: String get() = s.get("key.hf").orEmpty(); set(v) = s.put("key.hf", v.trim())
    var safetyUrl: String get() = s.get("safety.url").orEmpty(); set(v) = s.put("safety.url", v.trim())
    var safetyToken: String get() = s.get("safety.token").orEmpty(); set(v) = s.put("safety.token", v.trim())
    fun imageConfig() = com.carevaplus.jarvis.brain.ImageConfig(hfToken = hfToken, spaceUrl = safetyUrl, spaceToken = safetyToken)

    private fun bool(k: String, d: Boolean) = s.get(k)?.toBooleanStrictOrNull() ?: d
    private fun int(k: String, d: Int) = s.get(k)?.toIntOrNull() ?: d

    var proactive: Boolean get() = bool("proactive", false); set(v) = s.put("proactive", v.toString())
    var speakReplies: Boolean get() = bool("speak", true); set(v) = s.put("speak", v.toString())
    var dailyBudget: Int get() = int("budget", 12); set(v) = s.put("budget", v.toString())
    var quietStart: Int get() = int("quiet.start", 23); set(v) = s.put("quiet.start", v.toString())
    var quietEnd: Int get() = int("quiet.end", 7); set(v) = s.put("quiet.end", v.toString())
    var deepVoice: Boolean get() = bool("voice.deep", true); set(v) = s.put("voice.deep", v.toString())
    var voiceLang: String get() = s.get("voice.lang").orEmpty(); set(v) = s.put("voice.lang", v)
    var orbSide: Int get() = int("orb.side", 1); set(v) = s.put("orb.side", v.toString())
    var orbY: Int get() = int("orb.y", 600); set(v) = s.put("orb.y", v.toString())
    var blockedApps: Set<String> get() = s.get("blocked").orEmpty().split(',').filter { it.isNotBlank() }.toSet(); set(v) = s.put("blocked", v.joinToString(","))

    fun providers(): List<Provider> = listOf(
        Provider.deepSeek(deepSeekKey), Provider.nvidia(nvidiaKey), Provider.openRouter(openRouterKey),
    ).filter { it.key.isNotBlank() }

    fun policy() = ProactivePolicy(enabled = proactive, dailyBudget = dailyBudget, quietStartHour = quietStart, quietEndHour = quietEnd, extraBlocked = blockedApps)
}
