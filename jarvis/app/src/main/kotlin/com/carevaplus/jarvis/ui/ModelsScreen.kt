package com.carevaplus.jarvis.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carevaplus.jarvis.JarvisApp
import com.carevaplus.jarvis.brain.Role
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ModelsScreen() {
    val g = JarvisApp.graph
    val scope = rememberCoroutineScope()
    var rev by remember { mutableIntStateOf(0) }
    var msg by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    @Suppress("UNUSED_VARIABLE") val r = rev
    val providers = g.settings.providers()
    val usable = providers.map { it.id }.toSet()
    val btn = ButtonDefaults.buttonColors(containerColor = J.cyan, contentColor = androidx.compose.ui.graphics.Color(0xFF00222B), disabledContainerColor = J.raised, disabledContentColor = J.muted)

    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Model lab", color = J.text, fontSize = 22.sp)
        Text("Jarvis only uses models from providers you added a key for, and learns which ones actually work for you.", color = J.muted, fontSize = 13.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(enabled = providers.isNotEmpty() && !busy, colors = btn, shape = RoundedCornerShape(12.dp), onClick = {
                busy = true; msg = "Loading model lists…"
                scope.launch {
                    val errs = withContext(Dispatchers.IO) { g.router.refresh(providers) }
                    msg = if (errs.isEmpty()) "${g.router.all.size} models found." else errs.entries.joinToString("; ") { "${it.key}: ${it.value}" }
                    busy = false; rev++
                }
            }) { Text("Refresh") }
            Button(enabled = providers.isNotEmpty() && g.router.all.isNotEmpty() && !busy, colors = btn, shape = RoundedCornerShape(12.dp), onClick = {
                busy = true
                scope.launch {
                    withContext(Dispatchers.IO) { g.router.probe(providers) { p -> msg = p } }
                    msg = "Test finished."; busy = false; rev++
                }
            }) { Text("Test my models") }
        }
        if (msg.isNotBlank()) Text(msg, color = J.amber, fontSize = 12.sp)
        if (providers.isEmpty()) Text("Add a DeepSeek, NVIDIA or OpenRouter key in Settings first.", color = J.muted, fontSize = 14.sp)

        if (providers.isNotEmpty()) for (role in Role.values()) {
            val ranked = g.router.rank(role, usable, 4)
            if (ranked.isEmpty()) continue
            Column(Modifier.fillMaxWidth().panel().padding(14.dp)) {
                Text(role.label.uppercase(), color = J.muted, fontSize = 11.sp, fontFamily = FontFamily.Monospace, letterSpacing = 2.sp)
                val pinned = g.router.pinnedFor(role)
                ranked.forEachIndexed { i, m ->
                    val s = g.router.statOf(m)
                    val isPin = pinned == m.key
                    Row(Modifier.fillMaxWidth().clickable { g.router.pin(role, if (isPin) null else m); rev++ }.padding(vertical = 7.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text((if (i == 0) "● " else "○ ") + m.short, color = if (i == 0) J.cyan else J.text, fontSize = 14.sp)
                            Text("${m.provider}${if (m.free) " · free" else ""}${if (s != null && s.ok + s.fail > 0) " · ${s.ok} ok / ${s.fail} failed" else ""}", color = J.muted, fontSize = 11.sp)
                        }
                        Text(if (isPin) "pinned" else "tap to pin", color = if (isPin) J.amber else J.muted, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}
