package com.carevaplus.jarvis.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.carevaplus.jarvis.JarvisApp
import com.carevaplus.jarvis.overlay.OrbState
import com.carevaplus.jarvis.overlay.OrbView
import com.carevaplus.jarvis.overlay.OverlayService
import com.carevaplus.jarvis.service.JarvisAccessibilityService
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(tick: Int, goTo: (Int) -> Unit) {
    val ctx = LocalContext.current
    val g = JarvisApp.graph
    val scope = rememberCoroutineScope()
    var local by remember { mutableStateOf(0) }
    @Suppress("UNUSED_VARIABLE") val refresh = tick + local

    val hasKey = g.settings.providers().isNotEmpty()
    val overlayOk = Settings.canDrawOverlays(ctx)
    val micOk = ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    val notifOk = Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    val eyesOk = JarvisAccessibilityService.instance != null || accessibilityEnabled(ctx)
    val running = OverlayService.instance != null

    val micLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { local++ }
    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { local++ }

    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        AndroidView(factory = { OrbView(it).apply { state = OrbState.IDLE } }, update = { it.state = if (running) OrbState.IDLE else OrbState.IDLE }, modifier = Modifier.size(210.dp))
        Text("JARVIS", color = J.cyan, fontSize = 28.sp, fontWeight = FontWeight.Light, letterSpacing = 8.sp)
        Text(if (running) "Online. The orb is floating over your apps." else "Offline. Finish setup, then summon me.", color = J.muted, fontSize = 14.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp, bottom = 16.dp))

        val ready = hasKey && overlayOk
        Button(
            onClick = {
                if (running) OverlayService.stop(ctx) else OverlayService.start(ctx)
                scope.launch { delay(450); local++ }
            },
            enabled = ready || running, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = if (running) J.raised else J.cyan, contentColor = if (running) J.cyan else androidx.compose.ui.graphics.Color(0xFF00222B), disabledContainerColor = J.raised, disabledContentColor = J.muted),
        ) { Text(if (running) "Dismiss Jarvis" else "Summon Jarvis", fontSize = 17.sp, fontWeight = FontWeight.Medium) }

        Spacer(Modifier.height(20.dp))
        Column(Modifier.fillMaxWidth().panel().padding(vertical = 6.dp)) {
            Text("SET UP", color = J.muted, fontSize = 11.sp, fontFamily = FontFamily.Monospace, letterSpacing = 2.sp, modifier = Modifier.padding(start = 16.dp, top = 10.dp, bottom = 4.dp))
            Step("AI provider key", "DeepSeek, NVIDIA or OpenRouter (free)", hasKey, "Add") { goTo(3) }
            Step("Float above other apps", "Needed to show the orb over any app", overlayOk, "Allow") { ctx.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${ctx.packageName}"))) }
            Step("Microphone", "Talk to Jarvis instead of typing", micOk, "Allow") { micLauncher.launch(Manifest.permission.RECORD_AUDIO) }
            if (Build.VERSION.SDK_INT >= 33) Step("Notifications", "Shows the \"Jarvis is active\" status", notifOk, "Allow") { notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS) }
            Step("Screen awareness (optional)", "Lets Jarvis read your screen when you ask, and spot things to help with", eyesOk, "Enable") { ctx.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        }

        Spacer(Modifier.height(16.dp))
        var pro by remember { mutableStateOf(g.settings.proactive) }
        Row(Modifier.fillMaxWidth().panel().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Proactive mode", color = J.text, fontSize = 16.sp, fontWeight = FontWeight.Medium)
                Text(if (eyesOk) "Jarvis speaks up when it can really help, and asks you questions. A few nudges a day at most." else "Needs screen awareness above.", color = J.muted, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp))
            }
            Switch(checked = pro && eyesOk, enabled = eyesOk, onCheckedChange = { pro = it; g.settings.proactive = it })
        }
        Text("Tip: long-press the orb to talk straight away. Drag it anywhere; it snaps to the edge.", color = J.muted, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 14.dp, bottom = 24.dp))
    }
}

@Composable
private fun Step(title: String, sub: String, done: Boolean, action: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(enabled = !done, onClick = onClick).padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(22.dp).clip(RoundedCornerShape(11.dp)).then(Modifier), contentAlignment = Alignment.Center) { Text(if (done) "✓" else "○", color = if (done) J.ok else J.amber, fontSize = 18.sp) }
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text(title, color = J.text, fontSize = 15.sp)
            Text(sub, color = J.muted, fontSize = 12.sp)
        }
        if (!done) Text(action, color = J.cyan, fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}

private fun accessibilityEnabled(ctx: Context): Boolean {
    val v = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
    return v.contains("${ctx.packageName}/")
}
