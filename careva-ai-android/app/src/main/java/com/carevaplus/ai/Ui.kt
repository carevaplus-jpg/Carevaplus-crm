package com.carevaplus.ai

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

// ---------- theme ----------

private val Navy = Color(0xFF0E2A4F)
private val Green = Color(0xFF4E9A1E)
private val Paper = Color(0xFFFAF8F4)
private val Ink = Color(0xFF1C1B19)
private val Muted = Color(0xFF6E6A63)
private val Line = Color(0xFFE6E1D8)
private val UserBubble = Color(0xFFEFEBE3)

private val Colors = lightColorScheme(
    primary = Navy, onPrimary = Color.White, secondary = Green,
    background = Paper, surface = Paper, onBackground = Ink, onSurface = Ink,
    surfaceVariant = UserBubble, onSurfaceVariant = Muted, outline = Line,
    surfaceContainerLow = Color(0xFFF3F0EA), surfaceContainer = Color.White,
)

@Composable
fun CarevaTheme(content: @Composable () -> Unit) = MaterialTheme(colorScheme = Colors, content = content)

// ---------- app ----------

@Composable
fun App(vm: ChatViewModel) {
    when (vm.modelState) {
        ModelState.Ready -> ChatScreen(vm)
        else -> SetupScreen(vm)
    }
}

// ---------- setup ----------

