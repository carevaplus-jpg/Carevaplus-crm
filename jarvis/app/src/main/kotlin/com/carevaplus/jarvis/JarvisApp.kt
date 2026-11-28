package com.carevaplus.jarvis

import android.app.Application
import com.carevaplus.jarvis.brain.Jarvis
import com.carevaplus.jarvis.brain.LlmClient
import com.carevaplus.jarvis.brain.Memory
import com.carevaplus.jarvis.brain.ModelRouter
import com.carevaplus.jarvis.brain.ProactiveEngine
import com.carevaplus.jarvis.brain.Store
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

class JarvisApp : Application() {
    override fun onCreate() {
        super.onCreate()
        graph = Graph(this)
    }
    companion object { lateinit var graph: Graph; private set }
}

/** The single, shared brain. The overlay, the accessibility service and the app all use the same instance. */
class Graph(app: Application) {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val store: Store = SecureStore(app)
    val settings = Settings(store)
    val client = LlmClient()
    val router = ModelRouter(store, client)
    val memory = Memory(store)
    @Volatile var voiceReplies = settings.speakReplies
    val jarvis = Jarvis(router, client, memory, { settings.providers() }, { voiceReplies })
    /** Latest generated image (already passed the safety check). Shown in the Chat tab. */
    /** Shared voice for the in-app Chat tab and the voice test. */
    val voice by lazy { com.carevaplus.jarvis.voice.SpeechIO(app, { settings.voiceLang }, { settings.deepVoice }) }
    @Volatile var lastImage: ByteArray? = null
    init { jarvis.imageStudio = com.carevaplus.jarvis.brain.ImageStudio { settings.imageConfig() } }
    val proactive = ProactiveEngine(router, client, memory, store, { settings.providers() }, { settings.policy() })

    /** Only attach screen text when the request is about the screen. Everything else stays private. */
    fun wantsScreen(text: String) = Regex("\\b(screen|this|these|here|reply|respond|summari[sz]e|translate|what('s| is) (on|this)|read (this|it)|explain (this|it)|look)\\b", RegexOption.IGNORE_CASE).containsMatchIn(text)
}
