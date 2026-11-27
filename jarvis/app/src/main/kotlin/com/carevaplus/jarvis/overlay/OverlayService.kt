package com.carevaplus.jarvis.overlay

import android.animation.ValueAnimator
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.carevaplus.jarvis.JarvisApp
import com.carevaplus.jarvis.brain.Event
import com.carevaplus.jarvis.brain.ModelInfo
import com.carevaplus.jarvis.brain.Msg
import com.carevaplus.jarvis.brain.ScreenContext
import com.carevaplus.jarvis.brain.Suggestion
import com.carevaplus.jarvis.service.JarvisAccessibilityService
import com.carevaplus.jarvis.ui.MainActivity
import com.carevaplus.jarvis.voice.SpeechIO
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.min

/**
 * Jarvis above every app: a draggable animated orb that snaps to a screen edge. Tap it to talk or type,
 * long-press to speak straight away. Proactive suggestions appear as a small bubble beside the orb.
 */
class OverlayService : Service() {
    private val main = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val g get() = JarvisApp.graph
    private lateinit var wm: WindowManager
    private lateinit var orb: OrbView
    private lateinit var orbLp: WindowManager.LayoutParams
    private lateinit var speech: SpeechIO

    private var card: LinearLayout? = null
    private var cardLp: WindowManager.LayoutParams? = null
    private lateinit var status: TextView
    private lateinit var answer: TextView
    private lateinit var answerScroll: ScrollView
    private lateinit var chips: LinearLayout
    private lateinit var feedback: LinearLayout
    private lateinit var inputRow: LinearLayout
    private lateinit var input: EditText

    private val history = ArrayList<Msg>()
    private var job: Job? = null
    private var lastModel: ModelInfo? = null
    private var pendingClarify: String? = null
    private var bubbleCtx: ScreenContext? = null
    private var bubbleSuggestion: Suggestion? = null
    private var mode = Mode.NONE
    private val answerBuf = StringBuilder()
    private val autoDismiss = Runnable { dismissBubble(accepted = false) }

    private enum class Mode { NONE, BUBBLE, PANEL }