@Composable
private fun SetupScreen(vm: ChatViewModel) {
    val state = vm.modelState
    Column(
        Modifier.fillMaxSize().background(Paper).systemBarsPadding().verticalScroll(rememberScrollState()).padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(40.dp))
        Image(painterResource(R.drawable.careva_logo), "Careva+", Modifier.fillMaxWidth(0.8f))
        Spacer(Modifier.height(20.dp))
        Text("AI assistant", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold, color = Navy)
        Spacer(Modifier.height(10.dp))
        Text(
            "A private assistant that runs entirely on your phone. No account, no API key and no cost per message.",
            style = MaterialTheme.typography.bodyLarge, color = Muted, textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(28.dp))
        Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(20.dp), modifier = Modifier.fillMaxWidth().border(1.dp, Line, RoundedCornerShape(20.dp))) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                InfoRow(Icons.Outlined.Download, "One-time download", "About 1.6 GB. Wi-Fi recommended.")
                InfoRow(Icons.Outlined.WifiOff, "Works offline", "After the download, chats never leave your phone.")
                InfoRow(Icons.Outlined.Memory, "Model", "${ModelInfo.NAME} (${ModelInfo.LICENSE}). Needs a phone with about 6 GB RAM.")
                InfoRow(Icons.Outlined.Info, "Good to know", "A small on-device model: great for everyday questions and writing, less reliable than large cloud AI for complex reasoning. Always check important facts.")
            }
        }
        Spacer(Modifier.height(28.dp))
        when (state) {
            is ModelState.Downloading -> {
                val pct = if (state.total > 0) state.done.toFloat() / state.total else 0f
                LinearProgressIndicator(progress = { pct }, modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape), color = Green, trackColor = Line)
                Spacer(Modifier.height(10.dp))
                Text(
                    "${mb(state.done)} of ${mb(state.total)}  ·  ${(pct * 100).toInt()}%" + if (state.paused) "  ·  waiting for network" else "",
                    color = Muted, style = MaterialTheme.typography.bodyMedium,
                )
                Spacer(Modifier.height(4.dp))
                Text("You can leave the app; the download continues.", color = Muted, style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(16.dp))
                TextButton(onClick = vm::cancelDownload) { Text("Cancel download") }
            }
            ModelState.Loading -> {
                CircularProgressIndicator(color = Green)
                Spacer(Modifier.height(12.dp))
                Text("Starting the model…", color = Muted)
            }
            is ModelState.Failed -> {
                Text(state.message, color = Color(0xFFB3261E), textAlign = TextAlign.Center)
                Spacer(Modifier.height(16.dp))
                Button(onClick = vm::download, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth().height(52.dp)) { Text("Download again") }
            }
            else -> Button(onClick = vm::download, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth().height(52.dp)) {
                Text("Download model (1.6 GB)", fontWeight = FontWeight.SemiBold)
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, body: String) {
    Row(verticalAlignment = Alignment.Top) {
        Icon(icon, null, tint = Green, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(14.dp))
        Column {
            Text(title, fontWeight = FontWeight.SemiBold, color = Ink)
            Text(body, color = Muted, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

private fun mb(bytes: Long) = if (bytes >= 1_000_000_000) "%.2f GB".format(bytes / 1e9) else "${bytes / 1_000_000} MB"

// ---------- chat ----------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatScreen(vm: ChatViewModel) {
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = Color(0xFFF3F0EA), modifier = Modifier.width(300.dp)) {
                Column(Modifier.fillMaxHeight().padding(12.dp)) {
                    Image(painterResource(R.drawable.careva_logo), "Careva+", Modifier.height(44.dp).padding(start = 8.dp, top = 8.dp))
                    Spacer(Modifier.height(16.dp))
                    NavigationDrawerItem(
                        icon = { Icon(Icons.Outlined.EditNote, null) }, label = { Text("New chat", fontWeight = FontWeight.SemiBold) },
                        selected = false, onClick = { vm.newChat(); scope.launch { drawer.close() } },
                    )
                    Spacer(Modifier.height(8.dp))
                    Text("Recents", color = Muted, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp))
                    LazyColumn(Modifier.weight(1f)) {
                        items(vm.chats, key = { it.id }) { c ->
                            NavigationDrawerItem(
                                label = { Text(c.title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                selected = c.id == vm.currentId,
                                onClick = { vm.open(c.id); scope.launch { drawer.close() } },
                                badge = { IconButton(onClick = { vm.delete(c.id) }, modifier = Modifier.size(32.dp)) { Icon(Icons.Outlined.DeleteOutline, "Delete", tint = Muted, modifier = Modifier.size(18.dp)) } },
                                colors = NavigationDrawerItemDefaults.colors(selectedContainerColor = Color(0xFFE6E1D8), unselectedContainerColor = Color.Transparent),
                            )
                        }
                    }
                    Text(
                        "${ModelInfo.NAME} · on-device", color = Muted, style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        },
    ) {
        Scaffold(
            containerColor = Paper,
            topBar = {
                CenterAlignedTopAppBar(
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Paper),
                    navigationIcon = { IconButton(onClick = { scope.launch { drawer.open() } }) { Icon(Icons.Outlined.Menu, "Chats") } },
                    title = {
                        Text(vm.current?.title ?: "Careva+ AI", maxLines = 1, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    },
                    actions = { IconButton(onClick = vm::newChat, enabled = vm.streaming == null) { Icon(Icons.Outlined.EditNote, "New chat") } },
                )
            },
        ) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).imePadding()) {
                val messages = vm.current?.messages.orEmpty()
                if (messages.isEmpty() && vm.streaming == null) Welcome(Modifier.weight(1f), onPick = vm::send)
                else Messages(messages, vm.streaming, Modifier.weight(1f))
                Composer(
                    generating = vm.streaming != null,
                    onSend = vm::send, onStop = vm::stop,
                )
            }
        }
    }
}

@Composable
private fun Welcome(modifier: Modifier, onPick: (String) -> Unit) {
    val ideas = listOf(
        "Write a polite follow-up message to a patient's family",
        "தமிழில் ஒரு நன்றி செய்தி எழுதுங்கள்",
        "Explain blood pressure readings in simple words",
        "Help me plan a daily routine for an elderly parent",
    )
    Column(modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp), verticalArrangement = Arrangement.Center) {
        Spacer(Modifier.height(48.dp))
        Image(painterResource(R.drawable.careva_mark), null, Modifier.size(64.dp))
        Spacer(Modifier.height(16.dp))
        Text("How can I help you today?", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold, color = Ink)
        Text("வணக்கம்! English அல்லது தமிழில் கேளுங்கள்.", color = Muted, style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(24.dp))
        ideas.forEach { idea ->
            Surface(
                onClick = { onPick(idea) }, shape = RoundedCornerShape(16.dp), color = Color.White,
                modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp).border(1.dp, Line, RoundedCornerShape(16.dp)),
            ) { Text(idea, Modifier.padding(16.dp), color = Ink) }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun Messages(messages: List<Msg>, streaming: String?, modifier: Modifier) {
    val list = rememberLazyListState()
    val count = messages.size + if (streaming != null) 1 else 0
    LaunchedEffect(count, streaming?.length) { if (count > 0) list.scrollToItem(count - 1, Int.MAX_VALUE / 2) }
    LazyColumn(modifier.fillMaxWidth(), state = list, contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)) {
        items(messages) { m -> if (m.isUser) UserMessage(m.text) else AssistantMessage(m.text, streaming = false) }
        if (streaming != null) item { AssistantMessage(PromptBuilder.clean(streaming), streaming = true) }
    }
}

@Composable
private fun UserMessage(text: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.End) {
        Surface(shape = RoundedCornerShape(20.dp, 20.dp, 6.dp, 20.dp), color = UserBubble, modifier = Modifier.widthIn(max = 320.dp)) {
            SelectionContainer { Text(text, Modifier.padding(horizontal = 16.dp, vertical = 11.dp), color = Ink, style = MaterialTheme.typography.bodyLarge) }
        }
    }
}

