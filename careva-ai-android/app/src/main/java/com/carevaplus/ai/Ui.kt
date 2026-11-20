package com.carevaplus.ai

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.speech.RecognizerIntent
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.core.content.ContextCompat
import java.util.Calendar
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.ParagraphStyle
import androidx.compose.ui.text.style.TextIndent
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ---------- theme ----------

private val Navy = Color(0xFF0E2A4F)
private val Green = Color(0xFF4E9A1E)
private val Paper = Color(0xFFFAF9F5)
private val Ink = Color(0xFF1F1E1D)
private val Muted = Color(0xFF6F6D66)
private val Line = Color(0xFFE8E6DC)
private val UserBubble = Color(0xFFF0EEE6)
private val Soft = Color(0xFFF2F0E8)

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
        Screen.ACCOUNT -> AccountScreen(vm)
        Screen.AGENTS -> AgentsScreen(vm)
    }
}

private fun gb(bytes: Long) = if (bytes >= 1_000_000_000) "%.2f GB".format(bytes / 1e9) else "${bytes / 1_000_000} MB"

// ---------- models ----------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModelsScreen(vm: ChatViewModel) {
    val canGoBack = vm.installed.isNotEmpty() || vm.account != null
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
                        Text("Sign in to start. Nothing to download: the AI runs in the Careva+ cloud. No API key and no cost per message.", color = Muted)
                        Spacer(Modifier.height(8.dp))
                    }
                    Text("All models run in the Careva+ cloud, so they use no storage or memory on your phone. Pick one for the kind of task; you can switch any time.", color = Muted, style = MaterialTheme.typography.bodyMedium)
                }
            }
            items(Catalog.cloud, key = { it.id }) { m -> CloudCard(vm, m) }
            // Models downloaded by an earlier version stay usable and can be deleted to free space; nothing new is offered for download.
            val onPhone = Catalog.models.filter { it.id in vm.installed || vm.downloads.containsKey(it.id) }
            if (onPhone.isNotEmpty()) {
                item { SectionTitle("Downloaded to this phone", "From an earlier version. Delete them to free up storage.") }
                items(onPhone, key = { it.id }) { m -> ModelCard(vm, m) }
            }
            item {
                Text(
                    "Honest note: these are free, open AI models. They can make mistakes, so check important facts, and don't rely on them for medical decisions. Don't type patient names or private medical details.",
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
private fun SectionTitle(title: String, text: String) {
    Column(Modifier.padding(top = 8.dp, bottom = 2.dp)) {
        Text(title, fontWeight = FontWeight.Bold, color = Navy, style = MaterialTheme.typography.titleMedium)
        Text(text, color = Muted, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun CloudCard(vm: ChatViewModel, m: AiModel) {
    val active = vm.activeModelId == m.id && vm.account != null
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth().border(if (active) 2.dp else 1.dp, if (active) Green else Line, RoundedCornerShape(18.dp)),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Cloud, null, tint = Navy, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(6.dp))
                Text(m.name, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium, color = Navy)
                if (m.recommended) Badge("Recommended")
                Spacer(Modifier.weight(1f))
                if (active) Icon(Icons.Rounded.CheckCircle, "In use", tint = Green)
            }
            Text(m.tagline, color = Ink, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(6.dp))
            Text("Best for: ${m.bestFor}", color = Muted, style = MaterialTheme.typography.bodySmall)
            Text("${m.baseModel} · no download · 0 GB on your phone", color = Muted, style = MaterialTheme.typography.bodySmall)
            Spacer(Modifier.height(12.dp))
            if (vm.account != null)
                Button(onClick = { vm.selectModel(m.id); vm.screen = Screen.CHAT }, enabled = !vm.busy, shape = RoundedCornerShape(12.dp)) { Text(if (active) "Open chat" else "Use this model") }
            else
                OutlinedButton(onClick = { vm.screen = Screen.ACCOUNT }, shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Outlined.AccountCircle, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Sign in to use")
                }
        }
    }
}

@Composable
private fun Badge(text: String) {
    Text(text, color = Green, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelSmall,
        modifier = Modifier.padding(start = 8.dp).background(Color(0xFFE8F3DF), RoundedCornerShape(50)).padding(horizontal = 8.dp, vertical = 2.dp))
}

// ---------- account ----------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AccountScreen(vm: ChatViewModel) {
    BackHandler { vm.screen = Screen.CHAT }
    Scaffold(
        containerColor = Paper,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Paper),
                navigationIcon = { IconButton(onClick = { vm.screen = Screen.CHAT }) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back") } },
                title = { Text("Account", fontWeight = FontWeight.SemiBold) },
            )
        },
    ) { pad ->
        Column(Modifier.fillMaxSize().padding(pad).imePadding().verticalScroll(rememberScrollState()).padding(20.dp)) {
            Image(painterResource(R.drawable.careva_logo), "Careva+", Modifier.fillMaxWidth(0.6f).padding(bottom = 16.dp))
            if (vm.account != null) SignedIn(vm) else SignInForm(vm)
        }
    }
}

@Composable
private fun SignedIn(vm: ChatViewModel) {
    val s = vm.sync
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth().border(1.dp, Line, RoundedCornerShape(18.dp))) {
        Column(Modifier.padding(18.dp)) {
            Text("Signed in as", color = Muted, style = MaterialTheme.typography.bodySmall)
            Text(vm.account.orEmpty(), fontWeight = FontWeight.Bold, color = Navy, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                when {
                    s.running -> { CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = Green); Spacer(Modifier.width(8.dp)); Text("Syncing…", color = Muted) }
                    s.error != null -> { Icon(Icons.Outlined.CloudOff, null, tint = Color(0xFFB3261E), modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(s.error, color = Color(0xFFB3261E), style = MaterialTheme.typography.bodySmall) }
                    s.lastOk > 0 -> { Icon(Icons.Outlined.CloudDone, null, tint = Green, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Synced ${ago(s.lastOk)}", color = Muted) }
                    else -> Text("Not synced yet", color = Muted)
                }
            }
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = vm::syncNow, enabled = !s.running, shape = RoundedCornerShape(12.dp)) {
                    Icon(Icons.Outlined.Sync, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Sync now")
                }
                OutlinedButton(onClick = vm::signOut, enabled = !vm.busy && !s.running, shape = RoundedCornerShape(12.dp)) { Text("Sign out") }
            }
        }
    }
    Spacer(Modifier.height(16.dp))
    Text(
        "Your chats are saved to your Careva+ account and appear on every phone where you sign in with this email. Only you can see them. " +
            "The AI still runs on each phone, so download a model on each phone too. Signing out removes the chats from this phone only; they stay in your account.",
        color = Muted, style = MaterialTheme.typography.bodySmall,
    )
}

