package com.carevaplus.ai

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
private val Soft = Color(0xFFF3F0EA)

private val Colors = lightColorScheme(
    primary = Navy, onPrimary = Color.White, secondary = Green,
    background = Paper, surface = Paper, onBackground = Ink, onSurface = Ink,
    surfaceVariant = UserBubble, onSurfaceVariant = Muted, outline = Line,
    surfaceContainerLow = Soft, surfaceContainer = Color.White, surfaceContainerHigh = Color.White,
)

@Composable
fun CarevaTheme(content: @Composable () -> Unit) = MaterialTheme(colorScheme = Colors, content = content)

// ---------- app ----------

@Composable
fun App(vm: ChatViewModel) {
    when (vm.screen) {
        Screen.MODELS -> ModelsScreen(vm)
        Screen.CHAT -> ChatScreen(vm)
    }
}

private fun gb(bytes: Long) = if (bytes >= 1_000_000_000) "%.2f GB".format(bytes / 1e9) else "${bytes / 1_000_000} MB"

// ---------- models ----------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModelsScreen(vm: ChatViewModel) {
    val canGoBack = vm.installed.isNotEmpty()
    BackHandler(enabled = canGoBack) { vm.screen = Screen.CHAT }
    Scaffold(
        containerColor = Paper,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Paper),
                navigationIcon = { if (canGoBack) IconButton(onClick = { vm.screen = Screen.CHAT }) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back") } },
                title = { Text("Models", fontWeight = FontWeight.SemiBold) },
            )
        },
    ) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Column(Modifier.padding(bottom = 4.dp)) {
                    if (!canGoBack) {
                        Image(painterResource(R.drawable.careva_logo), "Careva+", Modifier.fillMaxWidth(0.7f).padding(vertical = 8.dp))
                        Text("Download a model to start. Models run entirely on your phone: no account, no API key, no cost per message, and chats never leave the device.", color = Muted)
                        Spacer(Modifier.height(8.dp))
                    }
                    Text("Each model is a free, open model. Bigger models are smarter but need more memory and are slower. You can install several and switch any time.", color = Muted, style = MaterialTheme.typography.bodyMedium)
                }
            }
            items(Catalog.models, key = { it.id }) { m -> ModelCard(vm, m) }
            item {
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth().border(1.dp, Line, RoundedCornerShape(18.dp))) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Use GPU", fontWeight = FontWeight.SemiBold)
                            Text("Faster on many phones. Turn off if replies fail or the app closes.", color = Muted, style = MaterialTheme.typography.bodySmall)
                        }
                        Switch(checked = vm.useGpu, onCheckedChange = vm::toggleGpu)
                    }
                }
            }
            item {
                Text(
                    "Honest note: these are the strongest free models that fit on a phone. They are much smaller than cloud AI such as Claude or ChatGPT, so they make more mistakes. Check important facts, and don't rely on them for medical decisions.",
                    color = Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(4.dp, 8.dp, 4.dp, 24.dp),
                )
            }
        }
    }
}

@Composable
private fun ModelCard(vm: ChatViewModel, m: AiModel) {
    val installed = m.id in vm.installed
    val dl = vm.downloads[m.id]
    val active = vm.activeModelId == m.id && installed
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth().border(if (active) 2.dp else 1.dp, if (active) Green else Line, RoundedCornerShape(18.dp)),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(m.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = Navy)
                if (m.recommended) Badge("Recommended")
                Spacer(Modifier.weight(1f))
                if (active) Icon(Icons.Rounded.CheckCircle, "In use", tint = Green)
            }
            Text(m.tagline, color = Ink, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(6.dp))
            Text("Best for: ${m.bestFor}", color = Muted, style = MaterialTheme.typography.bodySmall)
            Text("${m.baseModel} · ${m.license}", color = Muted, style = MaterialTheme.typography.bodySmall)
            Text("Download ${m.sizeLabel} · needs ~${"%.1f".format(m.storageNeeded / 1e9)} GB free and ~${m.minRamGb} GB RAM", color = Muted, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(12.dp))
            when {
                dl != null && dl.failed == null -> {
                    val pct = if (dl.total > 0) dl.done.toFloat() / dl.total else 0f
                    LinearProgressIndicator(progress = { pct }, modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape), color = Green, trackColor = Line)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${gb(dl.done)} of ${gb(dl.total)} · ${(pct * 100).toInt()}%" + if (dl.paused) " · waiting for network" else "", color = Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        TextButton(onClick = { vm.cancelDownload(m) }) { Text("Cancel") }
                    }
                }
                installed -> Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { vm.selectModel(m.id); vm.screen = Screen.CHAT }, enabled = !vm.busy, shape = RoundedCornerShape(12.dp)) { Text(if (active) "Open chat" else "Use this model") }
                    OutlinedButton(onClick = { vm.deleteModel(m) }, enabled = !vm.busy, shape = RoundedCornerShape(12.dp)) { Text("Delete") }
                }
                else -> {
                    if (dl?.failed != null) Text(dl.failed, color = Color(0xFFB3261E), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 8.dp))
                    Button(onClick = { vm.download(m) }, shape = RoundedCornerShape(12.dp)) {
                        Icon(Icons.Outlined.Download, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Download ${m.sizeLabel}")
                    }
                }
            }
        }
    }
}