    // ---------- lifecycle ----------
    override fun onBind(i: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        if (!Settings.canDrawOverlays(this)) { stopSelf(); return }
        instance = this
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
        speech = SpeechIO(this) { g.settings.voiceLang }
        startForeground(1, notification())
        buildOrb()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopSelf(); return START_NOT_STICKY }
        if (intent?.action == ACTION_OPEN) showPanel(listen = false)
        return START_STICKY
    }

    override fun onDestroy() {
        instance = null
        job?.cancel(); scope.cancel(); speech.release()
        main.removeCallbacksAndMessages(null)
        runCatching { wm.removeViewImmediate(orb) }
        removeCard()
        super.onDestroy()
    }

    private fun notification(): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("jarvis", "Jarvis is active", NotificationManager.IMPORTANCE_MIN))
        val stop = PendingIntent.getService(this, 1, Intent(this, OverlayService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE)
        val open = PendingIntent.getActivity(this, 2, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, "jarvis").setSmallIcon(android.R.drawable.ic_btn_speak_now).setContentTitle("Jarvis is watching over your phone")
            .setContentText("Tap the orb to talk. Tap here to open settings.").setContentIntent(open).setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Stop Jarvis", stop).build()).build()
    }

    // ---------- the orb ----------
    private fun dp(v: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics)
    private val screenW get() = resources.displayMetrics.widthPixels
    private val screenH get() = resources.displayMetrics.heightPixels

    private fun overlayParams(w: Int, h: Int, flags: Int) = WindowManager.LayoutParams(w, h, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, flags, PixelFormat.TRANSLUCENT)

    private fun buildOrb() {
        orb = OrbView(this)
        val size = dp(66f).toInt()
        orbLp = overlayParams(size, size, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS).apply {
            gravity = Gravity.TOP or Gravity.START
            x = if (g.settings.orbSide == 0) 0 else screenW - size
            y = g.settings.orbY.coerceIn(0, screenH - size)
        }
        val slop = ViewConfiguration.get(this).scaledTouchSlop
        var downX = 0f; var downY = 0f; var startX = 0; var startY = 0; var moved = false; var longFired = false
        val longPress = Runnable { longFired = true; orb.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS); showPanel(listen = true) }
        orb.setOnTouchListener { _, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { downX = e.rawX; downY = e.rawY; startX = orbLp.x; startY = orbLp.y; moved = false; longFired = false; main.postDelayed(longPress, 550) }
                MotionEvent.ACTION_MOVE -> {
                    if (!moved && (abs(e.rawX - downX) > slop || abs(e.rawY - downY) > slop)) { moved = true; main.removeCallbacks(longPress) }
                    if (moved) { orbLp.x = (startX + e.rawX - downX).toInt(); orbLp.y = (startY + e.rawY - downY).toInt().coerceIn(0, screenH - size); runCatching { wm.updateViewLayout(orb, orbLp) } }
                }
                MotionEvent.ACTION_UP -> {
                    main.removeCallbacks(longPress)
                    if (moved) snapToEdge(size) else if (!longFired) { if (mode == Mode.NONE || mode == Mode.BUBBLE) showPanel(listen = false) else hideCard() }
                }
                MotionEvent.ACTION_CANCEL -> main.removeCallbacks(longPress)
            }
            true
        }
        wm.addView(orb, orbLp)
    }

    private fun snapToEdge(size: Int) {
        val toLeft = orbLp.x + size / 2 < screenW / 2
        val end = if (toLeft) 0 else screenW - size
        ValueAnimator.ofInt(orbLp.x, end).apply {
            duration = 260; interpolator = android.view.animation.OvershootInterpolator(0.9f)
            addUpdateListener { orbLp.x = it.animatedValue as Int; runCatching { wm.updateViewLayout(orb, orbLp) } }
            start()
        }
        g.settings.orbSide = if (toLeft) 0 else 1; g.settings.orbY = orbLp.y
    }

    // ---------- the card (panel + bubble share one window) ----------
    private fun ensureCard() {
        if (card != null) return
        val bg = GradientDrawable().apply { setColor(Color.parseColor("#F2081520")); cornerRadius = dp(22f); setStroke(dp(1f).toInt(), Color.parseColor("#554DE8FF")) }
        val root = object : LinearLayout(this) {
            override fun dispatchKeyEvent(e: KeyEvent): Boolean { if (e.keyCode == KeyEvent.KEYCODE_BACK && e.action == KeyEvent.ACTION_UP) { hideCard(); return true }; return super.dispatchKeyEvent(e) }
        }.apply { orientation = LinearLayout.VERTICAL; background = bg; setPadding(dp(16f).toInt(), dp(12f).toInt(), dp(16f).toInt(), dp(12f).toInt()); elevation = dp(12f) }

        val header = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        status = TextView(this).apply { setTextColor(Color.parseColor("#4DE8FF")); textSize = 11f; typeface = Typeface.MONOSPACE; letterSpacing = 0.12f; text = "READY" }
        header.addView(status, LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(label("✕", 18f).apply { setOnClickListener { hideCard() }; setPadding(dp(10f).toInt(), 0, 0, 0) })
        root.addView(header)

        answer = TextView(this).apply { setTextColor(Color.parseColor("#E6F6FF")); textSize = 15.5f; setLineSpacing(0f, 1.18f); setTextIsSelectable(true); setPadding(0, dp(8f).toInt(), 0, dp(6f).toInt()) }
        answerScroll = ScrollView(this).apply { addView(answer); isVerticalScrollBarEnabled = false }
        root.addView(answerScroll, LinearLayout.LayoutParams(-1, -2))

        val chipScroll = HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false }
        chips = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        chipScroll.addView(chips); root.addView(chipScroll, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(4f).toInt() })

        feedback = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; visibility = View.GONE; gravity = Gravity.END }
        feedback.addView(label("Helpful  👍", 12f).apply { setOnClickListener { rate(true) } })
        feedback.addView(label("   Not great  👎", 12f).apply { setOnClickListener { rate(false) } })
        root.addView(feedback)

        inputRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val inBg = GradientDrawable().apply { setColor(Color.parseColor("#14293A")); cornerRadius = dp(18f) }
        input = EditText(this).apply {
            hint = "Ask Jarvis anything…"; setHintTextColor(Color.parseColor("#6F93A6")); setTextColor(Color.WHITE); textSize = 15f; background = inBg
            setPadding(dp(14f).toInt(), dp(10f).toInt(), dp(14f).toInt(), dp(10f).toInt()); maxLines = 4
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or InputType.TYPE_TEXT_FLAG_MULTI_LINE; imeOptions = EditorInfo.IME_ACTION_SEND
            setOnEditorActionListener { _, a, _ -> if (a == EditorInfo.IME_ACTION_SEND) { submitInput(); true } else false }
        }
        inputRow.addView(input, LinearLayout.LayoutParams(0, -2, 1f))
        inputRow.addView(label("🎙", 22f).apply { setPadding(dp(12f).toInt(), 0, dp(6f).toInt(), 0); setOnClickListener { startListening() } })
        inputRow.addView(label("➤", 22f).apply { setTextColor(Color.parseColor("#4DE8FF")); setPadding(dp(6f).toInt(), 0, 0, 0); setOnClickListener { submitInput() } })
        root.addView(inputRow, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(8f).toInt() })

        card = root
        cardLp = overlayParams(min(screenW - dp(20f).toInt(), dp(420f).toInt()), WindowManager.LayoutParams.WRAP_CONTENT, 0).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; y = dp(28f).toInt()
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        }
        wm.addView(root, cardLp)
    }

    private fun label(t: String, sp: Float) = TextView(this).apply { text = t; textSize = sp; setTextColor(Color.parseColor("#9CC9DB")); setPadding(0, dp(4f).toInt(), 0, dp(4f).toInt()) }

    private fun setFocusable(focusable: Boolean) {
        val lp = cardLp ?: return
        lp.flags = if (focusable) WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
        else WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
        runCatching { wm.updateViewLayout(card, lp) }
    }

    private fun hideCard() {
        main.removeCallbacks(autoDismiss)
        speech.stopListening(); speech.stopSpeaking()
        if (mode == Mode.BUBBLE) bubbleSuggestion?.let { g.proactive.outcome(it.pkg, false) }
        mode = Mode.NONE; bubbleSuggestion = null
        removeCard()
        if (job?.isActive != true) orb.state = OrbState.IDLE
    }

    private fun removeCard() { card?.let { runCatching { wm.removeViewImmediate(it) } }; card = null; cardLp = null }

    // ---------- panel ----------
    private fun showPanel(listen: Boolean) {
        main.removeCallbacks(autoDismiss)
        ensureCard(); mode = Mode.PANEL; setFocusable(true)
        inputRow.visibility = View.VISIBLE
        if (answerBuf.isEmpty() && job?.isActive != true) {
            answer.text = "At your service."; status.text = "READY"; feedback.visibility = View.GONE
            setChips(listOf("What's on my screen?", "Summarise this", "Reply for me", "👁 Look"))
        }
        card?.alpha = 0f; card?.translationY = dp(24f); card?.animate()?.alpha(1f)?.translationY(0f)?.setDuration(220)?.start()
        if (listen) startListening() else { input.requestFocus() }
    }

    private fun setChips(options: List<String>, onPick: ((String) -> Unit)? = null) {
        chips.removeAllViews()
        options.forEach { opt ->
            val bg = GradientDrawable().apply { setColor(Color.parseColor("#12384A")); cornerRadius = dp(16f); setStroke(dp(1f).toInt(), Color.parseColor("#664DE8FF")) }
            chips.addView(TextView(this).apply {
                text = opt; textSize = 13f; setTextColor(Color.parseColor("#BDF3FF")); background = bg
                setPadding(dp(14f).toInt(), dp(8f).toInt(), dp(14f).toInt(), dp(8f).toInt())
                setOnClickListener { if (onPick != null) onPick(opt) else onChip(opt) }
            }, LinearLayout.LayoutParams(-2, -2).apply { rightMargin = dp(8f).toInt() })
        }
    }

    private fun onChip(opt: String) {
        if (pendingClarify != null) { val q = pendingClarify!!; pendingClarify = null; ask("$q\n(My answer: $opt)"); return }
        if (opt.startsWith("👁")) { look(); return }
        ask(opt)
    }

    private fun submitInput() {
        val t = input.text.toString().trim(); if (t.isBlank()) return
        input.setText("")
        val clar = pendingClarify; pendingClarify = null
        ask(if (clar != null) "$clar\n(My answer: $t)" else t)
    }

    // ---------- voice ----------
    private fun startListening() {
        speech.stopSpeaking()
        orb.state = OrbState.LISTENING; status.text = "LISTENING…"; chips.removeAllViews()
        speech.listen(object : SpeechIO.Listener {
            override fun onPartial(text: String) { input.setText(text); input.setSelection(text.length) }
            override fun onFinal(text: String) { input.setText(""); ask(text) }
            override fun onLevel(level: Float) { orb.level = level }
            override fun onError(message: String) { status.text = message.uppercase(); orb.state = OrbState.IDLE }
            override fun onListeningEnded() { if (orb.state == OrbState.LISTENING) orb.state = OrbState.IDLE }
        })
    }

    // ---------- asking ----------
    fun ask(text: String, screenOverride: String? = null, images: List<String> = emptyList()) {
        main.removeCallbacks(autoDismiss)
        if (mode != Mode.PANEL) showPanel(listen = false)
        speech.stopSpeaking(); job?.cancel()
        answerBuf.clear(); feedback.visibility = View.GONE; chips.removeAllViews()
        val shown = text.substringBefore("\n(My answer")
        answer.text = "▸ $shown"; answer.setTextColor(Color.parseColor("#7FA3B5"))
        status.text = "THINKING…"; orb.state = OrbState.THINKING

        val screen = screenOverride ?: if (g.wantsScreen(text)) JarvisAccessibilityService.instance?.lastScreen()?.let { "App: ${it.app}\n${it.text}" } else null
        job = scope.launch {
            g.jarvis.run(text, history.toList(), images, screen) { ev -> main.post { handle(text, ev) } }
        }
    }

    private fun handle(userText: String, ev: Event) {
        if (card == null) return
        when (ev) {
            is Event.Stage -> status.text = when (ev.name) { "planning" -> "PLANNING…"; "executing" -> "ROUTING ${ev.detail.uppercase()}…"; else -> "RESPONDING…" }
            is Event.Planned -> if (ev.tasks.size > 1) status.text = "${ev.tasks.size} SPECIALISTS ENGAGED"
            is Event.TaskStart -> status.text = "${ev.model.short.take(28).uppercase()} · ${ev.role.label.uppercase()}"
            is Event.TaskDone -> {}
            is Event.Token -> {
                if (answerBuf.isEmpty()) { answer.setTextColor(Color.parseColor("#E6F6FF")); answer.text = "" }
                answerBuf.append(ev.text); answer.text = answerBuf; answerScroll.post { answerScroll.fullScroll(View.FOCUS_DOWN) }
                orb.state = OrbState.SPEAKING; orb.level = 0.45f
            }
            is Event.Clarify -> {
                pendingClarify = userText.substringBefore("\n(My answer")
                answer.setTextColor(Color.parseColor("#FFD08A")); answer.text = ev.question
                setChips(ev.options); status.text = "I HAVE A QUESTION"; orb.state = OrbState.ALERT
            }
            is Event.Done -> {
                history += Msg.user(userText.substringBefore("\n(My answer")); history += Msg.assistant(ev.answer)
                while (history.size > 12) history.removeAt(0)
                lastModel = ev.model
                answer.setTextColor(Color.parseColor("#E6F6FF")); answer.text = ev.answer
                status.text = "${ev.model?.short?.take(24)?.uppercase() ?: ""} · ${ev.tokens} TOK · ${"%.1f".format(ev.ms / 1000f)}S"
                feedback.visibility = View.VISIBLE
                setChips(listOf("Go deeper", "Shorter", "Translate"))
                if (g.settings.speakReplies && !ev.answer.isBlank()) {
                    orb.state = OrbState.SPEAKING
                    speech.speak(ev.answer, onStart = {}, onPulse = { main.post { orb.level = it } }, onDone = { main.post { orb.level = 0f; if (orb.state == OrbState.SPEAKING) orb.state = OrbState.IDLE } })
                } else { orb.level = 0f; orb.state = OrbState.IDLE }
            }
            is Event.Failed -> {
                answer.setTextColor(Color.parseColor("#FF8A80")); answer.text = ev.message; status.text = "COULDN'T FINISH"; orb.level = 0f; orb.state = OrbState.IDLE
                setChips(listOf("Try again")) { ask(userText) }
            }
        }
    }

    private fun rate(good: Boolean) {
        lastModel?.let { g.router.feedback(it, good) }
        feedback.visibility = View.GONE
        status.text = if (good) "NOTED. I'LL FAVOUR THAT MODEL" else "NOTED. I'LL TRY OTHERS FIRST"
    }

    /** "Look": screenshot to a vision model, with the card hidden for the shot. */
    private fun look() {
        val svc = JarvisAccessibilityService.instance
        if (svc == null) { answer.text = "Turn on Jarvis in Accessibility settings so I can see your screen."; return }
        status.text = "LOOKING…"; orb.state = OrbState.THINKING
        card?.visibility = View.INVISIBLE
        scope.launch {
            delay(280)
            val shot = svc.screenshotDataUrl()
            card?.visibility = View.VISIBLE
            if (shot == null) { answer.text = "I couldn't capture the screen (needs Android 11 or newer)."; orb.state = OrbState.IDLE; return@launch }
            ask("Look at my screen and tell me what's going on and anything I should know or do.", images = listOf(shot))
        }
    }

    // ---------- proactive ----------
    fun offer(s: Suggestion, ctx: ScreenContext) {
        if (mode == Mode.PANEL || card != null && mode != Mode.NONE) return
        bubbleCtx = ctx; bubbleSuggestion = s
        ensureCard(); mode = Mode.BUBBLE; setFocusable(false)
        inputRow.visibility = View.GONE; feedback.visibility = View.GONE
        status.text = "JARVIS · ${ctx.app.uppercase().take(20)}"
        answer.setTextColor(Color.parseColor("#FFE2B0")); answer.text = if (s.question != null) "${s.message}\n\n${s.question}" else s.message
        val opts = if (s.options.isNotEmpty()) s.options else listOf("Yes, help", "Not now")
        setChips(opts) { pick ->
            val decline = Regex("^(no|not now|later|dismiss|skip|no thanks|nope)\\b", RegexOption.IGNORE_CASE).containsMatchIn(pick.trim())
            if (decline) dismissBubble(false) else {
                g.proactive.outcome(s.pkg, true)
                val screen = ctx.text.takeIf { it.isNotBlank() }?.let { "App: ${ctx.app}\n$it" }
                val prompt = if (s.options.isNotEmpty() && !pick.startsWith("Yes")) "${s.prompt}\n(User chose: $pick)" else s.prompt
                bubbleSuggestion = null; mode = Mode.NONE; ask(prompt, screenOverride = screen)
            }
        }
        orb.state = OrbState.ALERT; orb.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
        card?.alpha = 0f; card?.animate()?.alpha(1f)?.setDuration(200)?.start()
        main.postDelayed(autoDismiss, 25_000)
    }

    private fun dismissBubble(accepted: Boolean) {
        bubbleSuggestion?.let { g.proactive.outcome(it.pkg, accepted) }
        bubbleSuggestion = null; mode = Mode.NONE
        main.removeCallbacks(autoDismiss); removeCard(); orb.state = OrbState.IDLE
    }

    companion object {
        const val ACTION_STOP = "jarvis.stop"; const val ACTION_OPEN = "jarvis.open"
        @Volatile var instance: OverlayService? = null
        fun start(ctx: Context) { if (Settings.canDrawOverlays(ctx)) ctx.startForegroundService(Intent(ctx, OverlayService::class.java)) }
        fun stop(ctx: Context) { ctx.stopService(Intent(ctx, OverlayService::class.java)) }
    }
}
