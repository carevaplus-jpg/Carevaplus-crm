package com.carevaplus.jarvis.brain

import org.json.JSONArray

/** What Jarvis has learned about you, kept on the device. Small on purpose: it's injected into prompts. */
class Memory(private val store: Store, private val max: Int = 60) {
    @Synchronized fun facts(): List<String> = runCatching { JSONArray(store.get("memory.facts") ?: "[]").strings() }.getOrDefault(emptyList())

    @Synchronized fun remember(fact: String) {
        val f = fact.trim().take(240)
        if (f.isBlank()) return
        val list = facts().filterNot { it.equals(f, true) } + f
        store.put("memory.facts", JSONArray(list.takeLast(max)).toString())
    }

    @Synchronized fun forget(fact: String) = store.put("memory.facts", JSONArray(facts().filterNot { it == fact }).toString())
    @Synchronized fun clear() = store.remove("memory.facts")

    fun asPrompt(): String = facts().takeLast(20).let { if (it.isEmpty()) "" else "Known about the user (use naturally, never recite):\n" + it.joinToString("\n") { f -> "- $f" } }
}