@Composable
private fun Badge(text: String) {
    Text(text, color = Green, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelSmall,
        modifier = Modifier.padding(start = 8.dp).background(Color(0xFFE8F3DF), RoundedCornerShape(50)).padding(horizontal = 8.dp, vertical = 2.dp))
}

// ---------- chat ----------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatScreen(vm: ChatViewModel) {
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var picker by remember { mutableStateOf(false) }
    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = Soft, modifier = Modifier.width(300.dp)) {
                Column(Modifier.fillMaxHeight().padding(12.dp)) {
                    Image(painterResource(R.drawable.careva_logo), "Careva+", Modifier.height(44.dp).padding(start = 8.dp, top = 8.dp))
                    Spacer(Modifier.height(16.dp))
                    NavigationDrawerItem(icon = { Icon(Icons.Outlined.EditNote, null) }, label = { Text("New chat", fontWeight = FontWeight.SemiBold) },
                        selected = false, onClick = { vm.newChat(); scope.launch { drawer.close() } })
                    NavigationDrawerItem(icon = { Icon(Icons.Outlined.Memory, null) }, label = { Text("Models") },
                        selected = false, onClick = { vm.screen = Screen.MODELS; scope.launch { drawer.close() } })
                    Spacer(Modifier.height(8.dp))
                    Text("Recents", color = Muted, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp))
                    LazyColumn(Modifier.weight(1f)) {
                        items(vm.chats, key = { it.id }) { c ->
                            NavigationDrawerItem(
                                label = { Text(c.title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                                selected = c.id == vm.currentId,
                                onClick = { vm.open(c.id); scope.launch { drawer.close() } },
                                badge = { IconButton(onClick = { vm.delete(c.id) }, modifier = Modifier.size(32.dp)) { Icon(Icons.Outlined.DeleteOutline, "Delete", tint = Muted, modifier = Modifier.size(18.dp)) } },
                                colors = NavigationDrawerItemDefaults.colors(selectedContainerColor = Line, unselectedContainerColor = Color.Transparent),
                            )
                        }
                    }
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
                    title = { ModelButton(vm) { picker = true } },
                    actions = { IconButton(onClick = vm::newChat, enabled = !vm.busy) { Icon(Icons.Outlined.EditNote, "New chat") } },
                )
            },
        ) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).imePadding()) {
                when (val s = vm.engineState) {
                    is EngineState.Loading -> StatusBar("Starting ${s.model.name}…", progress = true)
                    is EngineState.Failed -> StatusBar(s.message, progress = false, action = "Models") { vm.screen = Screen.MODELS }
                    EngineState.NoModel -> StatusBar("No model selected.", progress = false, action = "Choose") { vm.screen = Screen.MODELS }
                    is EngineState.Ready -> {}
                }
                val messages = vm.current?.messages.orEmpty()
                if (messages.isEmpty() && vm.streaming == null) Welcome(vm, Modifier.weight(1f))
                else Messages(messages, vm.streaming, vm.streamingThought, Modifier.weight(1f))
                Composer(vm)
            }
        }
    }
    if (picker) ModelSheet(vm) { picker = false }
}

