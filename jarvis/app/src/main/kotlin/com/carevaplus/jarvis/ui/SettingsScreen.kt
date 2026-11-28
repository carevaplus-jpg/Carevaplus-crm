package com.carevaplus.jarvis.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.carevaplus.jarvis.JarvisApp

@Composable
private fun KeyField(label: String, hint: String, value: String, onChange: (String) -> Unit) {
    var v by remember { mutableStateOf(value) }
    OutlinedTextField(
        value = v, onValueChange = { v = it; onChange(it) }, singleLine = true, label = { Text(label) }, supportingText = { Text(hint, color = J.muted, fontSize = 11.sp) },
        visualTransformation = PasswordVisualTransformation(), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = J.cyan, unfocusedBorderColor = J.line, focusedTextColor = J.text, unfocusedTextColor = J.text, focusedLabelColor = J.cyan, unfocusedLabelColor = J.muted, cursorColor = J.cyan),
    )
}

@Composable
fun SettingsScreen() {
    val g = JarvisApp.graph
    val s = g.settings
    var speak by remember { mutableStateOf(s.speakReplies) }
    var budget by remember { mutableIntStateOf(s.dailyBudget) }
    var rev by remember { mutableIntStateOf(0) }
    @Suppress("UNUSED_VARIABLE") val r = rev

    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Text("Settings", color = J.text, fontSize = 22.sp)
        Text("API keys stay encrypted on this phone and are sent only to the provider they belong to. Add any one; Jarvis prefers DeepSeek, then NVIDIA, then OpenRouter, and falls back automatically.", color = J.muted, fontSize = 13.sp)
        KeyField("DeepSeek key", "platform.deepseek.com → API keys", s.deepSeekKey) { s.deepSeekKey = it }
        KeyField("NVIDIA key (Nemotron and more)", "build.nvidia.com → get API key (nvapi-…)", s.nvidiaKey) { s.nvidiaKey = it }
        KeyField("OpenRouter key (free models)", "openrouter.ai/keys", s.openRouterKey) { s.openRouterKey = it }

        Text("Image generation: needs a Hugging Face token (huggingface.co/settings/tokens) and your safety-check Space (see hf-space/README.md). Images are only shown if the check passes.", color = J.muted, fontSize = 13.sp)
        KeyField("Hugging Face token", "Used for image generation", s.hfToken) { s.hfToken = it }
        KeyField("Safety Space URL", "https://you-space.hf.space", s.safetyUrl) { s.safetyUrl = it }
        KeyField("Safety Space token", "The SPACE_TOKEN secret", s.safetyToken) { s.safetyToken = it }

        Row(Modifier.fillMaxWidth().panel().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Speak replies aloud", color = J.text, fontSize = 15.sp)
                Text("Short spoken answers when you talk to Jarvis.", color = J.muted, fontSize = 12.sp)
            }
            Switch(checked = speak, onCheckedChange = { speak = it; s.speakReplies = it; g.voiceReplies = it })
        }

        var deep by remember { mutableStateOf(s.deepVoice) }
        var voiceMsg by remember { mutableStateOf("") }
        Column(Modifier.fillMaxWidth().panel().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { Text("Deep male voice", color = J.text, fontSize = 15.sp); Text("Lower pitch, slower pace. Uses the best male voice your phone has.", color = J.muted, fontSize = 12.sp) }
                Switch(checked = deep, onCheckedChange = { deep = it; s.deepVoice = it })
            }
            TextButton(onClick = { voiceMsg = ""; g.voice.onProblem = { m -> voiceMsg = m }; g.voice.speak("Good evening. All systems are online, and ready when you are.", {}, {}, {}) }) { Text("Test voice", color = J.cyan) }
            if (voiceMsg.isNotBlank()) Text(voiceMsg, color = J.amber, fontSize = 12.sp)
            Text("Want a deeper or different voice? Phone Settings → Text-to-speech → Google → Language/voice, and download a male English voice.", color = J.muted, fontSize = 11.sp)
        }

        Column(Modifier.fillMaxWidth().panel().padding(16.dp)) {
            Text("Proactive nudges per day: $budget", color = J.text, fontSize = 15.sp)
            Text("Hard cap. Quiet hours ${s.quietStart}:00–${s.quietEnd}:00. Banking, password and system apps are never read.", color = J.muted, fontSize = 12.sp)
            Row {
                TextButton(onClick = { budget = (budget - 2).coerceAtLeast(0); s.dailyBudget = budget }) { Text("−2", color = J.cyan) }
                TextButton(onClick = { budget = (budget + 2).coerceAtMost(40); s.dailyBudget = budget }) { Text("+2", color = J.cyan) }
            }
        }

        val facts = remember(rev) { g.memory.facts() }
        Column(Modifier.fillMaxWidth().panel().padding(16.dp)) {
            Text("What Jarvis remembers (${facts.size})", color = J.text, fontSize = 15.sp)
            if (facts.isEmpty()) Text("Nothing yet. Stored only on this phone.", color = J.muted, fontSize = 12.sp)
            facts.takeLast(12).forEach { f -> Text("• $f", color = J.muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp)) }
            if (facts.isNotEmpty()) TextButton(onClick = { g.memory.clear(); rev++ }) { Text("Forget everything", color = J.bad) }
        }

        Text("Privacy: Jarvis reads your screen only when you ask about it, or, if you turn on proactive mode, briefly when you switch apps, and sends that text to the AI provider you configured. Password fields are skipped.", color = J.muted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 24.dp))
    }
}
