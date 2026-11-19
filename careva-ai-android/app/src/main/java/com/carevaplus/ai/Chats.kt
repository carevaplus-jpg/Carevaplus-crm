package com.carevaplus.ai

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

data class Msg(val role: String, val text: String) {
    val isUser get() = role == "user"
}

data class Chat(
    val id: String = UUID.randomUUID().toString(),
    val title: String = "New chat",
    val messages: List<Msg> = emptyList(),
    val updated: Long = System.currentTimeMillis(),
)

/** Saves conversations as JSON in the app's private storage. Nothing is uploaded anywhere. */
class ChatStore(ctx: Context) {
    private val file = File(ctx.filesDir, "chats.json")

    fun load(): List<Chat> = try {
        if (!file.exists()) emptyList() else {
            val arr = JSONArray(file.readText())
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                val ms = o.getJSONArray("messages")
                Chat(
                    id = o.getString("id"),
                    title = o.optString("title", "Chat"),
                    updated = o.optLong("updated"),
                    messages = (0 until ms.length()).map { j ->
                        val m = ms.getJSONObject(j); Msg(m.getString("role"), m.getString("text"))
                    },
                )
            }.sortedByDescending { it.updated }
        }
    } catch (_: Exception) { emptyList() }

    fun save(chats: List<Chat>) {
        val arr = JSONArray()
        chats.filter { it.messages.isNotEmpty() }.forEach { c ->
            arr.put(JSONObject().apply {
                put("id", c.id); put("title", c.title); put("updated", c.updated)
                put("messages", JSONArray().apply {
                    c.messages.forEach { m -> put(JSONObject().put("role", m.role).put("text", m.text)) }
                })
            })
        }
        val tmp = File(file.parentFile, "chats.json.tmp")
        tmp.writeText(arr.toString())
        tmp.renameTo(file)
    }
}

/** Formats a conversation in Qwen's chat format and keeps it inside the model's context window. */
object PromptBuilder {
    const val SYSTEM = """You are Careva+ AI, a friendly and professional assistant made by Careva+, a home health care service. You run privately on the user's phone.
- Answer clearly and concisely. Use short paragraphs or bullet points when helpful.
- Reply in the same language the user writes in (English or Tamil).
- If you are not sure about something, say so instead of guessing.
- You are not a doctor. For medical questions give general information only, and tell the user to consult a doctor; in an emergency tell them to call 108 or go to the nearest hospital."""

    private const val INPUT_BUDGET = 3000 // tokens; the rest of the 4096 window is left for the reply

    private fun turn(role: String, text: String) = "<|im_start|>$role\n$text<|im_end|>\n"

    fun build(messages: List<Msg>, count: (String) -> Int): String {
        val head = turn("system", SYSTEM)
        var history = messages
        while (true) {
            val body = history.joinToString("") { turn(if (it.isUser) "user" else "assistant", it.text) }
            val prompt = head + body + "<|im_start|>assistant\n"
            if (history.size <= 1 || count(prompt) <= INPUT_BUDGET) {
                return if (history.size == 1 && count(prompt) > INPUT_BUDGET) {
                    // A single very long message: keep its end.
                    val last = history.last()
                    head + turn("user", last.text.takeLast(INPUT_BUDGET * 2)) + "<|im_start|>assistant\n"
                } else prompt
            }
            history = history.drop(if (history.size >= 3) 2 else 1) // drop the oldest exchange
        }
    }

    private val special = Regex("<\\|(im_end|im_start|endoftext)\\|>")
    fun clean(text: String): String = text.replace(special, "").replace(Regex("^assistant\\n"), "").trim()
}
