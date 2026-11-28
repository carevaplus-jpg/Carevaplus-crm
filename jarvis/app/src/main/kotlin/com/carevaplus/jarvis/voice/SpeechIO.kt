package com.carevaplus.jarvis.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import java.util.Locale

/** Ears and voice. Recogniser and TTS are the phone's own, so audio never goes to us. Call on the main thread. */
class SpeechIO(private val ctx: Context, private val language: () -> String, private val deepMale: () -> Boolean = { true }) {
    /** Set to be told why speech failed (no engine, no voice data...). Called on any thread. */
    var onProblem: ((String) -> Unit)? = null
    interface Listener {
        fun onPartial(text: String)
        fun onFinal(text: String)
        fun onLevel(level: Float)
        fun onError(message: String)
        fun onListeningEnded()
    }

    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    var listening = false; private set

    val available get() = SpeechRecognizer.isRecognitionAvailable(ctx)

    fun listen(l: Listener) {
        if (!available) { l.onError("This phone has no speech recognition service."); return }
        stopListening()
        val r = SpeechRecognizer.createSpeechRecognizer(ctx)
        recognizer = r
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(p: Bundle?) { listening = true }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rms: Float) { l.onLevel(((rms + 2f) / 12f).coerceIn(0f, 1f)) }
            override fun onBufferReceived(b: ByteArray?) {}
            override fun onEndOfSpeech() { listening = false; l.onLevel(0f) }
            override fun onError(code: Int) {
                listening = false; l.onLevel(0f); l.onListeningEnded()
                when (code) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> l.onError("I didn't catch that.")
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> l.onError("Microphone permission is off. Allow it in Jarvis.")
                    SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> l.onError("Speech recognition needs a connection.")
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> {}
                    else -> l.onError("Speech recognition error ($code).")
                }
            }
            override fun onResults(res: Bundle?) {
                listening = false; l.onLevel(0f); l.onListeningEnded()
                res?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.takeIf { it.isNotBlank() }?.let(l::onFinal)
            }
            override fun onPartialResults(p: Bundle?) { p?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let(l::onPartial) }
            override fun onEvent(t: Int, p: Bundle?) {}
        })
        val lang = language().ifBlank { Locale.getDefault().toLanguageTag() }
        r.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, ctx.packageName)
        })
    }

    fun stopListening() { runCatching { recognizer?.cancel(); recognizer?.destroy() }; recognizer = null; listening = false }

    fun speak(text: String, onStart: () -> Unit, onPulse: (Float) -> Unit, onDone: () -> Unit) {
        val clean = text.replace(Regex("[*_`#>]+"), "").replace(Regex("\\[(.*?)]\\(.*?\\)"), "$1").replace(Regex("\\s+"), " ").trim().take(1800)
        if (clean.isBlank()) { onDone(); return }
        val go = {
            tts?.let { t ->
                t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(id: String?) { onStart() }
                    override fun onDone(id: String?) { onPulse(0f); onDone() }
                    override fun onStop(id: String?, interrupted: Boolean) { onPulse(0f); onDone() }
                    @Deprecated("deprecated") override fun onError(id: String?) { onPulse(0f); onDone() }
                    override fun onRangeStart(id: String?, start: Int, end: Int, frame: Int) { onPulse(0.55f + 0.45f * ((end - start) % 5) / 5f) }
                })
                val loc = Locale.forLanguageTag(language().ifBlank { Locale.getDefault().toLanguageTag() }).takeIf { t.isLanguageAvailable(it) >= TextToSpeech.LANG_AVAILABLE } ?: Locale.getDefault()
                t.language = loc
                if (deepMale()) { pickMale(t, loc)?.let { v -> runCatching { t.voice = v } }; t.setPitch(0.62f); t.setSpeechRate(0.92f) } else { t.setPitch(1f); t.setSpeechRate(1f) }
                if (t.speak(clean, TextToSpeech.QUEUE_FLUSH, null, "jarvis") != TextToSpeech.SUCCESS) { onProblem?.invoke("Couldn't speak. Check media volume and that Speech Services by Google is installed."); onDone() }
            }
        }
        if (ttsReady) go() else tts = TextToSpeech(ctx) { s -> if (s == TextToSpeech.SUCCESS) { ttsReady = true; go() } else { onProblem?.invoke("No text-to-speech engine found. Install \"Speech Services by Google\" from the Play Store, then set it as the default engine in Settings → Text-to-speech."); onDone() } }
    }

    /** Best-effort deep male voice: known Google male voice ids first, then anything the engine labels male. */
    private fun pickMale(t: TextToSpeech, loc: Locale): Voice? {
        val all = runCatching { t.voices }.getOrNull()?.filter { it.locale.language == loc.language && !it.features.contains("notInstalled") } ?: return null
        fun male(v: Voice) = v.name.contains("male", true) && !v.name.contains("female", true)
        val known = Regex("-x-(iol|iom|tpd|gbd|rjs|ahp|ene|eac|hfh)-|-x-(m\\d|male)", RegexOption.IGNORE_CASE)
        return all.filter { male(it) || known.containsMatchIn(it.name) }.sortedByDescending { it.quality + (if (it.isNetworkConnectionRequired) 0 else 50) + (if (it.locale == loc) 100 else 0) }.firstOrNull()
    }

    fun stopSpeaking() { runCatching { tts?.stop() } }
    fun release() { stopListening(); runCatching { tts?.stop(); tts?.shutdown() }; tts = null; ttsReady = false }
}
