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
    /** A generated picture (its web address), for image replies. */
    val image: String = "",
) {
    val isUser get() = role == "user"
}

data class Chat(
    val id: String = UUID.randomUUID().toString(),
    val title: String = "New chat",
    val messages: List<Msg> = emptyList(),
    val updated: Long = System.currentTimeMillis(),
    /** The custom agent this chat talks to, or null for the normal assistant. */
    val agentId: String? = null,
)

/** A custom assistant the user made: a name, an emoji and its own instructions. */
data class Agent(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val emoji: String = "🤖",
    val instructions: String,
    val updated: Long = System.currentTimeMillis(),
)

/** Ready-made agents the user can add with one tap. */
object AgentTemplates {
    val all = listOf(
        Agent(name = "Care Writer", emoji = "✍️", instructions = "You write warm, clear, professional messages for Careva+ home health care: messages to patients' families, visit confirmations, reminders and thank-you notes. Keep them short and kind. Offer an English and a Tamil version when helpful."),
        Agent(name = "Shift Planner", emoji = "🗓️", instructions = "You plan nurse and caretaker schedules. Ask for the number of staff, patients, visit frequency and constraints if missing, then give a clear table-like schedule, balanced workload and travel-friendly order."),
        Agent(name = "Tamil Translator", emoji = "🌐", instructions = "Translate between English and Tamil. Give natural, polite Tamil suitable for patients and families, then a short note on any words that have no direct translation."),
        Agent(name = "Health Explainer", emoji = "🩺", instructions = "Explain health topics in simple words for patients and families. Give general information only, never a diagnosis or dosage changes, and always advise consulting the doctor; in an emergency tell them to call 108."),
        Agent(name = "Code Helper", emoji = "💻", instructions = "You are an expert programmer. Write correct, simple code with short explanations, and point out bugs or edge cases."),
    )
}

/** Converts messages to and from JSON, for the file on the phone and for the cloud. */
object ChatJson {
    fun messages(ms: JSONArray): List<Msg> = (0 until ms.length()).map { j ->
        val m = ms.getJSONObject(j)
        Msg(m.getString("role"), m.getString("text"), m.optString("thought"), m.optString("model"), m.optString("effort"), m.optInt("seconds"), m.optString("stats"), m.optString("image"))
    }

    fun messages(ms: List<Msg>) = JSONArray().apply {
        ms.forEach { m ->
            put(JSONObject().put("role", m.role).put("text", m.text).put("thought", m.thought)
                .put("model", m.model).put("effort", m.effort).put("seconds", m.seconds).put("stats", m.stats).put("image", m.image))
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
                    agentId = o.optString("agent").ifEmpty { null },
                )
            }.sortedByDescending { it.updated }
        }
    } catch (_: Exception) { emptyList() }

    fun save(chats: List<Chat>) {
        val arr = JSONArray()
        chats.filter { it.messages.isNotEmpty() }.forEach { c ->
            arr.put(JSONObject().put("id", c.id).put("title", c.title).put("updated", c.updated).put("messages", ChatJson.messages(c.messages))
                .put("agent", c.agentId ?: ""))
        }
        write(file, arr.toString())
    }

    fun loadDeleted(): Map<String, Long> = try {
        if (!deletedFile.exists()) emptyMap() else JSONObject(deletedFile.readText()).let { o -> o.keys().asSequence().associateWith { o.getLong(it) } }
    } catch (_: Exception) { emptyMap() }

    fun saveDeleted(deleted: Map<String, Long>) = write(deletedFile, JSONObject(deleted).toString())

    private val agentsFile = File(ctx.filesDir, "agents.json")

    fun loadAgents(): List<Agent> = try {
        if (!agentsFile.exists()) emptyList() else JSONArray(agentsFile.readText()).let { a ->
            (0 until a.length()).map { i -> a.getJSONObject(i).let { Agent(it.getString("id"), it.getString("name"), it.optString("emoji", "🤖"), it.optString("instructions"), it.optLong("updated")) } }
        }
    } catch (_: Exception) { emptyList() }

    fun saveAgents(agents: List<Agent>) = write(agentsFile, JSONArray().apply {
        agents.forEach { put(JSONObject().put("id", it.id).put("name", it.name).put("emoji", it.emoji).put("instructions", it.instructions).put("updated", it.updated)) }
    }.toString())

    /** Forgets everything on this phone (used when signing out). */
    fun clear() { file.delete(); deletedFile.delete(); agentsFile.delete() }

    private fun write(f: File, text: String) {
        val tmp = File(f.parentFile, f.name + ".tmp")
        tmp.writeText(text)
        tmp.renameTo(f)
    }
}

object Prompt {
    /** The system prompt, with a custom agent's instructions on top when the chat uses one. */
    fun system(cloud: Boolean = false, agent: Agent? = null) = (if (agent != null)
        "You are \"${agent.name}\", a custom assistant inside Careva+ AI. Follow these instructions from the user who made you:\n${agent.instructions}\n\nGeneral rules:\n" else "") + base(cloud)

    private fun base(cloud: Boolean) = """You are Careva+ AI, a friendly and professional assistant made by Careva+, a home health care service. ${if (cloud) "You run on the Careva+ cloud." else "You run privately on the user's phone."}
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
    fun cloudMessages(history: List<Msg>, userText: String, agent: Agent? = null, chars: Int = 60_000): List<Pair<String, String>> {
        var budget = chars - userText.length
        val kept = ArrayList<Msg>()
        for (m in history.asReversed()) { budget -= m.text.length; if (budget < 0) break; kept.add(m) }
        if (kept.isNotEmpty() && !kept.last().isUser) kept.removeAt(kept.lastIndex)
        return listOf("system" to system(cloud = true, agent = agent)) + kept.asReversed().filter { it.image.isEmpty() }.map { (if (it.isUser) "user" else "assistant") to it.text } + ("user" to userText)
    }

    private val special = Regex("<\\|(im_end|im_start|endoftext)\\|>|<end_of_turn>|<start_of_turn>(model|user)?")
    fun clean(text: String) = text.replace(special, "").trim()
}
