package com.carevaplus.jarvis.brain

/** Tiny key-value persistence. Android backs this with encrypted prefs; tests use memory. */
interface Store {
    fun get(key: String): String?
    fun put(key: String, value: String)
    fun remove(key: String)
}

class MemoryStore : Store {
    private val m = HashMap<String, String>()
    @Synchronized override fun get(key: String) = m[key]
    @Synchronized override fun put(key: String, value: String) { m[key] = value }
    @Synchronized override fun remove(key: String) { m.remove(key) }
}
