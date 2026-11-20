package com.carevaplus.ai

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import com.google.ai.edge.litertlm.Message as LmMessage

data class Msg(
    val role: String,
    val text: String,
    val thought: String = "",
    val model: String = "",
    val effort: String = "",
    val seconds: Int = 0,
    /** For example "142 words · 16 words/s · GPU". */
    val stats: String = "",
) {
    val isUser get() = role == "user"
}

data class Chat(
    val id: String = UUID.randomUUID().toString(),
    val title: String = "New chat",
    val messages: List<Msg> = emptyList(),
    val updated: Long = System.currentTimeMillis(),
)

/** Converts messages to and from JSON, for the file on the phone and for the cloud. */
object ChatJson {
    fun messages(ms: JSONArray): List<Msg> = (0 until ms.length()).map { j ->
        val m = ms.getJSONObject(j)
        Msg(m.getString("role"), m.getString("text"), m.optString("thought"), m.optString("model"), m.optString("effort"), m.optInt("seconds"), m.optString("stats"))
    }

    fun messages(ms: List<Msg>) = JSONArray().apply {
        ms.forEach { m ->
            put(JSONObject().put("role", m.role).put("text", m.text).put("thought", m.thought)
                .put("model", m.model).put("effort", m.effort).put("seconds", m.seconds).put("stats", m.stats))
        }
    }
}

/**
 * Saves conversations as JSON in the app's private storage, plus a list of deleted chats (id to time) so that
 * deletions also reach the user's other phones when cloud sync is on.
 */
class ChatStore(ctx: Context) {
    private val file = File(ctx.filesDir, "chats.json")
    private val deletedFile = File(ctx.filesDir, "deleted.json")

    fun load(): List<Chat> = try {
        if (!file.exists()) emptyList() else {
            val arr = JSONArray(file.readText())
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                Chat(
                    id = o.getString("id"),
                    title = o.optString("title", "Chat"),
                    updated = o.optLong("updated"),
                    messages = ChatJson.messages(o.getJSONArray("messages")),
                )
            }.sortedByDescending { it.updated }
        }
    } catch (_: Exception) { emptyList() }

    fun save(chats: List<Chat>) {
        val arr = JSONArray()
        chats.filter { it.messages.isNotEmpty() }.forEach { c ->
            arr.put(JSONObject().put("id", c.id).put("title", c.title).put("updated", c.updated).put("messages", ChatJson.messages(c.messages)))
        }
        write(file, arr.toString())
    }

    fun loadDeleted(): Map<String, Long> = try {
        if (!deletedFile.exists()) emptyMap() else JSONObject(deletedFile.readText()).let { o -> o.keys().asSequence().associateWith { o.getLong(it) } }
    } catch (_: Exception) { emptyMap() }

    fun saveDeleted(deleted: Map<String, Long>) = write(deletedFile, JSONObject(deleted).toString())

    /** Forgets everything on this phone (used when signing out). */
    fun clear() { file.delete(); deletedFile.delete() }

    private fun write(f: File, text: String) {
        val tmp = File(f.parentFile, f.name + ".tmp")
        tmp.writeText(text)
        tmp.renameTo(f)
    }
}

object Prompt {
    fun system(cloud: Boolean = false) = """You are Careva+ AI, a friendly and professional assistant made by Careva+, a home health care service. ${if (cloud) "You run on the Careva+ cloud." else "You run privately on the user's phone."}
- Answer clearly and concisely. Use short paragraphs, bullet points or code blocks when helpful.
- Reply in the same language the user writes in (English or Tamil).
- If you are not sure about something, say so instead of guessing.
- You are not a doctor. For medical questions give general information only and advise consulting a doctor; in an emergency tell the user to call 108 or go to the nearest hospital."""

    /** Earlier turns to seed a fresh model conversation with, newest kept, within about half the context window. */
    fun seed(history: List<Msg>, model: AiModel): List<LmMessage> {
        var budget = model.contextTokens / 2 * 3 // rough characters
        val kept = ArrayList<Msg>()
        for (m in history.asReversed()) {
            budget -= m.text.length
            if (budget < 0) break
            kept.add(m)
        }
        if (kept.isNotEmpty() && !kept.last().isUser) kept.removeAt(kept.lastIndex) // start with a user turn
        return kept.asReversed().map { if (it.isUser) LmMessage.user(it.text) else LmMessage.model(it.text) }
    }

    /** The chat for a cloud model: system prompt plus the newest turns that fit in about [chars] characters. */
    fun cloudMessages(history: List<Msg>, userText: String, chars: Int = 60_000): List<Pair<String, String>> {
        var budget = chars - userText.length
        val kept = ArrayList<Msg>()
        for (m in history.asReversed()) { budget -= m.text.length; if (budget < 0) break; kept.add(m) }
        if (kept.isNotEmpty() && !kept.last().isUser) kept.removeAt(kept.lastIndex)
        return listOf("system" to system(cloud = true)) + kept.asReversed().map { (if (it.isUser) "user" else "assistant") to it.text } + ("user" to userText)
    }

    private val special = Regex("<\\|(im_end|im_start|endoftext)\\|>|<end_of_turn>|<start_of_turn>(model|user)?")
    fun clean(text: String) = text.replace(special, "").trim()
}
