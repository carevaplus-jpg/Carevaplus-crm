package com.carevaplus.jarvis.service

import android.accessibilityservice.AccessibilityService
import android.graphics.Bitmap
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.carevaplus.jarvis.JarvisApp
import com.carevaplus.jarvis.brain.ScreenContext
import com.carevaplus.jarvis.overlay.OverlayService
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine

/**
 * Jarvis' eyes. Used only to (1) read the on-screen text when you ask about it, and (2) if you turned on
 * proactive mode, watch for moments Jarvis could help. Password fields are never read, and nothing is
 * stored: the latest snapshot lives in memory only.
 */
class JarvisAccessibilityService : AccessibilityService() {
    private val main = Handler(Looper.getMainLooper())
    private val worker = Executors.newSingleThreadExecutor()
    @Volatile private var cached: ScreenContext? = null
    private val snapshot = Runnable { takeSnapshot() }

    override fun onServiceConnected() { instance = this }
    override fun onUnbind(intent: android.content.Intent?): Boolean { instance = null; return super.onUnbind(intent) }
    override fun onInterrupt() {}

    override fun onAccessibilityEvent(e: AccessibilityEvent) {
        val pkg = e.packageName?.toString() ?: return
        if (pkg == packageName) return
        if (OverlayService.instance == null) return           // Jarvis isn't summoned: do nothing at all
        main.removeCallbacks(snapshot)
        main.postDelayed(snapshot, 1500)                      // wait for the screen to settle
    }

    private fun takeSnapshot() {
        val ctx = readActive() ?: return
        cached = ctx
        val g = JarvisApp.graph
        if (!g.settings.proactive) return
        worker.execute {
            val s = runCatching { g.proactive.consider(ctx) }.getOrNull() ?: return@execute
            main.post { OverlayService.instance?.offer(s, ctx) }
        }
    }

    /** The last screen the user was actually looking at (not Jarvis' own panel). */
    fun lastScreen(): ScreenContext? = (cached?.takeIf { System.currentTimeMillis() - it.at < 120_000 }) ?: readActive()

    private fun readActive(): ScreenContext? {
        val root = rootInActiveWindow ?: return null
        val pkg = root.packageName?.toString() ?: return null
        if (pkg == packageName) return null
        val sb = StringBuilder()
        collect(root, sb, 0)
        val label = runCatching { packageManager.getApplicationInfo(pkg, 0).loadLabel(packageManager).toString() }.getOrDefault(pkg.substringAfterLast('.'))
        return ScreenContext(pkg, label, sb.toString().trim())
    }

    private fun collect(n: AccessibilityNodeInfo, sb: StringBuilder, depth: Int) {
        if (sb.length > 4500 || depth > 40) return
        if (!n.isVisibleToUser || n.isPassword) return
        val t = (n.text ?: n.contentDescription)?.toString()?.trim()
        if (!t.isNullOrEmpty() && !sb.endsWith(t)) sb.append(t).append('\n')
        for (i in 0 until n.childCount) {
            val c = n.getChild(i) ?: continue
            collect(c, sb, depth + 1)
            if (Build.VERSION.SDK_INT < 33) @Suppress("DEPRECATION") c.recycle()
        }
    }

    /** A downscaled JPEG of the screen as a data URL, for vision models. Android 11+. */
    suspend fun screenshotDataUrl(): String? {
        if (Build.VERSION.SDK_INT < 30) return null
        return suspendCancellableCoroutine { cont ->
            takeScreenshot(Display.DEFAULT_DISPLAY, worker, object : TakeScreenshotCallback {
                override fun onSuccess(r: ScreenshotResult) {
                    val hw = Bitmap.wrapHardwareBuffer(r.hardwareBuffer, r.colorSpace)
                    val bmp = hw?.copy(Bitmap.Config.ARGB_8888, false)
                    r.hardwareBuffer.close()
                    if (bmp == null) { cont.resume(null); return }
                    val scale = 900f / maxOf(bmp.width, bmp.height)
                    val small = if (scale < 1f) Bitmap.createScaledBitmap(bmp, (bmp.width * scale).toInt(), (bmp.height * scale).toInt(), true) else bmp
                    val out = ByteArrayOutputStream(); small.compress(Bitmap.CompressFormat.JPEG, 72, out)
                    cont.resume("data:image/jpeg;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP))
                }
                override fun onFailure(code: Int) { cont.resume(null) }
            })
        }
    }

    companion object { @Volatile var instance: JarvisAccessibilityService? = null }
}
