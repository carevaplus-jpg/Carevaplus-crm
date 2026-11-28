package com.carevaplus.jarvis.overlay

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.view.View
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

enum class OrbState { IDLE, LISTENING, THINKING, SPEAKING, ALERT }

/**
 * Jarvis' face: an arc reactor. Segmented rings rotate at different speeds, a core breathes,
 * and radial bars react to your voice (listening) or its voice (speaking). All drawn on Canvas, time-driven,
 * paused automatically when the view is detached or hidden.
 */
class OrbView(context: Context) : View(context) {
    var state: OrbState = OrbState.IDLE
        set(v) { if (field != v) { field = v; stateSince = System.nanoTime() } }
    /** 0..1 audio level, fed by the speech recogniser (mic) or the TTS pulse (speaking). */
    @Volatile var level = 0f

    private var stateSince = System.nanoTime()
    private val t0 = System.nanoTime()
    private var smoothLevel = 0f
    private var energy = 0f            // 0 idle .. 1 busy, eased
    private var colorR = 77f; private var colorG = 232f; private var colorB = 255f

    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val bar = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeCap = Paint.Cap.ROUND }
    private val oval = RectF()
    private var halo: RadialGradient? = null
    private var haloKey = 0L
    private var coreShader: RadialGradient? = null
    private var coreKey = 0L

    override fun onDraw(c: Canvas) {
        val now = System.nanoTime()
        val t = (now - t0) / 1e9f
        val cx = width / 2f; val cy = height / 2f
        val r = min(width, height) / 2f
        if (r <= 0f) return

        // ease colour, energy and level
        val target = when (state) { OrbState.ALERT -> floatArrayOf(255f, 181f, 71f); else -> floatArrayOf(77f, 232f, 255f) }
        colorR += (target[0] - colorR) * 0.12f; colorG += (target[1] - colorG) * 0.12f; colorB += (target[2] - colorB) * 0.12f
        val targetEnergy = when (state) { OrbState.IDLE -> 0.15f; OrbState.LISTENING -> 0.7f; OrbState.THINKING -> 1f; OrbState.SPEAKING -> 0.8f; OrbState.ALERT -> 0.9f }
        energy += (targetEnergy - energy) * 0.08f
        smoothLevel += (level - smoothLevel) * 0.3f
        val col = Color.rgb(colorR.toInt(), colorG.toInt(), colorB.toInt())
        val breathe = 0.5f + 0.5f * sin(t * (1.2f + energy * 2.5f))
        val speak = when (state) { OrbState.SPEAKING -> max(smoothLevel, 0.25f + 0.25f * abs(sin(t * 7f) * sin(t * 3.1f))); OrbState.LISTENING -> smoothLevel; else -> 0f }

        // halo
        val hr = r * (0.95f + 0.1f * breathe + speak * 0.1f)
        val hk = (col.toLong() shl 16) xor hr.toInt().toLong()
        if (halo == null || hk != haloKey) { halo = RadialGradient(cx, cy, hr, intArrayOf(Color.argb(110, Color.red(col), Color.green(col), Color.blue(col)), Color.argb(0, Color.red(col), Color.green(col), Color.blue(col))), floatArrayOf(0.35f, 1f), Shader.TileMode.CLAMP); haloKey = hk }
        fill.shader = halo; fill.alpha = (255 * (0.45f + 0.4f * energy + 0.15f * breathe)).toInt().coerceIn(0, 255)
        c.drawCircle(cx, cy, hr, fill); fill.shader = null; fill.alpha = 255

        // outer hairline
        ring.color = col; ring.alpha = 70; ring.strokeWidth = max(1f, r * 0.012f)
        c.drawCircle(cx, cy, r * 0.93f, ring)

        // three segmented rings, counter-rotating
        val spin = 1f + energy * 4f
        drawSegments(c, cx, cy, r * 0.84f, 3, 0.62f, t * 38f * spin, r * 0.07f, col, 235)
        drawSegments(c, cx, cy, r * 0.66f, 5, 0.5f, -t * 62f * spin, r * 0.05f, col, 190)
        if (state == OrbState.THINKING) drawSegments(c, cx, cy, r * 0.5f, 2, 0.3f, t * 220f, r * 0.045f, col, 255)
        else drawSegments(c, cx, cy, r * 0.5f, 8, 0.55f, t * 28f * spin, r * 0.03f, col, 150)

        // voice bars
        if (state == OrbState.LISTENING || state == OrbState.SPEAKING) {
            val n = 40
            bar.color = col; bar.strokeWidth = max(1.5f, r * 0.025f)
            for (i in 0 until n) {
                val a = (i.toFloat() / n) * 2f * PI.toFloat() + t * 0.4f
                val wob = 0.5f + 0.5f * sin(t * 9f + i * 1.7f) * sin(t * 4.3f + i * 0.6f)
                val len = r * (0.03f + 0.17f * speak * (0.35f + 0.65f * wob))
                val r1 = r * 0.93f; val r2 = r1 + len
                bar.alpha = (110 + 145 * speak).toInt().coerceIn(0, 255)
                c.drawLine(cx + cos(a) * r1, cy + sin(a) * r1, cx + cos(a) * r2, cy + sin(a) * r2, bar)
            }
        }

        // core
        val cr = r * (0.2f + 0.035f * breathe + speak * 0.1f + (if (state == OrbState.ALERT) 0.04f * abs(sin(t * 6f)) else 0f))
        val ck = (col.toLong() shl 16) xor cr.toInt().toLong()
        if (coreShader == null || ck != coreKey) { coreShader = RadialGradient(cx, cy, cr, intArrayOf(Color.WHITE, col, Color.argb(0, Color.red(col), Color.green(col), Color.blue(col))), floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP); coreKey = ck }
        fill.shader = coreShader
        c.drawCircle(cx, cy, cr * 1.5f, fill); fill.shader = null

        if (isShown) postInvalidateOnAnimation()
    }

    private fun drawSegments(c: Canvas, cx: Float, cy: Float, rad: Float, count: Int, fillRatio: Float, rotation: Float, width: Float, col: Int, alpha: Int) {
        ring.color = col; ring.alpha = alpha; ring.strokeWidth = width
        oval.set(cx - rad, cy - rad, cx + rad, cy + rad)
        val step = 360f / count
        for (i in 0 until count) c.drawArc(oval, rotation + i * step, step * fillRatio, false, ring)
    }

    override fun onAttachedToWindow() { super.onAttachedToWindow(); postInvalidateOnAnimation() }
    override fun onVisibilityChanged(changedView: View, visibility: Int) { super.onVisibilityChanged(changedView, visibility); if (visibility == VISIBLE) postInvalidateOnAnimation() }
}