@Composable
private fun SignInForm(vm: ChatViewModel) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var show by remember { mutableStateOf(false) }
    Text("Welcome to Careva+ AI", fontWeight = FontWeight.Bold, color = Navy, style = MaterialTheme.typography.titleLarge)
    Text("Sign in with your email to start. The AI runs in the Careva+ cloud, so there's nothing to download, and your chats follow you to any phone where you sign in.", color = Muted, style = MaterialTheme.typography.bodyMedium)
    Spacer(Modifier.height(18.dp))
    OutlinedTextField(
        value = email, onValueChange = { email = it }, label = { Text("Email") }, singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
        leadingIcon = { Icon(Icons.Outlined.Email, null) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
    )
    Spacer(Modifier.height(10.dp))
    OutlinedTextField(
        value = password, onValueChange = { password = it }, label = { Text("Password") }, singleLine = true,
        visualTransformation = if (show) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { vm.signIn(email, password) }),
        leadingIcon = { Icon(Icons.Outlined.Lock, null) },
        trailingIcon = { IconButton(onClick = { show = !show }) { Icon(if (show) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, if (show) "Hide password" else "Show password") } },
        modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp),
    )
    vm.authError?.let { Text(it, color = Color(0xFFB3261E), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 10.dp)) }
    vm.authInfo?.let { Text(it, color = Green, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 10.dp)) }
    Spacer(Modifier.height(16.dp))
    Button(onClick = { vm.signIn(email, password) }, enabled = !vm.authBusy, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(48.dp)) {
        if (vm.authBusy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White) else Text("Sign in")
    }
    Spacer(Modifier.height(8.dp))
    OutlinedButton(onClick = { vm.signUp(email, password) }, enabled = !vm.authBusy, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(48.dp)) { Text("Create account") }
    if (vm.authInfo != null || vm.authError?.contains("confirm") == true)
        TextButton(onClick = { vm.resendConfirmation(email) }, enabled = !vm.authBusy) { Text("Resend confirmation email") }
    Spacer(Modifier.height(12.dp))
    Text("New accounts get a confirmation email first. Use at least 6 characters for the password.", color = Muted, style = MaterialTheme.typography.bodySmall)
}

private fun ago(t: Long): String {
    val s = (System.currentTimeMillis() - t) / 1000
    return when { s < 10 -> "just now"; s < 60 -> "${s}s ago"; s < 3600 -> "${s / 60} min ago"; else -> "${s / 3600} h ago" }
}

// ---------- chat ----------

private val Serif = FontFamily.Serif
private val Danger = Color(0xFFB3261E)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatScreen(vm: ChatViewModel) {
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var picker by remember { mutableStateOf(false) }
    val ctx = LocalContext.current
    val dictation = remember { Dictation(ctx.applicationContext) }
    DisposableEffect(Unit) { onDispose { dictation.cancel() } }
    var draft by rememberSaveable { mutableStateOf("") }
    var mode by rememberSaveable { mutableStateOf(Mode.CHAT) }
    var highQuality by rememberSaveable { mutableStateOf(true) }
    ModalNavigationDrawer(drawerState = drawer, drawerContent = { ChatDrawer(vm) { scope.launch { drawer.close() } } }) {
        Scaffold(
            containerColor = Paper,
            topBar = {
                CenterAlignedTopAppBar(
                    colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = Paper),
                    navigationIcon = { IconButton(onClick = { scope.launch { drawer.open() } }) { Icon(Icons.Outlined.Menu, "Chats", tint = Ink) } },
                    title = { ModelButton(vm) { picker = true } },
                    actions = {
                        IconButton(onClick = { vm.newChat(); draft = "" }, enabled = !vm.busy) { Icon(Icons.Outlined.EditNote, "New chat", tint = Ink) }
                    },
                )
            },
        ) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).imePadding()) {
                when (val s = vm.engineState) {
                    is EngineState.Loading -> StatusBar(
                        if (s.firstTime) "Preparing ${s.model.name} for first use. This happens only once and can take 1–3 minutes."
                        else "Starting ${s.model.name}…", progress = true)
                    is EngineState.Failed -> StatusBar(s.message, progress = false, action = "Models") { vm.screen = Screen.MODELS }
                    EngineState.NoModel ->
                        if (vm.account == null) StatusBar("Sign in to start chatting.", progress = false, action = "Sign in") { vm.screen = Screen.ACCOUNT }
                        else StatusBar("Choose a model to start.", progress = false, action = "Choose") { picker = true }
                    is EngineState.Ready -> {}
                }
                val messages = vm.current?.messages.orEmpty()
                val empty = messages.isEmpty() && vm.streaming == null
                Box(Modifier.weight(1f)) {
                    if (empty) Welcome(vm, Modifier.fillMaxSize()) else Messages(vm, messages, Modifier.fillMaxSize())
                }
                if (empty && mode == Mode.CHAT) Suggestions(vm) { draft = it }
                Composer(vm, dictation, draft, { draft = it }, onSettings = { picker = true }, mode = mode, setMode = { mode = it },
                    highQuality = highQuality, setHighQuality = { highQuality = it })
            }
        }
    }
    if (picker) ModelSheet(vm) { picker = false }
}

// ---- drawer ----

private fun startOfToday() = Calendar.getInstance().apply {
    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
}.timeInMillis

private val dayGroups = listOf("Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older")

