package com.carevaplus.jarvis.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.carevaplus.jarvis.brain.WakePhrase
import java.util.Locale

/**
 * Hands-free "Hey Jarvis". Uses the phone's own speech recogniser in short listening windows; the owner calls [start] again when
 * it has stopped (see OverlayService's watchdog). Main thread only. Only the text of the words is looked at, and only for the wake phrase.
 */
class WakeWord(private val ctx: Context, private val language: () -> String, private val onWake: (rest: String) -> Unit) {
    private var rec: SpeechRecognizer? = null
    var running = false; private set
    private var fired = false
    private val main = Handler(Looper.getMainLooper())

    fun start() {
        if (running || !SpeechRecognizer.isRecognitionAvailable(ctx)) return
        running = true; fired = false
        val r = try { SpeechRecognizer.createSpeechRecognizer(ctx) } catch (e: Exception) { running = false; return }
        rec = r
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(p: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(v: Float) {}
            override fun onBufferReceived(b: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(t: Int, p: Bundle?) {}
            override fun onError(code: Int) { end() }
            override fun onResults(res: Bundle?) {
                val said = res?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty()
                said.firstNotNullOfOrNull { WakePhrase.match(it) }?.let { fire(it); return }
                end()
            }
            override fun onPartialResults(p: Bundle?) {
                val said = p?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty()
                // act at once on a bare "hey Jarvis"; if a command follows, wait for the final result so it is complete
                said.firstNotNullOfOrNull { WakePhrase.match(it) }?.takeIf { it.isBlank() }?.let { fire("") }
            }
        })
        try {
            r.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, language().ifBlank { Locale.getDefault().toLanguageTag() })
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, ctx.packageName)
            })
        } catch (e: Exception) { end() }
    }

    private fun fire(rest: String) { if (fired) return; fired = true; end(); onWake(rest) }
    private fun end() { runCatching { rec?.cancel(); rec?.destroy() }; rec = null; running = false }
    fun stop() = end()
}
