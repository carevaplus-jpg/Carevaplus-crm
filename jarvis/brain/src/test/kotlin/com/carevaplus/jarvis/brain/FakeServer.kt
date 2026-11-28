package com.carevaplus.jarvis.brain

import com.sun.net.httpserver.HttpServer
import org.json.JSONArray
import org.json.JSONObject
import java.net.InetSocketAddress
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors

data class Reply(val status: Int = 200, val content: String = "", val delayMs: Long = 0)

/** A tiny OpenAI-compatible server so the tests exercise the real HTTP client. */
class FakeServer(private val modelList: List<String> = emptyList(), private val handler: (model: String, body: JSONObject) -> Reply) : AutoCloseable {
    val requests = CopyOnWriteArrayList<JSONObject>()
    private val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).apply {
        executor = Executors.newFixedThreadPool(8)
        createContext("/v1/models") { ex ->
            val arr = JSONArray(); modelList.forEach { arr.put(JSONObject().put("id", it)) }
            val b = JSONObject().put("data", arr).toString().toByteArray()
            ex.sendResponseHeaders(200, b.size.toLong()); ex.responseBody.use { it.write(b) }
        }
        createContext("/v1/chat/completions") { ex ->
            val body = JSONObject(ex.requestBody.readBytes().decodeToString())
            requests += body
            val r = handler(body.getString("model"), body)
            if (r.delayMs > 0) Thread.sleep(r.delayMs)
            if (r.status != 200) {
                val b = JSONObject().put("error", JSONObject().put("message", r.content.ifBlank { "error ${r.status}" })).toString().toByteArray()
                ex.sendResponseHeaders(r.status, b.size.toLong()); ex.responseBody.use { it.write(b) }
            } else if (body.optBoolean("stream")) {
                ex.responseHeaders.add("Content-Type", "text/event-stream"); ex.sendResponseHeaders(200, 0)
                ex.responseBody.use { out ->
                    r.content.chunked(6).forEach { out.write("data: ${JSONObject().put("choices", JSONArray().put(JSONObject().put("delta", JSONObject().put("content", it)))) }\n\n".toByteArray()) }
                    out.write("data: ${JSONObject().put("choices", JSONArray()).put("usage", JSONObject().put("completion_tokens", r.content.length / 4 + 1))}\n\n".toByteArray())
                    out.write("data: [DONE]\n\n".toByteArray())
                }
            } else {
                val msg = JSONObject().put("content", r.content)
                val b = JSONObject().put("choices", JSONArray().put(JSONObject().put("message", msg))).put("usage", JSONObject().put("completion_tokens", 7)).toString().toByteArray()
                ex.sendResponseHeaders(200, b.size.toLong()); ex.responseBody.use { it.write(b) }
            }
        }
        start()
    }
    val url get() = "http://127.0.0.1:${server.address.port}/v1"
    fun provider(id: String = Provider.DEEPSEEK) = Provider(id, id, url, "test-key")
    fun userMessages() = requests.map { r -> r.getJSONArray("messages").let { a -> a.getJSONObject(a.length() - 1).optString("content") } }
    override fun close() = server.stop(0)
}