private fun dayGroup(t: Long): String {
    val today = startOfToday(); val day = 86_400_000L
    return when {
        t >= today -> "Today"
        t >= today - day -> "Yesterday"
        t >= today - 6 * day -> "Previous 7 days"
        t >= today - 29 * day -> "Previous 30 days"
        else -> "Older"
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun ChatDrawer(vm: ChatViewModel, close: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var menuFor by remember { mutableStateOf<String?>(null) }
    var renaming by remember { mutableStateOf<Chat?>(null) }
    val haptic = LocalHapticFeedback.current
    ModalDrawerSheet(drawerContainerColor = Paper, modifier = Modifier.width(310.dp)) {
        Column(Modifier.fillMaxHeight().padding(horizontal = 12.dp)) {
            Row(Modifier.fillMaxWidth().padding(start = 6.dp, top = 16.dp, bottom = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.careva_mark), null, Modifier.size(28.dp))
                Spacer(Modifier.width(10.dp))
                Text("Careva+ AI", fontFamily = Serif, fontSize = 22.sp, color = Ink)
            }
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Soft).padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Search, null, tint = Muted, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                BasicTextField(
                    value = query, onValueChange = { query = it }, singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = Ink), cursorBrush = SolidColor(Navy),
                    modifier = Modifier.weight(1f),
                    decorationBox = { inner -> Box { if (query.isEmpty()) Text("Search chats", color = Muted, style = MaterialTheme.typography.bodyMedium); inner() } },
                )
                if (query.isNotEmpty()) Icon(Icons.Outlined.Close, "Clear", tint = Muted, modifier = Modifier.size(18.dp).clickable { query = "" })
            }
            Spacer(Modifier.height(8.dp))
            DrawerRow(Icons.Outlined.EditNote, "New chat", strong = true) { vm.newChat(); close() }
            DrawerRow(Icons.Outlined.Groups, "Agents") { vm.screen = Screen.AGENTS; close() }
            val shown = vm.chats.filter { c ->
                query.isBlank() || c.title.contains(query, true) || c.messages.any { it.text.contains(query, true) }
            }
            val groups = shown.groupBy { dayGroup(it.updated) }
            LazyColumn(Modifier.weight(1f)) {
                if (shown.isEmpty()) item {
                    Text(if (query.isBlank()) "Your chats will appear here." else "No chats match “$query”.",
                        color = Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(12.dp))
                }
                dayGroups.forEach { g ->
                    val list = groups[g] ?: return@forEach
                    item(key = "h-$g") {
                        Text(g, color = Muted, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(start = 12.dp, top = 16.dp, bottom = 4.dp))
                    }
                    items(list, key = { it.id }) { c ->
                        val sel = c.id == vm.currentId
                        Box {
                            Text(
                                c.title, maxLines = 1, overflow = TextOverflow.Ellipsis, color = Ink,
                                style = MaterialTheme.typography.bodyLarge, fontWeight = if (sel) FontWeight.Medium else FontWeight.Normal,
                                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
                                    .background(if (sel) Line else Color.Transparent)
                                    .combinedClickable(
                                        onClick = { vm.open(c.id); close() },
                                        onLongClick = { haptic.performHapticFeedback(HapticFeedbackType.LongPress); menuFor = c.id },
                                    )
                                    .padding(horizontal = 12.dp, vertical = 11.dp),
                            )
                            DropdownMenu(expanded = menuFor == c.id, onDismissRequest = { menuFor = null }, containerColor = Color.White) {
                                DropdownMenuItem(text = { Text("Rename") }, leadingIcon = { Icon(Icons.Outlined.Edit, null) },
                                    onClick = { renaming = c; menuFor = null })
                                DropdownMenuItem(text = { Text("Delete", color = Danger) }, leadingIcon = { Icon(Icons.Outlined.DeleteOutline, null, tint = Danger) },
                                    onClick = { vm.delete(c.id); menuFor = null })
                            }
                        }
                    }
                }
                if (shown.isNotEmpty()) item {
                    Text("Tip: press and hold a chat to rename or delete it.", color = Muted, style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(12.dp, 16.dp))
                }
            }
            HorizontalDivider(color = Line)
            Row(
                Modifier.fillMaxWidth().padding(vertical = 8.dp).clip(RoundedCornerShape(12.dp))
                    .clickable { vm.screen = Screen.ACCOUNT; close() }.padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.size(34.dp).background(Navy, CircleShape), contentAlignment = Alignment.Center) {
                    Text(vm.account?.firstOrNull()?.uppercase() ?: "?", color = Color.White, fontWeight = FontWeight.SemiBold)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(vm.account ?: "Sign in", maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.Medium, color = Ink)
                    Text(if (vm.account != null) "Chats synced across your phones" else "Needed to use the AI", color = Muted, style = MaterialTheme.typography.bodySmall)
                }
                Icon(Icons.Outlined.Settings, "Account", tint = Muted)
            }
            Spacer(Modifier.navigationBarsPadding())
        }
    }
    renaming?.let { c -> RenameDialog(c.title, onDone = { vm.rename(c.id, it); renaming = null }, onDismiss = { renaming = null }) }
}

