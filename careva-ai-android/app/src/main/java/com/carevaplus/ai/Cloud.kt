package com.carevaplus.ai

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Careva+ cloud account: sign in with email and password, and keep chats in sync between phones.
 * Uses the Careva+ Supabase project (Auth plus the `ai_chats` table, where each person can only read and
 * write their own rows). Only chats are synced; the AI itself still runs on each phone.
 */
object CloudConfig {
    const val URL = "https://prjedhzcrrboyhewvcar.supabase.co"
    /** Public key: safe to ship in the app. Access to data is decided by the signed-in user and row-level security. */
    const val KEY = "sb_publishable_GSX6LQ_mVVtDaEaagS_fig_Dpa-FE2I"
}

class CloudError(message: String) : IOException(message)

data class Session(val accessToken: String, val refreshToken: String, val expiresAt: Long, val userId: String, val email: String)

/** Result of creating an account: either signed in straight away, or a confirmation email was sent. */
sealed interface SignUpResult {
    data class SignedIn(val session: Session) : SignUpResult
    data object CheckEmail : SignUpResult
}

class Cloud(ctx: Context) {
    private val prefs = ctx.getSharedPreferences("account", Context.MODE_PRIVATE)

    var session: Session? = load(); private set

    private fun load(): Session? {
        val at = prefs.getString("access", null) ?: return null
        return Session(at, prefs.getString("refresh", "")!!, prefs.getLong("expires", 0), prefs.getString("user", "")!!, prefs.getString("email", "")!!)
    }

    private fun store(s: Session?) {
        session = s
        prefs.edit().apply {
            if (s == null) clear()
            else putString("access", s.accessToken).putString("refresh", s.refreshToken).putLong("expires", s.expiresAt)
                .putString("user", s.userId).putString("email", s.email)
        }.apply()
    }

    // ---- HTTP ----

    private fun call(method: String, path: String, body: String? = null, token: String? = null, headers: Map<String, String> = emptyMap()): String {
        val c = URL(CloudConfig.URL + path).openConnection() as HttpURLConnection
        try {
            c.requestMethod = method
            c.connectTimeout = 15_000; c.readTimeout = 30_000
            c.setRequestProperty("apikey", CloudConfig.KEY)
            c.setRequestProperty("Accept", "application/json")
            if (token != null) c.setRequestProperty("Authorization", "Bearer $token")
            headers.forEach { (k, v) -> c.setRequestProperty(k, v) }
            if (body != null) {
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json")
                c.outputStream.use { it.write(body.toByteArray()) }
            }
            val code = c.responseCode
            val text = (if (code < 400) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code >= 400) throw CloudError(friendly(code, text))
            return text
        } catch (e: CloudError) { throw e
        } catch (e: IOException) { throw CloudError("No connection to the Careva+ cloud. Check your internet and try again.")
        } finally { c.disconnect() }
    }

    private fun friendly(code: Int, body: String): String {
        val o = try { JSONObject(body) } catch (_: Exception) { JSONObject() }
        val err = o.optString("error_code").ifEmpty { o.optString("error") }
        val msg = listOf("msg", "message", "error_description").map { o.optString(it) }.firstOrNull { it.isNotEmpty() }.orEmpty()
        return when {
            err == "invalid_credentials" || msg.contains("Invalid login", true) -> "Wrong email or password."
            err == "email_not_confirmed" || msg.contains("not confirmed", true) -> "Please confirm your email first: open the link we sent you, then sign in."
            err == "user_already_exists" || msg.contains("already registered", true) -> "An account with this email already exists. Sign in instead."
            err == "weak_password" || msg.contains("password", true) && msg.contains("character", true) -> "Choose a stronger password (at least 6 characters)."
            err == "over_email_send_rate_limit" || code == 429 -> "Too many emails were sent just now. Please wait a few minutes and try again."
            err == "email_address_invalid" || msg.contains("invalid", true) && msg.contains("email", true) -> "That email address doesn't look right."
            msg.isNotEmpty() -> msg
            else -> "Cloud error ($code). Please try again."
        }
    }

