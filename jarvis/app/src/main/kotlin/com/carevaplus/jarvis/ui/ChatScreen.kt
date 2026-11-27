package com.carevaplus.jarvis.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.sp
import com.carevaplus.jarvis.JarvisApp
import com.carevaplus.jarvis.brain.Event
import com.carevaplus.jarvis.brain.Msg
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class Line(val mine: Boolean, val text: String, val meta: String = "", val image: android.graphics.Bitmap? = null)

@Composable
fun ChatScreen() {
    val g = JarvisApp.graph
    val lines = remember { mutableStateListOf<Line>() }
    var input by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var job by remember { mutableStateOf<Job?>(null) }
    val scope = rememberCoroutineScope()
    val list = rememberLazyListState()
    LaunchedEffect(lines.size, lines.lastOrNull()?.text?.length) { if (lines.isNotEmpty()) list.scrollToItem(lines.lastIndex) }

    fun send(text: String) {
        if (text.isBlank() || busy) return
        val history = lines.filter { it.text.isNotBlank() }.map { if (it.mine) Msg.user(it.text) else Msg.assistant(it.text) }
        lines += Line(true, text); lines += Line(false, "")
        input = ""; busy = true; status = "Thinking…"
        job = scope.launch {
            var acc = ""
            var img: android.graphics.Bitmap? = null
            fun set(t: String, meta: String = "") { lines[lines.lastIndex] = Line(false, t, meta, img) }
            withContext(Dispatchers.IO) {
                g.jarvis.run(text, history) { ev ->
                    when (ev) {
                        is Event.Stage -> status = ev.name + if (ev.detail.isNotBlank()) ": ${ev.detail}" else ""
                        is Event.Clarify -> { acc = ev.question + if (ev.options.isNotEmpty()) "\n\n" + ev.options.joinToString("\n") { "• $it" } else ""; set(acc) }
                        is Event.TaskStart -> status = "${ev.role.label} → ${ev.model.short}"
                        is Event.Image -> { img = android.graphics.BitmapFactory.decodeByteArray(ev.bytes, 0, ev.bytes.size); g.lastImage = ev.bytes }
                        is Event.Token -> { acc += ev.text; set(acc) }
                        is Event.Done -> { set(ev.answer, "${ev.model?.short ?: ""} · ${ev.ms / 1000.0}s"); status = ""; if (g.settings.speakReplies) android.os.Handler(android.os.Looper.getMainLooper()).post { g.voice.speak(ev.answer, {}, {}, {}) } }
                        is Event.Failed -> { set(ev.message); status = "" }
                        else -> {}
                    }
                }
            }
            busy = false; status = ""
        }
    }

    Column(Modifier.fillMaxSize().imePadding()) {
        if (lines.isEmpty()) {
            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text("Ask me anything.\nI pick the best model you can use for each part.", color = J.muted, fontSize = 15.sp, modifier = Modifier.padding(32.dp))
            }
        } else LazyColumn(Modifier.weight(1f).fillMaxWidth(), state = list, contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(lines) { l ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = if (l.mine) Arrangement.End else Arrangement.Start) {
                    Column(Modifier.background(if (l.mine) J.raised else J.surface, RoundedCornerShape(16.dp)).padding(12.dp).fillMaxWidth(if (l.mine) 0.85f else 0.95f)) {
                        l.image?.let { b -> androidx.compose.foundation.Image(b.asImageBitmap(), contentDescription = "Generated image", modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(12.dp))) }
                        Text(l.text.ifBlank { "…" }, color = J.text, fontSize = 15.sp)
                        if (l.meta.isNotBlank()) Text(l.meta, color = J.muted, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
                    }
                }
            }
        }
        if (status.isNotBlank()) Text(status, color = J.cyan, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp))
        Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = input, onValueChange = { input = it }, modifier = Modifier.weight(1f), placeholder = { Text("Message Jarvis", color = J.muted) }, maxLines = 4,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = J.cyan, unfocusedBorderColor = J.line, focusedTextColor = J.text, unfocusedTextColor = J.text, cursorColor = J.cyan),
            )
            Button(
                onClick = { if (busy) { job?.cancel(); busy = false; status = "" } else send(input.trim()) },
                modifier = Modifier.padding(start = 8.dp), shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = J.cyan, contentColor = androidx.compose.ui.graphics.Color(0xFF00222B)),
            ) { Text(if (busy) "Stop" else "Send") }
        }
    }
}