@Composable
private fun DrawerRow(icon: ImageVector, label: String, strong: Boolean = false, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = Ink, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(label, color = Ink, fontWeight = if (strong) FontWeight.SemiBold else FontWeight.Normal, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun RenameDialog(current: String, onDone: (String) -> Unit, onDismiss: () -> Unit) {
    var t by remember { mutableStateOf(current) }
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = Paper,
        title = { Text("Rename chat") },
        text = { OutlinedTextField(t, { t = it }, singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) },
        confirmButton = { TextButton(onClick = { onDone(t) }, enabled = t.isNotBlank()) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

// ---- empty chat ----

@Composable
private fun Welcome(vm: ChatViewModel, modifier: Modifier) {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val greet = when (hour) { in 5..11 -> "Good morning"; in 12..16 -> "Good afternoon"; else -> "Good evening" }
    val agent = vm.currentAgent
    if (agent != null) {
        Column(modifier.padding(horizontal = 28.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
            Text(agent.emoji, fontSize = 44.sp)
            Spacer(Modifier.height(12.dp))
            Text(agent.name, fontFamily = Serif, fontSize = 30.sp, color = Ink, textAlign = TextAlign.Center)
            Text(agent.instructions, color = Muted, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center,
                maxLines = 3, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 8.dp))
            TextButton(onClick = { vm.chatWith(null) }) { Text("Use the normal assistant instead") }
        }
        return
    }
    Column(modifier.padding(horizontal = 28.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Image(painterResource(R.drawable.careva_mark), null, Modifier.size(52.dp))
        Spacer(Modifier.height(18.dp))
        Text(greet, fontFamily = Serif, fontSize = 32.sp, lineHeight = 38.sp, color = Ink, textAlign = TextAlign.Center)
        Spacer(Modifier.height(6.dp))
        Text("How can I help you today?", color = Muted, style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center)
        Text("English அல்லது தமிழில் கேளுங்கள் · or tap the mic and speak", color = Muted,
            style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
    }
}

private data class Idea(val icon: ImageVector, val label: String, val prompt: String)

@Composable
private fun Suggestions(vm: ChatViewModel, onPick: (String) -> Unit) {
    if (vm.currentAgent == null && vm.agents.isNotEmpty()) {
        LazyRow(contentPadding = PaddingValues(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
            items(vm.agents, key = { it.id }) { a ->
                Row(
                    Modifier.clip(RoundedCornerShape(50)).background(Soft).clickable { vm.chatWith(a.id) }.padding(horizontal = 14.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) { Text(a.emoji); Spacer(Modifier.width(6.dp)); Text(a.name, color = Ink, style = MaterialTheme.typography.bodyMedium) }
            }
        }
    }
    if (vm.currentAgent != null) return // an agent chat starts from the agent's own job
    val ideas = listOf(
        Idea(Icons.Outlined.EditNote, "Write a message", "Write a polite message to a patient's family confirming tomorrow's nurse visit at 10 am."),
        Idea(Icons.Outlined.Translate, "தமிழில் எழுது", "தமிழில் ஒரு நன்றி செய்தி எழுதுங்கள்: "),
        Idea(Icons.Outlined.CalendarMonth, "Plan a schedule", "Plan a weekly visit schedule for 3 nurses and 12 patients, with each patient seen twice a week."),
        Idea(Icons.Outlined.Lightbulb, "Explain simply", "Explain in simple words: "),
        Idea(Icons.Outlined.Code, "Help with code", "Write a Python function that checks if an Indian mobile number is valid."),
    )
    LazyRow(
        contentPadding = PaddingValues(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(bottom = 8.dp),
    ) {
        items(ideas) { idea ->
            Row(
                Modifier.clip(RoundedCornerShape(50)).background(Color.White).border(1.dp, Line, RoundedCornerShape(50))
                    .clickable { onPick(idea.prompt) }.padding(horizontal = 14.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(idea.icon, null, tint = Muted, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text(idea.label, color = Ink, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

// ---- messages ----

/** Live progress of the reply being written. */
private data class Live(val phase: Phase, val startedAt: Long, val wordsPerSecond: Double, val step: String = "")

@Composable
private fun Messages(vm: ChatViewModel, messages: List<Msg>, modifier: Modifier) {
    val streaming = vm.streaming
    val thought = vm.streamingThought
    val live = Live(vm.phase, vm.startedAt, vm.wordsPerSecond, vm.streamingStep)
    val list = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val count = messages.size + if (streaming != null) 1 else 0
    // Follow the reply while the user is at the bottom; stop following when they scroll up to read.
    var follow by remember { mutableStateOf(true) }
    LaunchedEffect(list) { snapshotFlow { list.isScrollInProgress }.collect { if (!it) follow = !list.canScrollForward } }
    LaunchedEffect(count) { if (count > 0) { list.scrollToItem(count - 1, Int.MAX_VALUE / 2); follow = true } }
    LaunchedEffect((streaming?.length ?: 0) / 40, live.phase) { if (follow && count > 0) list.scrollToItem(count - 1, Int.MAX_VALUE / 2) }
    Box(modifier) {
        LazyColumn(Modifier.fillMaxSize(), state = list, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 16.dp)) {
            itemsIndexed(messages) { i, m ->
                if (m.isUser) UserMessage(m.text)
                else AssistantMessage(m, live = null, canRetry = i == messages.lastIndex && streaming == null && !vm.busy, onRetry = vm::retry)
            }
            if (streaming != null) item {
                AssistantMessage(Msg("assistant", Prompt.clean(streaming), thought), live = live, canRetry = false, onRetry = {})
            }
        }
        AnimatedVisibility(!follow && count > 0, enter = fadeIn(), exit = fadeOut(), modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 10.dp)) {
            Surface(
                onClick = { scope.launch { list.scrollToItem(count - 1, Int.MAX_VALUE / 2); follow = true } },
                shape = CircleShape, color = Color.White, shadowElevation = 3.dp,
                modifier = Modifier.size(38.dp).border(1.dp, Line, CircleShape),
            ) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.KeyboardArrowDown, "Scroll to the latest message", tint = Ink) } }
        }
    }
}

@Composable
private fun UserMessage(text: String) {
    Row(Modifier.fillMaxWidth().padding(top = 10.dp, bottom = 8.dp), horizontalArrangement = Arrangement.End) {
        Surface(shape = RoundedCornerShape(20.dp), color = UserBubble, modifier = Modifier.padding(start = 48.dp)) {
            SelectionContainer { Text(text, Modifier.padding(horizontal = 16.dp, vertical = 11.dp), color = Ink, style = MaterialTheme.typography.bodyLarge) }
        }
    }
}

/**
 * The collapsed "thinking" line above a reply. Tapping it opens the summary and the full reasoning;
 * by default only the one-line status is shown.
 */
@Composable
private fun ThinkingHeader(m: Msg, live: Live?, open: Boolean, toggle: () -> Unit) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    if (live != null) LaunchedEffect(Unit) { while (true) { delay(250); now = System.currentTimeMillis() } }
    val secs = live?.let { ((now - it.startedAt) / 1000).coerceAtLeast(0) }
    val active = live != null && live.phase != Phase.WRITING
    val canOpen = m.thought.isNotBlank()
    val label = when {
        live == null -> if (m.seconds > 0) "Thought for ${m.seconds}s" else "Thought process"
        live.step.isNotBlank() && live.phase != Phase.WRITING -> live.step
        live.phase == Phase.READING -> "Reading your message"
        live.phase == Phase.THINKING -> "Thinking"
        else -> "Thought process"
    }
    val pulse = rememberInfiniteTransition(label = "think")
    val a by pulse.animateFloat(0.45f, 1f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "a")
    val turn by animateFloatAsState(if (open) 180f else 0f, label = "chevron")
    Row(
        Modifier.clip(RoundedCornerShape(10.dp)).clickable(enabled = canOpen, onClick = toggle).padding(vertical = 6.dp, horizontal = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.AutoAwesome, null, tint = if (active) Green else Muted, modifier = Modifier.size(16.dp).alpha(if (active) a else 1f))
        Spacer(Modifier.width(8.dp))
        Text(label + if (active) "…" else "", color = Muted, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.alpha(if (active) a else 1f))
        if (active && secs != null) Text("  ${secs}s", color = Muted, style = MaterialTheme.typography.labelMedium)
        if (canOpen) Icon(Icons.Rounded.KeyboardArrowDown, if (open) "Hide thinking" else "Show thinking", tint = Muted, modifier = Modifier.size(20.dp).rotate(turn))
    }
}

@Composable
private fun ThoughtPanel(m: Msg, live: Live?) {
    val summary = thoughtSummary(m.thought)
    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min).padding(start = 8.dp, top = 2.dp, bottom = 10.dp)) {
        Box(Modifier.width(2.dp).fillMaxHeight().background(Line))
        Column(Modifier.padding(start = 12.dp)) {
            if (summary.isNotEmpty()) {
                Text("Summary", color = Ink, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelLarge)
                Text(summary, color = Muted, fontStyle = FontStyle.Italic, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(8.dp))
            }
            Text(
                m.thought.trim().let { if (live != null && it.length > 2500) "…" + it.takeLast(2500) else it },
                color = Muted, style = MaterialTheme.typography.bodySmall.copy(lineHeight = 19.sp),
                modifier = Modifier.heightIn(max = 340.dp).verticalScroll(rememberScrollState()),
            )
        }
    }
}

@Composable
private fun AssistantMessage(m: Msg, live: Live?, canRetry: Boolean, onRetry: () -> Unit) {
    val clipboard = LocalClipboardManager.current
    val haptic = LocalHapticFeedback.current
    val ctx = LocalContext.current
    var open by remember { mutableStateOf(false) }
    var details by remember { mutableStateOf(false) }
    var copied by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(copied) { if (copied) { delay(1500); copied = false } }
    Column(Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 12.dp)) {
        val showHeader = m.thought.isNotBlank() || (live != null && live.phase != Phase.WRITING)
        if (showHeader) ThinkingHeader(m, live, open) { open = !open }
        AnimatedVisibility(open && m.thought.isNotBlank()) { ThoughtPanel(m, live) }
        if (m.image.isNotEmpty()) GeneratedImage(m.image)
        if (m.video.isNotEmpty()) GeneratedVideo(m.video, m.model)
        if (m.text.isNotEmpty()) SelectionContainer {
            Text(markdown(m.text), color = Ink, style = MaterialTheme.typography.bodyLarge.copy(lineHeight = 25.sp), modifier = Modifier.padding(top = 2.dp))
        }
        if (live == null) {
            Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                if (m.text.isNotEmpty()) SmallAction(if (copied) Icons.Outlined.Check else Icons.Outlined.ContentCopy, if (copied) "Copied" else "Copy") {
                    clipboard.setText(AnnotatedString(m.text)); copied = true
                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                }
                if (m.video.isNotEmpty() && !m.video.startsWith("pending:")) SmallAction(Icons.Outlined.Share, "Share video") {
                    scope.launch(Dispatchers.IO) { ImageCache.shareVideo(ctx, m.video) }
                }
                else if (m.image.isNotEmpty() && !m.image.startsWith("pending:")) SmallAction(Icons.Outlined.Share, "Share image") { ImageCache.share(ctx, m.image) }
                else if (m.image.isNotEmpty() || m.video.isNotEmpty()) {}
                else SmallAction(Icons.Outlined.Share, "Share") {
                    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, m.text)
                    ctx.startActivity(Intent.createChooser(send, "Share reply").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                }
                if (canRetry && m.image.isEmpty() && m.video.isEmpty()) SmallAction(Icons.Outlined.Refresh, "Retry", onRetry)
                if (m.stats.isNotEmpty() || m.model.isNotEmpty()) SmallAction(Icons.Outlined.Info, "Details") { details = !details }
            }
            AnimatedVisibility(details) {
                Text(listOf("${m.model} · ${m.effort} effort".trim(' ', '·'), m.stats).filter { it.isNotBlank() }.joinToString("\n"),
                    color = Muted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(start = 8.dp, top = 2.dp))
            }
        }
    }
}

@Composable
private fun SmallAction(icon: ImageVector, label: String, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.size(36.dp)) { Icon(icon, label, tint = Muted, modifier = Modifier.size(18.dp)) }
}

// ---- generated images ----

@Composable
private fun GeneratedImage(url: String) {
    val ctx = LocalContext.current
    var attempt by remember { mutableIntStateOf(0) }
    var full by remember { mutableStateOf(false) }
    if (url.startsWith("pending:")) { MediaPending(url, "Creating image", "Usually 5–30 seconds", square = true); return }
    val bitmap by produceState<android.graphics.Bitmap?>(null, url, attempt) {
        value = withContext(Dispatchers.IO) { ImageCache.load(ctx.applicationContext, url) }
        if (value == null) value = null
    }
    var failed by remember(url, attempt) { mutableStateOf(false) }
    LaunchedEffect(url, attempt) { delay(150_000); if (bitmap == null) failed = true }
    val shape = RoundedCornerShape(18.dp)
    Box(
        Modifier.padding(vertical = 4.dp).fillMaxWidth(0.86f).aspectRatio(1f).clip(shape).background(Soft).border(1.dp, Line, shape)
            .clickable(enabled = bitmap != null || failed) { if (bitmap != null) full = true else { failed = false; attempt++ } },
        contentAlignment = Alignment.Center,
    ) {
        val b = bitmap
        when {
            b != null -> Image(b.asImageBitmap(), "Generated image", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            failed -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Outlined.BrokenImage, null, tint = Muted)
                Text("Couldn't load the image. Tap to try again.", color = Muted, style = MaterialTheme.typography.bodySmall)
            }
            else -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(Modifier.size(26.dp), strokeWidth = 2.5.dp, color = Green)
                Spacer(Modifier.height(10.dp))
                Pulsing("Creating image…")
            }
        }
    }
    val b = bitmap
    if (full && b != null) Dialog(onDismissRequest = { full = false }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(Modifier.fillMaxSize().background(Color.Black).padding(16.dp), verticalArrangement = Arrangement.Center) {
            Image(b.asImageBitmap(), "Generated image", contentScale = ContentScale.Fit, modifier = Modifier.fillMaxWidth().weight(1f))
            Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterHorizontally)) {
                FilledTonalButton(onClick = {
                    val ok = ImageCache.saveToGallery(ctx, url) != null
                    android.widget.Toast.makeText(ctx, if (ok) "Saved to Pictures/Careva+" else "Use Share to save on this phone", android.widget.Toast.LENGTH_SHORT).show()
                }) { Icon(Icons.Outlined.Download, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Save") }
                FilledTonalButton(onClick = { ImageCache.share(ctx, url) }) { Icon(Icons.Outlined.Share, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Share") }
                FilledTonalButton(onClick = { full = false }) { Text("Close") }
            }
        }
    }
}

@Composable
private fun Pulsing(text: String) {
    val t = rememberInfiniteTransition(label = "pulse")
    val a by t.animateFloat(0.35f, 1f, infiniteRepeatable(tween(700), RepeatMode.Reverse), label = "a")
    Text(text, color = Muted, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.alpha(a))
}

/** What the composer sends: a chat message, or a request to create an image or a video. */
enum class Mode { CHAT, IMAGE, VIDEO }

/** A placeholder while an image or video is being made, with the time so far. */
@Composable
private fun MediaPending(tag: String, label: String, hint: String, square: Boolean) {
    val started = tag.removePrefix("pending:").toLongOrNull() ?: System.currentTimeMillis()
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(1000); now = System.currentTimeMillis() } }
    val secs = (now - started) / 1000
    val stale = secs > 15 * 60 // the app was closed while it was being made
    val shape = RoundedCornerShape(18.dp)
    Box(
        Modifier.padding(vertical = 4.dp).fillMaxWidth(0.86f).aspectRatio(if (square) 1f else 16f / 9f).clip(shape).background(Soft).border(1.dp, Line, shape),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(16.dp)) {
            if (stale) {
                Icon(Icons.Outlined.BrokenImage, null, tint = Muted)
                Text("This didn't finish. Please try again.", color = Muted, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            } else {
                CircularProgressIndicator(Modifier.size(26.dp), strokeWidth = 2.5.dp, color = Green)
                Spacer(Modifier.height(10.dp))
                Pulsing("$label… ${secs}s")
                Text(hint, color = Muted, style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center)
            }
        }
    }
}

/** Plays a generated video inside the chat, with save and share. */
@Composable
private fun GeneratedVideo(url: String, model: String) {
    if (url.startsWith("pending:")) {
        MediaPending(url, "Creating video", if (model.contains("Veo")) "About 1–3 minutes · ${model}" else "About 1–2 minutes", square = false)
        return
    }
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var ratio by remember(url) { mutableFloatStateOf(16f / 9f) }
    var playing by remember(url) { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(18.dp)
    Column(Modifier.padding(vertical = 4.dp).fillMaxWidth(0.92f)) {
        Box(Modifier.fillMaxWidth().aspectRatio(ratio).clip(shape).background(Color.Black), contentAlignment = Alignment.Center) {
            androidx.compose.ui.viewinterop.AndroidView(
                factory = { c ->
                    android.widget.VideoView(c).apply {
                        setVideoURI(android.net.Uri.parse(url))
                        setOnPreparedListener { mp ->
                            mp.isLooping = true
                            if (mp.videoHeight > 0) ratio = mp.videoWidth.toFloat() / mp.videoHeight
                            seekTo(1) // show the first frame
                        }
                        setOnCompletionListener { playing = false }
                    }
                },
                update = { v -> if (playing && !v.isPlaying) v.start() else if (!playing && v.isPlaying) v.pause() },
                modifier = Modifier.fillMaxSize().clickable { playing = !playing },
            )
            if (!playing) Surface(onClick = { playing = true }, shape = CircleShape, color = Color.White.copy(alpha = 0.9f), modifier = Modifier.size(56.dp)) {
                Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.PlayArrow, "Play video", tint = Ink, modifier = Modifier.size(32.dp)) }
            }
        }
        Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilledTonalButton(onClick = {
                saving = true
                scope.launch {
                    val ok = withContext(Dispatchers.IO) { ImageCache.saveVideo(ctx, url) != null }
                    saving = false
                    android.widget.Toast.makeText(ctx, if (ok) "Saved to Movies/Careva+" else "Use Share to save on this phone", android.widget.Toast.LENGTH_SHORT).show()
                }
            }, enabled = !saving, colors = ButtonDefaults.filledTonalButtonColors(containerColor = Soft, contentColor = Navy)) {
                Icon(Icons.Outlined.Download, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text(if (saving) "Saving…" else "Save")
            }
            FilledTonalButton(onClick = { scope.launch(Dispatchers.IO) { ImageCache.shareVideo(ctx, url) } },
                colors = ButtonDefaults.filledTonalButtonColors(containerColor = Soft, contentColor = Navy)) {
                Icon(Icons.Outlined.Share, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Share")
            }
        }
    }
}

// ---- agents ----

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AgentsScreen(vm: ChatViewModel) {
    BackHandler { vm.screen = Screen.CHAT }
    var editing by remember { mutableStateOf<Agent?>(null) }
    Scaffold(
        containerColor = Paper,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Paper),
                navigationIcon = { IconButton(onClick = { vm.screen = Screen.CHAT }) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back") } },
                title = { Text("Agents", fontWeight = FontWeight.SemiBold) },
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(onClick = { editing = Agent(name = "", instructions = "") }, containerColor = Navy, contentColor = Color.White,
                icon = { Icon(Icons.Rounded.Add, null) }, text = { Text("New agent") })
        },
    ) { pad ->
        LazyColumn(Modifier.fillMaxSize().padding(pad), contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Text("An agent is your own assistant with its own job and instructions. Make one for each task you repeat, then start a chat with it. Your agents sync to all your phones.",
                    color = Muted, style = MaterialTheme.typography.bodyMedium)
            }
            if (vm.agents.isEmpty()) item {
                Text("You have no agents yet. Add a ready-made one below or tap New agent.", color = Ink, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 8.dp))
            }
            items(vm.agents, key = { it.id }) { a -> AgentCard(a, onChat = { vm.chatWith(a.id) }, onEdit = { editing = a }) }
            val unused = AgentTemplates.all.filter { t -> vm.agents.none { it.name == t.name } }
            if (unused.isNotEmpty()) {
                item { Text("Ready-made agents", fontWeight = FontWeight.Bold, color = Navy, modifier = Modifier.padding(top = 12.dp)) }
                items(unused, key = { "t-" + it.name }) { t ->
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)).background(Color.White).padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(t.emoji, fontSize = 24.sp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(t.name, fontWeight = FontWeight.SemiBold, color = Ink)
                            Text(t.instructions, color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                        TextButton(onClick = { vm.saveAgent(t.copy(id = java.util.UUID.randomUUID().toString())) }) { Text("Add") }
                    }
                }
            }
        }
    }
    editing?.let { a -> AgentEditor(a, onSave = { vm.saveAgent(it); editing = null }, onDelete = { vm.deleteAgent(a.id); editing = null }, onDismiss = { editing = null },
        isNew = vm.agents.none { it.id == a.id }) }
}