    private fun sessionFrom(o: JSONObject): Session {
        val user = o.getJSONObject("user")
        val expiresIn = o.optLong("expires_in", 3600)
        return Session(o.getString("access_token"), o.getString("refresh_token"),
            System.currentTimeMillis() + expiresIn * 1000, user.getString("id"), user.optString("email"))
    }

    // ---- account ----

    fun signIn(email: String, password: String): Session {
        val body = JSONObject().put("email", email.trim()).put("password", password).toString()
        return sessionFrom(JSONObject(call("POST", "/auth/v1/token?grant_type=password", body))).also(::store)
    }

    fun signUp(email: String, password: String): SignUpResult {
        val body = JSONObject().put("email", email.trim()).put("password", password)
            .put("data", JSONObject().put("app", "careva-ai")).toString()
        val o = JSONObject(call("POST", "/auth/v1/signup", body))
        return if (o.has("access_token")) SignUpResult.SignedIn(sessionFrom(o).also(::store)) else SignUpResult.CheckEmail
    }

    /** Sends the confirmation email again, for accounts that were created but not confirmed yet. */
    fun resendConfirmation(email: String) {
        call("POST", "/auth/v1/resend", JSONObject().put("type", "signup").put("email", email.trim()).toString())
    }

    fun signOut() {
        val s = session
        store(null)
        if (s != null) try { call("POST", "/auth/v1/logout", "{}", s.accessToken) } catch (_: Exception) {}
    }

    /** A valid access token, refreshing it when it is about to expire. */
    private fun token(): String {
        val s = session ?: throw CloudError("Not signed in.")
        if (s.expiresAt - System.currentTimeMillis() > 60_000) return s.accessToken
        return try {
            val o = JSONObject(call("POST", "/auth/v1/token?grant_type=refresh_token", JSONObject().put("refresh_token", s.refreshToken).toString()))
            sessionFrom(o).also(::store).accessToken
        } catch (e: CloudError) {
            if (e.message?.contains("connection") == true) throw e
            store(null); throw CloudError("Your sign-in has expired. Please sign in again.")
        }
    }

    // ---- cloud models ----

    @Volatile private var chatConnection: HttpURLConnection? = null
    @Volatile private var stopped = false

    /**
     * Streams a reply from a cloud model. Calls [onThought] and [onText] as pieces arrive and returns the name of
     * the model that answered. Blocking: call off the main thread. [stopChat] ends it early.
     */
    fun chat(model: String, effort: Effort, messages: List<Pair<String, String>>, onThought: (String) -> Unit, onText: (String) -> Unit,
             onStep: (String) -> Unit = {}): String {
        val body = JSONObject().put("model", model).put("effort", effort.name)
            .apply { if (effort == Effort.ULTRA) put("mode", "team") } // a team of agents works on it
            .put("messages", JSONArray().apply { messages.forEach { (r, c) -> put(JSONObject().put("role", r).put("content", c)) } })
        val c = URL(CloudConfig.URL + "/functions/v1/careva-ai-chat").openConnection() as HttpURLConnection
        chatConnection = c; stopped = false
        try {
            c.requestMethod = "POST"; c.doOutput = true
            c.connectTimeout = 15_000; c.readTimeout = 120_000
            c.setRequestProperty("apikey", CloudConfig.KEY)
            c.setRequestProperty("Authorization", "Bearer ${token()}")
            c.setRequestProperty("Content-Type", "application/json")
            c.outputStream.use { it.write(body.toString().toByteArray()) }
            val code = c.responseCode
            if (code >= 400) {
                val text = c.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                throw CloudError(try { JSONObject(text).optString("error").ifEmpty { null } } catch (_: Exception) { null } ?: "Cloud error ($code). Please try again.")
            }
            var used = model
            c.inputStream.bufferedReader().useLines { lines ->
                for (line in lines) {
                    if (line.isBlank()) continue
                    val o = try { JSONObject(line) } catch (_: Exception) { continue }
                    o.optString("r").takeIf { it.isNotEmpty() }?.let(onThought)
                    o.optString("t").takeIf { it.isNotEmpty() }?.let(onText)
                    o.optString("step").takeIf { it.isNotEmpty() }?.let(onStep)
                    if (o.has("error")) throw CloudError(o.getString("error"))
                    if (o.optBoolean("done")) used = o.optString("model", model)
                }
            }
            return used
        } catch (e: CloudError) { throw e
        } catch (e: IOException) {
            if (stopped) throw kotlinx.coroutines.CancellationException("Stopped")
            throw CloudError("Lost the connection to the cloud model. Check your internet and try again.")
        } finally { chatConnection = null; c.disconnect() }
    }