@Composable
private fun ModelButton(vm: ChatViewModel, onClick: () -> Unit) {
    val m = vm.activeModel
    Row(
        Modifier.clip(RoundedCornerShape(12.dp)).clickable(enabled = !vm.busy, onClick = onClick).padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(m?.name ?: "Careva+ AI", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
            Text("${vm.effort.label} effort", color = Muted, style = MaterialTheme.typography.labelSmall)
        }
        Icon(Icons.Rounded.KeyboardArrowDown, "Change model", tint = Muted)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModelSheet(vm: ChatViewModel, onClose: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onClose, containerColor = Paper) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp).verticalScroll(rememberScrollState())) {
            Text("Model", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            val installed = Catalog.models.filter { it.id in vm.installed }
            installed.forEach { m ->
                val sel = vm.activeModelId == m.id
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (sel) Color.White else Color.Transparent)
                        .border(1.dp, if (sel) Green else Color.Transparent, RoundedCornerShape(14.dp))
                        .clickable { vm.selectModel(m.id) }.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(m.name, fontWeight = FontWeight.SemiBold)
                        Text(m.bestFor, color = Muted, style = MaterialTheme.typography.bodySmall)
                    }
                    RadioButton(selected = sel, onClick = { vm.selectModel(m.id) })
                }
            }
            TextButton(onClick = { onClose(); vm.screen = Screen.MODELS }) {
                Icon(Icons.Outlined.Add, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp))
                Text(if (installed.size < Catalog.models.size) "Get more models" else "Manage models")
            }
            HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 12.dp))
            Text("Effort", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                Effort.entries.forEachIndexed { i, e ->
                    SegmentedButton(
                        selected = vm.effort == e, onClick = { vm.chooseEffort(e) },
                        shape = SegmentedButtonDefaults.itemShape(i, Effort.entries.size),
                        colors = SegmentedButtonDefaults.colors(activeContainerColor = Navy, activeContentColor = Color.White),
                    ) { Text(e.label) }
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(vm.effort.blurb, color = Muted, style = MaterialTheme.typography.bodyMedium)
            if (vm.activeModel?.alwaysThinks == true && vm.effort == Effort.LOW)
                Text("This model always thinks; Low keeps its thinking short.", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun StatusBar(text: String, progress: Boolean, action: String? = null, onAction: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().background(Soft).padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        if (progress) { CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = Green); Spacer(Modifier.width(10.dp)) }
        Text(text, color = Ink, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
        if (action != null) TextButton(onClick = onAction) { Text(action) }
    }
}

@Composable
private fun Welcome(vm: ChatViewModel, modifier: Modifier) {
    val ideas = listOf(
        "Write a polite follow-up message to a patient's family",
        "தமிழில் ஒரு நன்றி செய்தி எழுதுங்கள்",
        "A nurse visits 3 patients a day, 6 days a week. How many visits in 4 weeks?",
        "Write a Python function that checks if a phone number is valid",
    )
    Column(modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 24.dp), verticalArrangement = Arrangement.Center) {
        Spacer(Modifier.height(40.dp))
        Image(painterResource(R.drawable.careva_mark), null, Modifier.size(64.dp))
        Spacer(Modifier.height(16.dp))
        Text("How can I help you today?", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold, color = Ink)
        Text("வணக்கம்! English அல்லது தமிழில் கேளுங்கள்.", color = Muted, style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(24.dp))
        ideas.forEach { idea ->
            Surface(
                onClick = { vm.send(idea) }, enabled = vm.engineState is EngineState.Ready, shape = RoundedCornerShape(16.dp), color = Color.White,
                modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp).border(1.dp, Line, RoundedCornerShape(16.dp)),
            ) { Text(idea, Modifier.padding(16.dp), color = Ink) }
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun Messages(messages: List<Msg>, streaming: String?, thought: String, modifier: Modifier) {
    val list = rememberLazyListState()
    val count = messages.size + if (streaming != null) 1 else 0
    LaunchedEffect(count, streaming?.length, thought.length) { if (count > 0) list.scrollToItem(count - 1, Int.MAX_VALUE / 2) }
    LazyColumn(modifier.fillMaxWidth(), state = list, contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)) {
        items(messages) { m -> if (m.isUser) UserMessage(m.text) else AssistantMessage(m, live = false) }
        if (streaming != null) item { AssistantMessage(Msg("assistant", Prompt.clean(streaming), thought), live = true) }
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
private fun AssistantMessage(m: Msg, live: Boolean) {
    val clipboard = LocalClipboardManager.current
    var showThought by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Image(painterResource(R.drawable.careva_mark), null, Modifier.size(28.dp).padding(top = 2.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            if (m.thought.isNotBlank()) {
                val thinkingNow = live && m.text.isEmpty()
                Row(
                    Modifier.clip(RoundedCornerShape(10.dp)).clickable { showThought = !showThought }.padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.Psychology, null, tint = Muted, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    if (thinkingNow) Pulsing("Thinking…") else Text(if (m.seconds > 0) "Thought for ${m.seconds}s" else "Thoughts", color = Muted, style = MaterialTheme.typography.bodyMedium)
                    Icon(Icons.Rounded.KeyboardArrowDown, null, tint = Muted, modifier = Modifier.size(18.dp))
                }
                AnimatedVisibility(showThought || thinkingNow) {
                    Text(
                        m.thought.trim().let { if (thinkingNow) it.takeLast(600) else it },
                        color = Muted, style = MaterialTheme.typography.bodySmall.copy(lineHeight = 18.sp),
                        modifier = Modifier.padding(start = 8.dp, top = 4.dp, bottom = 8.dp).border(width = 0.dp, color = Color.Transparent)
                            .background(Soft, RoundedCornerShape(10.dp)).padding(10.dp),
                    )
                }
            }
            if (live && m.text.isEmpty() && m.thought.isBlank()) Pulsing("Thinking…")
            else if (m.text.isNotEmpty()) SelectionContainer {
                Text(markdown(m.text + if (live) " ▍" else ""), color = Ink, style = MaterialTheme.typography.bodyLarge.copy(lineHeight = 24.sp))
            }
            if (!live) Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { clipboard.setText(AnnotatedString(m.text)) }, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Outlined.ContentCopy, "Copy", tint = Muted, modifier = Modifier.size(18.dp))
                }
                if (m.model.isNotEmpty()) Text("${m.model} · ${m.effort}", color = Muted, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun Pulsing(text: String) {
    val t = rememberInfiniteTransition(label = "pulse")
    val a by t.animateFloat(0.3f, 1f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "a")
    Text(text, color = Muted, modifier = Modifier.alpha(a))
}

@Composable
private fun Composer(vm: ChatViewModel) {
    var text by remember { mutableStateOf("") }
    val ready = vm.engineState is EngineState.Ready
    Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 12.dp, end = 12.dp, bottom = 8.dp)) {
        Surface(shape = RoundedCornerShape(26.dp), color = Color.White, modifier = Modifier.fillMaxWidth().border(1.dp, Line, RoundedCornerShape(26.dp))) {
            Row(verticalAlignment = Alignment.Bottom, modifier = Modifier.padding(start = 6.dp, end = 8.dp, top = 4.dp, bottom = 6.dp)) {
                TextField(
                    value = text, onValueChange = { text = it },
                    placeholder = { Text("Message ${vm.activeModel?.name ?: "Careva+ AI"}", color = Muted) },
                    modifier = Modifier.weight(1f), maxLines = 6,
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = Color.Transparent, unfocusedContainerColor = Color.Transparent,
                        focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent, cursorColor = Navy,
                    ),
                )
                val canSend = text.isNotBlank() && ready
                FilledIconButton(
                    onClick = { if (vm.busy) vm.stop() else if (canSend) { vm.send(text); text = "" } },
                    enabled = vm.busy || canSend,
                    colors = IconButtonDefaults.filledIconButtonColors(containerColor = Navy, disabledContainerColor = Line),
                    modifier = Modifier.size(40.dp).padding(bottom = 2.dp),
                ) {
                    Icon(if (vm.busy) Icons.Rounded.Stop else Icons.Rounded.ArrowUpward, if (vm.busy) "Stop" else "Send", tint = Color.White)
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
