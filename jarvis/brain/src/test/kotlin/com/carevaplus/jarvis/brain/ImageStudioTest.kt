package com.carevaplus.jarvis.brain

import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ImageStudioTest {
    private fun server(safe: Boolean?, genCode: Int = 200): Pair<HttpServer, String> {
        val s = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        s.createContext("/models") { ex -> val b = ByteArray(500) { 7 }; if (genCode == 200) { ex.sendResponseHeaders(200, b.size.toLong()); ex.responseBody.use { it.write(b) } } else { ex.sendResponseHeaders(genCode, -1); ex.close() } }
        s.createContext("/check") { ex ->
            if (safe == null) { ex.sendResponseHeaders(500, -1); ex.close() } else {
                val b = """{"safe":$safe,"label":"${if (safe) "neutral" else "high"}"}""".toByteArray(); ex.sendResponseHeaders(200, b.size.toLong()); ex.responseBody.use { it.write(b) }
            }
        }
        s.start(); return s to "http://127.0.0.1:${s.address.port}"
    }
    private fun studio(u: String) = ImageStudio { ImageConfig("tok", "m", "$u/models", u, "") }

    @Test fun safeImageIsReturned() { val (s, u) = server(true); try { assertTrue(studio(u).generate("a cat") is ImageResult.Ok) } finally { s.stop(0) } }
    @Test fun flaggedImageIsBlocked() { val (s, u) = server(false); try { assertEquals("high", (studio(u).generate("x") as ImageResult.Blocked).label) } finally { s.stop(0) } }
    @Test fun failsClosedWhenCheckerDown() { val (s, u) = server(null); try { assertTrue(studio(u).generate("x") is ImageResult.Failed) } finally { s.stop(0) } }
    @Test fun generationErrorReported() { val (s, u) = server(true, 429); try { assertTrue(studio(u).generate("x") is ImageResult.Failed) } finally { s.stop(0) } }
    @Test fun needsConfig() { assertTrue(ImageStudio { ImageConfig() }.generate("x") is ImageResult.Failed) }
    @Test fun intentDetection() {
        assertTrue(ImageStudio.isImageRequest("Draw me a logo for my cafe")); assertTrue(ImageStudio.isImageRequest("generate an image of a mountain"))
        assertTrue(!ImageStudio.isImageRequest("what's the capital of France")); assertTrue(!ImageStudio.isImageRequest("create a plan for my week"))
    }
}