    fun stopChat() { stopped = true; try { chatConnection?.disconnect() } catch (_: Exception) {} }

    // ---- image and video creation (Supabase function careva-ai-media) ----

    data class Media(val url: String, val model: String)
    sealed interface VideoState {
        data object Running : VideoState
        data class Done(val url: String, val model: String) : VideoState
        data class Failed(val error: String) : VideoState
    }

    /** Calls careva-ai-media; its errors come back as {"error": "..."} and are shown to the user as they are. */
    private fun media(method: String, query: String = "", body: JSONObject? = null): JSONObject {
        val c = URL(CloudConfig.URL + "/functions/v1/careva-ai-media" + query).openConnection() as HttpURLConnection
        try {
            c.requestMethod = method
            c.connectTimeout = 15_000; c.readTimeout = 150_000
            c.setRequestProperty("apikey", CloudConfig.KEY)
            c.setRequestProperty("Authorization", "Bearer ${token()}")
            if (body != null) {
                c.doOutput = true; c.setRequestProperty("Content-Type", "application/json")
                c.outputStream.use { it.write(body.toString().toByteArray()) }
            }
            val code = c.responseCode
            val text = (if (code < 400) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            val o = try { JSONObject(text) } catch (_: Exception) { JSONObject() }
            if (code >= 400) throw CloudError(o.optString("error").ifEmpty { "Couldn't reach the image and video service ($code). Please try again." })
            return o
        } catch (e: CloudError) { throw e
        } catch (e: IOException) { throw CloudError("No connection to the Careva+ cloud. Check your internet and try again.")
        } finally { c.disconnect() }
    }

    /** Makes an image; [best] uses the strongest model the account can pay for (falls back to free ones). Blocking. */
    fun createImage(prompt: String, best: Boolean): Media {
        val o = media("POST", body = JSONObject().put("kind", "image").put("prompt", prompt).put("quality", if (best) "best" else "fast"))
        return Media(o.getString("url"), o.optString("model", "Image model"))
    }

    /** Starts making a video; returns the job to pass to [videoStatus] and the model's name. Blocking. */
    fun startVideo(prompt: String, pro: Boolean): Pair<String, String> {
        val o = media("POST", body = JSONObject().put("kind", "video").put("prompt", prompt).put("quality", if (pro) "pro" else "standard").put("duration", 5))
        return o.getString("job") to o.optString("model", "Video model")
    }

    fun videoStatus(job: String): VideoState {
        val o = media("GET", query = "?job=" + java.net.URLEncoder.encode(job, "UTF-8"))
        return when (o.optString("status")) {
            "done" -> VideoState.Done(o.getString("url"), o.optString("model"))
            "failed" -> VideoState.Failed(o.optString("error", "The video couldn't be made. Please try again."))
            else -> VideoState.Running
        }
    }

    // ---- custom agents ----

    /** This account's custom agents in the cloud, each with whether it was deleted. */
    fun pullAgents(): List<Pair<Agent, Boolean>> {
        val arr = JSONArray(call("GET", "/rest/v1/ai_agents?select=id,name,emoji,instructions,updated,deleted", token = token()))
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            Agent(o.getString("id"), o.getString("name"), o.optString("emoji", "🤖"), o.optString("instructions"), o.getLong("updated")) to o.optBoolean("deleted")
        }
    }

