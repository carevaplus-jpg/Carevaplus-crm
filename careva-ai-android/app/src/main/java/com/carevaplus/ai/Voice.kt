package com.carevaplus.ai

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/** A language the user can dictate in. */
enum class VoiceLang(val tag: String, val label: String) { ENGLISH("en-IN", "English"), TAMIL("ta-IN", "தமிழ்") }

/**
 * Speech to text with Android's speech recognizer, shown live in the message box. The words are only put in the
 * box; the user reviews them and taps send.
 */
class Dictation(private val ctx: Context) : RecognitionListener {
    private val prefs = ctx.getSharedPreferences("settings", Context.MODE_PRIVATE)

    var listening by mutableStateOf(false); private set
    /** Microphone loudness, 0 to 1, for the animation. */
    var level by mutableFloatStateOf(0f); private set
    /** Words heard so far in this session (not yet final). */
    var partial by mutableStateOf(""); private set
    var error by mutableStateOf<String?>(null)
    var lang by mutableStateOf(VoiceLang.entries.firstOrNull { it.name == prefs.getString("voice", null) } ?: VoiceLang.ENGLISH); private set

    private var recognizer: SpeechRecognizer? = null
    private var onText: ((String) -> Unit)? = null

    /** Whether a speech service can run inside the app (otherwise use [systemIntent]). */
    fun inAppAvailable() = SpeechRecognizer.isRecognitionAvailable(ctx)

    fun chooseLang(l: VoiceLang) {
        lang = l; prefs.edit().putString("voice", l.name).apply()
        if (listening) { val cb = onText; cancel(); cb?.let { start(it) } }
    }

    private fun intent() = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang.tag)
        .putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang.tag)
        .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        .putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L)
        .putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L)

    /** The phone's own voice-typing screen, for phones where the in-app recognizer isn't available. */
    fun systemIntent(): Intent = intent().putExtra(RecognizerIntent.EXTRA_PROMPT, if (lang == VoiceLang.TAMIL) "பேசுங்கள்…" else "Speak now…")

    /** Starts listening; [onFinal] receives the finished words. */
    fun start(onFinal: (String) -> Unit) {
        cancel()
        error = null; partial = ""; level = 0f
        onText = onFinal
        recognizer = SpeechRecognizer.createSpeechRecognizer(ctx).also {
            it.setRecognitionListener(this)
            it.startListening(intent())
        }
        listening = true
    }

    /** Stops listening and delivers what was heard. */
    fun stop() { recognizer?.stopListening() }

    fun cancel() {
        try { recognizer?.cancel(); recognizer?.destroy() } catch (_: Exception) {}
        recognizer = null; listening = false; level = 0f; partial = ""
    }

    private fun finish(text: String) {
        val cb = onText
        try { recognizer?.destroy() } catch (_: Exception) {}
        recognizer = null; listening = false; level = 0f; partial = ""
        if (text.isNotBlank()) cb?.invoke(text.trim())
    }

    private fun first(b: Bundle?) = b?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()

    override fun onResults(results: Bundle?) = finish(first(results).ifBlank { partial })
    override fun onPartialResults(partialResults: Bundle?) { first(partialResults).takeIf { it.isNotBlank() }?.let { partial = it } }
    override fun onRmsChanged(rmsdB: Float) { level = ((rmsdB + 2f) / 12f).coerceIn(0f, 1f) }
    override fun onError(code: Int) {
        val heard = partial
        if (heard.isNotBlank()) { finish(heard); return }
        error = when (code) {
            SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Didn't catch that. Tap the mic and try again."
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Allow the microphone for Careva+ AI to talk instead of typing."
            SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Voice typing needs internet. Check your connection."
            SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ->
                "${lang.label} voice typing isn't available on this phone. Try the other language."
            else -> "Voice typing stopped (code $code). Tap the mic to try again."
        }
        finish("")
    }
    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() { level = 0f }
    override fun onEvent(eventType: Int, params: Bundle?) {}
}