@Composable
private fun AgentCard(a: Agent, onChat: () -> Unit, onEdit: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(Color.White).border(1.dp, Line, RoundedCornerShape(16.dp))
            .clickable(onClick = onChat).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(44.dp).background(Soft, CircleShape), contentAlignment = Alignment.Center) { Text(a.emoji, fontSize = 22.sp) }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(a.name, fontWeight = FontWeight.SemiBold, color = Ink)
            Text(a.instructions, color = Muted, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        IconButton(onClick = onEdit) { Icon(Icons.Outlined.Edit, "Edit ${a.name}", tint = Muted) }
        FilledTonalButton(onClick = onChat, contentPadding = PaddingValues(horizontal = 14.dp), colors = ButtonDefaults.filledTonalButtonColors(containerColor = Soft, contentColor = Navy)) { Text("Chat") }
    }
}

@Composable
private fun AgentEditor(a: Agent, isNew: Boolean, onSave: (Agent) -> Unit, onDelete: () -> Unit, onDismiss: () -> Unit) {
    var emoji by remember { mutableStateOf(a.emoji) }
    var name by remember { mutableStateOf(a.name) }
    var instructions by remember { mutableStateOf(a.instructions) }
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = Paper,
        title = { Text(if (isNew) "New agent" else "Edit agent") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(emoji, { emoji = it.take(4) }, label = { Text("Emoji") }, singleLine = true, modifier = Modifier.width(84.dp), shape = RoundedCornerShape(12.dp))
                    Spacer(Modifier.width(8.dp))
                    OutlinedTextField(name, { name = it.take(40) }, label = { Text("Name") }, singleLine = true, modifier = Modifier.weight(1f), shape = RoundedCornerShape(12.dp))
                }
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(instructions, { instructions = it.take(4000) }, label = { Text("What should it do?") },
                    placeholder = { Text("For example: You write short, friendly WhatsApp replies to patients' families in Tamil and English.") },
                    minLines = 5, maxLines = 10, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp))
                if (!isNew) TextButton(onClick = onDelete, modifier = Modifier.padding(top = 4.dp)) { Text("Delete agent", color = Danger) }
            }
        },
        confirmButton = {
            TextButton(onClick = { onSave(a.copy(emoji = emoji, name = name, instructions = instructions)) }, enabled = name.isNotBlank() && instructions.isNotBlank()) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

// ---- composer with voice typing ----

@Composable
private fun Composer(
    vm: ChatViewModel, dictation: Dictation, text: String, setText: (String) -> Unit, onSettings: () -> Unit,
    mode: Mode, setMode: (Mode) -> Unit, highQuality: Boolean, setHighQuality: (Boolean) -> Unit,
) {
    var menu by remember { mutableStateOf(false) }
    val ctx = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val ready = vm.engineState is EngineState.Ready
    var base by remember { mutableStateOf("") } // what was typed before dictation started
    fun join(a: String, b: String) = listOf(a.trimEnd(), b.trim()).filter { it.isNotBlank() }.joinToString(" ")
    fun startVoice() { base = text; dictation.start { heard -> setText(join(base, heard)) } }
    val systemVoice = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        r.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.let { setText(join(text, it)) }
    }
    val askMic = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) startVoice() else dictation.error = "Allow the microphone to talk instead of typing."
    }
    fun mic() {
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        when {
            dictation.listening -> dictation.stop()
            !dictation.inAppAvailable() -> try { systemVoice.launch(dictation.systemIntent()) } catch (_: ActivityNotFoundException) {
                dictation.error = "This phone has no voice typing. Install the Google app to talk instead of typing."
            }
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED -> startVoice()
            else -> askMic.launch(Manifest.permission.RECORD_AUDIO)
        }
    }
    val shown = if (dictation.listening) join(base, dictation.partial) else text
    val canSend = shown.isNotBlank() && ready && !vm.busy
    fun send() {
        if (dictation.listening) dictation.cancel()
        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        when (mode) {
            Mode.IMAGE -> vm.createImage(shown, best = highQuality)
            Mode.VIDEO -> vm.createVideo(shown, pro = highQuality)
            Mode.CHAT -> vm.send(shown)
        }
        setText("")
    }
    Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(start = 10.dp, end = 10.dp, bottom = 6.dp)) {
        dictation.error?.let { err ->
            Row(
                Modifier.fillMaxWidth().padding(bottom = 6.dp).clip(RoundedCornerShape(12.dp)).background(Soft).padding(start = 12.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.MicOff, null, tint = Muted, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text(err, color = Ink, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                IconButton(onClick = { dictation.error = null }, modifier = Modifier.size(32.dp)) { Icon(Icons.Outlined.Close, "Dismiss", tint = Muted, modifier = Modifier.size(16.dp)) }
            }
        }
        Surface(
            shape = RoundedCornerShape(24.dp), color = Color.White, shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth().border(1.dp, if (dictation.listening) Green else Line, RoundedCornerShape(24.dp)),
        ) {
            Column(Modifier.padding(start = 16.dp, end = 8.dp, top = 14.dp, bottom = 8.dp)) {
                BasicTextField(
                    value = shown, onValueChange = { if (!dictation.listening) setText(it) }, readOnly = dictation.listening,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(color = Ink), cursorBrush = SolidColor(Navy), maxLines = 8,
                    modifier = Modifier.fillMaxWidth().padding(end = 8.dp),
                    decorationBox = { inner ->
                        Box {
                            if (shown.isEmpty()) Text(
                                if (dictation.listening) (if (dictation.lang == VoiceLang.TAMIL) "கேட்கிறேன்… பேசுங்கள்" else "Listening… speak now")
                                else if (mode == Mode.IMAGE) "Describe the image to create"
                                else if (mode == Mode.VIDEO) "Describe the video scene to create"
                                else "Message ${vm.currentAgent?.name ?: vm.activeModel?.name ?: "Careva+ AI"}",
                                color = Muted, style = MaterialTheme.typography.bodyLarge,
                            )
                            inner()
                        }
                    },
                )
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box {
                        Surface(onClick = { menu = true }, shape = CircleShape, color = Color.Transparent, modifier = Modifier.size(32.dp).border(1.dp, Line, CircleShape)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.Add, "More", tint = Ink, modifier = Modifier.size(18.dp)) }
                        }
                        DropdownMenu(expanded = menu, onDismissRequest = { menu = false }, containerColor = Color.White) {
                            if (mode != Mode.CHAT) DropdownMenuItem(text = { Text("Back to chat") }, leadingIcon = { Icon(Icons.Outlined.ChatBubbleOutline, null) },
                                onClick = { setMode(Mode.CHAT); menu = false })
                            if (mode != Mode.IMAGE) DropdownMenuItem(text = { Text("Create image") }, leadingIcon = { Icon(Icons.Outlined.Image, null) },
                                onClick = { setMode(Mode.IMAGE); menu = false })
                            if (mode != Mode.VIDEO) DropdownMenuItem(text = { Text("Create video") }, leadingIcon = { Icon(Icons.Outlined.Movie, null) },
                                onClick = { setMode(Mode.VIDEO); menu = false })
                            DropdownMenuItem(text = { Text("Agents") }, leadingIcon = { Icon(Icons.Outlined.Groups, null) },
                                onClick = { vm.screen = Screen.AGENTS; menu = false })
                            DropdownMenuItem(text = { Text("Model and effort") }, leadingIcon = { Icon(Icons.Outlined.Tune, null) },
                                onClick = { onSettings(); menu = false })
                        }
                    }
                    Spacer(Modifier.width(6.dp))
                    when (mode) {
                        Mode.IMAGE -> {
                            Pill(Icons.Outlined.Image, "Image ✕") { setMode(Mode.CHAT) }
                            Spacer(Modifier.width(6.dp))
                            Pill(Icons.Outlined.AutoAwesome, if (highQuality) "Best" else "Fast") { setHighQuality(!highQuality) }
                        }
                        Mode.VIDEO -> {
                            Pill(Icons.Outlined.Movie, "Video ✕") { setMode(Mode.CHAT) }
                            Spacer(Modifier.width(6.dp))
                            Pill(Icons.Outlined.AutoAwesome, if (highQuality) "Pro" else "Standard") { setHighQuality(!highQuality) }
                        }
                        Mode.CHAT -> Pill(Icons.Outlined.Tune, vm.effort.label, onClick = onSettings)
                    }
                    Spacer(Modifier.width(6.dp))
                    if (mode == Mode.CHAT || dictation.listening) Pill(Icons.Outlined.Translate, dictation.lang.label) {
                        dictation.chooseLang(if (dictation.lang == VoiceLang.ENGLISH) VoiceLang.TAMIL else VoiceLang.ENGLISH)
                    }
                    Spacer(Modifier.weight(1f))
                    if (dictation.listening) { Waveform(dictation.level); Spacer(Modifier.width(6.dp)) }
                    MicButton(dictation.listening, dictation.level, ::mic)
                    Spacer(Modifier.width(6.dp))
                    val stop = vm.busy
                    FilledIconButton(
                        onClick = { if (stop) vm.stop() else if (canSend) send() },
                        enabled = stop || canSend,
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = if (stop) Ink else Navy, disabledContainerColor = Line),
                        modifier = Modifier.size(38.dp),
                    ) { Icon(if (stop) Icons.Rounded.Stop else Icons.Rounded.ArrowUpward, if (stop) "Stop" else "Send", tint = Color.White, modifier = Modifier.size(20.dp)) }
                }
            }
        }
        Text(
            "Careva+ AI can make mistakes. Please check important information.",
            color = Muted, style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
        )
    }
}