    fun pushAgents(agents: List<Agent>, deleted: Map<String, Long>) {
        if (agents.isEmpty() && deleted.isEmpty()) return
        val uid = session?.userId ?: throw CloudError("Not signed in.")
        val rows = JSONArray()
        agents.forEach { rows.put(JSONObject().put("id", it.id).put("user_id", uid).put("name", it.name).put("emoji", it.emoji)
            .put("instructions", it.instructions).put("updated", it.updated).put("deleted", false)) }
        deleted.forEach { (id, at) -> rows.put(JSONObject().put("id", id).put("user_id", uid).put("name", "").put("emoji", "")
            .put("instructions", "").put("updated", at).put("deleted", true)) }
        call("POST", "/rest/v1/ai_agents?on_conflict=id", rows.toString(), token(), mapOf("Prefer" to "resolution=merge-duplicates,return=minimal"))
    }

    // ---- chats ----

    /** All of this account's chats in the cloud, including deleted ones (as tombstones). */
    fun pull(): List<RemoteChat> {
        val arr = JSONArray(call("GET", "/rest/v1/ai_chats?select=id,title,messages,updated,deleted,agent&order=updated.desc", token = token()))
        return (0 until arr.length()).map { i ->
            val o = arr.getJSONObject(i)
            RemoteChat(
                Chat(o.getString("id"), o.optString("title", "Chat"), ChatJson.messages(o.optJSONArray("messages") ?: JSONArray()), o.getLong("updated"),
                    agentId = o.optString("agent").takeIf { it.isNotEmpty() && it != "null" }),
                o.optBoolean("deleted"),
            )
        }
    }

    /** Uploads chats (and deletions), replacing the cloud copies. */
    fun push(chats: List<Chat>, deleted: Map<String, Long>) {
        if (chats.isEmpty() && deleted.isEmpty()) return
        val uid = session?.userId ?: throw CloudError("Not signed in.")
        val rows = JSONArray()
        chats.forEach { c ->
            rows.put(JSONObject().put("id", c.id).put("user_id", uid).put("title", c.title)
                .put("messages", ChatJson.messages(c.messages)).put("updated", c.updated).put("deleted", false)
                .put("agent", c.agentId ?: JSONObject.NULL))
        }
        deleted.forEach { (id, at) ->
            rows.put(JSONObject().put("id", id).put("user_id", uid).put("title", "").put("messages", JSONArray()).put("updated", at).put("deleted", true)
                .put("agent", JSONObject.NULL))
        }
        call("POST", "/rest/v1/ai_chats?on_conflict=id", rows.toString(), token(),
            mapOf("Prefer" to "resolution=merge-duplicates,return=minimal"))
    }
}

data class RemoteChat(val chat: Chat, val deleted: Boolean)

/** Merges this phone's chats with the cloud's: for each chat the newest version wins, and deletions win over older edits. */
object Sync {
    data class Result(val chats: List<Chat>, val upload: List<Chat>, val uploadDeleted: Map<String, Long>, val tombstones: Map<String, Long>)

    fun merge(local: List<Chat>, localDeleted: Map<String, Long>, remote: List<RemoteChat>): Result {
        val byId = LinkedHashMap<String, Chat>()
        local.forEach { byId[it.id] = it }
        val tombstones = HashMap(localDeleted)
        val upload = ArrayList<Chat>()
        val uploadDeleted = HashMap<String, Long>()
        val remoteIds = HashSet<String>()

        for (r in remote) {
            val id = r.chat.id
            remoteIds += id
            val mine = byId[id]
            val myDelete = tombstones[id]
            when {
                r.deleted -> {
                    if (mine != null && mine.updated > r.chat.updated) upload += mine // edited here after it was deleted elsewhere
                    else { byId.remove(id); tombstones[id] = maxOf(r.chat.updated, myDelete ?: 0) }
                }
                myDelete != null && myDelete >= r.chat.updated -> uploadDeleted[id] = myDelete
                mine == null -> { byId[id] = r.chat; tombstones.remove(id) }
                mine.updated > r.chat.updated -> upload += mine
                mine.updated < r.chat.updated -> byId[id] = r.chat
            }
        }
        // chats the cloud has never seen
        byId.values.filter { it.id !in remoteIds && it.messages.isNotEmpty() }.forEach { upload += it }
        tombstones.filter { it.key !in remoteIds }.forEach { uploadDeleted[it.key] = it.value }

        return Result(byId.values.filter { it.messages.isNotEmpty() }.sortedByDescending { it.updated }, upload, uploadDeleted, tombstones)
    }
}