@Composable
private fun AssistantMessage(text: String, streaming: Boolean) {
    val clipboard = LocalClipboardManager.current
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Image(painterResource(R.drawable.careva_mark), null, Modifier.size(28.dp).padding(top = 2.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            if (streaming && text.isEmpty()) Thinking()
            else SelectionContainer {
                Text(markdown(text + if (streaming) " ▍" else ""), color = Ink, style = MaterialTheme.typography.bodyLarge.copy(lineHeight = 24.sp))
            }
            if (!streaming) Row {
                IconButton(onClick = { clipboard.setText(AnnotatedString(text)) }, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Outlined.ContentCopy, "Copy", tint = Muted, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
private fun Thinking() {
    val t = rememberInfiniteTransition(label = "thinking")
    val a by t.animateFloat(0.3f, 1f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "a")
    Text("Thinking…", color = Muted, modifier = Modifier.alpha(a).padding(top = 2.dp))
}

@Composable
private fun Composer(generating: Boolean, onSend: (String) -> Unit, onStop: () -> Unit) {
    var text by remember { mutableStateOf("") }
    Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 12.dp, end = 12.dp, bottom = 8.dp)) {
        Surface(shape = RoundedCornerShape(26.dp), color = Color.White, modifier = Modifier.fillMaxWidth().border(1.dp, Line, RoundedCornerShape(26.dp))) {
            Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(start = 6.dp, end = 8.dp, top = 4.dp, bottom = 6.dp)) {
                TextField(
                    value = text, onValueChange = { text = it },
                    placeholder = { Text("Message Careva+ AI", color = Muted) },
                    modifier = Modifier.weight(1f), maxLines = 6,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent, unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent, cursorColor = Navy,
                    ),
                )
                val canSend = text.isNotBlank()
                FilledIconButton(
                    onClick = { if (generating) onStop() else if (canSend) { onSend(text); text = "" } },
                    enabled = generating || canSend,
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Navy, disabledContainerColor = Line),
                    modifier = Modifier.size(40.dp).padding(bottom = 2.dp),
                ) {
                    Icon(if (generating) Icons.Rounded.Stop else Icons.Rounded.ArrowUpward, if (generating) "Stop" else "Send", tint = Color.White)
                }
            }
        }
        Text(
            "Runs privately on your phone. It can make mistakes; check important information.",
            color = Muted, style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
        )
    }
}

// ---------- light markdown: headings, bullets, **bold**, *italic*, `code`, ``` blocks ```

private val CodeBg = Color(0xFFEFEBE3)
private val inlineToken = Regex("(\\*\\*[^*]+\\*\\*|`[^`]+`|\\*[^*\\s][^*]*\\*)")

private fun AnnotatedString.Builder.inline(s: String) {
    var last = 0
    for (m in inlineToken.findAll(s)) {
        append(s.substring(last, m.range.first))
        val t = m.value
        when {
            t.startsWith("**") -> withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(t.removeSurrounding("**")) }
            t.startsWith("`") -> withStyle(SpanStyle(fontFamily = FontFamily.Monospace, background = CodeBg)) { append(t.removeSurrounding("`")) }
            else -> withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(t.removeSurrounding("*")) }
        }
        last = m.range.last + 1
    }
    append(s.substring(last))
}

fun markdown(text: String): AnnotatedString = buildAnnotatedString {
    var inCode = false
    val lines = text.split("\n")
    lines.forEachIndexed { i, line ->
        if (line.trimStart().startsWith("```")) { inCode = !inCode; return@forEachIndexed }
        when {
            inCode -> withStyle(SpanStyle(fontFamily = FontFamily.Monospace, background = CodeBg, fontSize = 14.sp)) { append(line) }
            Regex("^#{1,6}\\s+").containsMatchIn(line) ->
                withStyle(SpanStyle(fontWeight = FontWeight.Bold, fontSize = 18.sp)) { inline(line.replace(Regex("^#{1,6}\\s+"), "")) }
            Regex("^\\s*[-*•]\\s+").containsMatchIn(line) -> { append("  •  "); inline(line.replace(Regex("^\\s*[-*•]\\s+"), "")) }
            else -> inline(line)
        }
        if (i < lines.lastIndex) append("\n")
    }
}