@Composable
private fun Pill(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        Modifier.clip(RoundedCornerShape(50)).border(1.dp, Line, RoundedCornerShape(50)).clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = Muted, modifier = Modifier.size(14.dp))
        Spacer(Modifier.width(5.dp))
        Text(label, color = Ink, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun MicButton(listening: Boolean, level: Float, onClick: () -> Unit) {
    val ring by animateFloatAsState(if (listening) 1f + level * 0.45f else 1f, tween(120), label = "ring")
    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(38.dp)) {
        if (listening) Box(Modifier.size(38.dp).scale(ring).background(Green.copy(alpha = 0.18f), CircleShape))
        Surface(
            onClick = onClick, shape = CircleShape, color = if (listening) Green else Color.Transparent,
            modifier = Modifier.size(38.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(if (listening) Icons.Rounded.Mic else Icons.Outlined.Mic, if (listening) "Stop listening" else "Speak instead of typing",
                    tint = if (listening) Color.White else Ink, modifier = Modifier.size(21.dp))
            }
        }
    }
}

/** Five bars that move with the voice. */
@Composable
private fun Waveform(level: Float) {
    val shape = listOf(0.45f, 0.8f, 1f, 0.7f, 0.5f)
    val t = rememberInfiniteTransition(label = "wave")
    val wobble by t.animateFloat(0.75f, 1f, infiniteRepeatable(tween(260), RepeatMode.Reverse), label = "w")
    Row(horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.CenterVertically, modifier = Modifier.height(24.dp)) {
        shape.forEachIndexed { i, s ->
            val h by animateFloatAsState(4f + 20f * s * (0.15f + level) * (if (i % 2 == 0) wobble else 1.75f - wobble), tween(110), label = "bar$i")
            Box(Modifier.width(3.dp).height(h.coerceIn(4f, 24f).dp).background(Green, RoundedCornerShape(2.dp)))
        }
    }
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
            Text((vm.currentAgent?.let { "${it.emoji} ${it.name} · " } ?: "") + "${vm.effort.label} effort",
                color = Muted, style = MaterialTheme.typography.labelSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
            val choices = (if (vm.account != null) Catalog.cloud else emptyList()) + installed
            choices.forEach { m ->
                val sel = vm.activeModelId == m.id
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (sel) Color.White else Color.Transparent)
                        .border(1.dp, if (sel) Green else Color.Transparent, RoundedCornerShape(14.dp))
                        .clickable { vm.selectModel(m.id) }.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(m.name, fontWeight = FontWeight.SemiBold)
                            Spacer(Modifier.width(6.dp))
                            Icon(if (m.cloud) Icons.Outlined.Cloud else Icons.Outlined.PhoneAndroid, if (m.cloud) "Cloud" else "On this phone", tint = Muted, modifier = Modifier.size(14.dp))
                        }
                        Text(m.bestFor, color = Muted, style = MaterialTheme.typography.bodySmall)
                    }
                    RadioButton(selected = sel, onClick = { vm.selectModel(m.id) })
                }
            }
            TextButton(onClick = { onClose(); vm.screen = Screen.MODELS }) {
                Icon(Icons.Outlined.Info, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp))
                Text("About the models")
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

private val bulletLine = Regex("^(\\s*)[-*•]\\s+")
private val numberLine = Regex("^(\\s*)(\\d{1,3})[.)]\\s+")
private val headingLine = Regex("^#{1,6}\\s+")

/**
 * Markdown for chat replies. List items are their own paragraphs with a hanging indent, so wrapped lines
 * line up under the text rather than under the bullet.
 */
fun markdown(text: String): AnnotatedString = buildAnnotatedString {
    var inCode = false
    val lines = text.split("\n")
    var newlineOwed = false // a plain line ended and the next one needs a line break
    fun para(indentSp: Float, block: AnnotatedString.Builder.() -> Unit) {
        if (newlineOwed) { newlineOwed = false } // the paragraph itself starts on a new line
        withStyle(ParagraphStyle(textIndent = TextIndent(firstLine = 0.sp, restLine = indentSp.sp))) { block() }
    }
    for (line in lines) {
        if (line.trimStart().startsWith("```")) { inCode = !inCode; continue }
        val bullet = if (!inCode) bulletLine.find(line) else null
        val number = if (!inCode && bullet == null) numberLine.find(line) else null
        when {
            bullet != null -> {
                val nest = bullet.groupValues[1].length / 2
                para(18f + nest * 14f) { append("   ".repeat(nest) + "•  "); inline(line.substring(bullet.range.last + 1)) }
            }
            number != null -> para(24f) { append(number.groupValues[2] + ".  "); inline(line.substring(number.range.last + 1)) }
            else -> {
                if (newlineOwed) append("\n")
                when {
                    inCode -> withStyle(SpanStyle(fontFamily = FontFamily.Monospace, background = CodeBg, fontSize = 14.sp)) { append(line) }
                    headingLine.containsMatchIn(line) ->
                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, fontSize = 18.sp)) { inline(line.replace(headingLine, "")) }
                    else -> inline(line)
                }
                newlineOwed = true
            }
        }
    }
}
