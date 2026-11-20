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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
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
        Screen.ACCOUNT -> AccountScreen(vm)
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
                    HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 6.dp))
                    NavigationDrawerItem(
                        icon = { Icon(if (vm.account != null) Icons.Outlined.CloudDone else Icons.Outlined.AccountCircle, null) },
                        label = {
                            Column {
                                Text(vm.account ?: "Sign in to sync", maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
                                Text(if (vm.account != null) "Chats synced across your phones" else "Needed to use the AI", color = Muted, style = MaterialTheme.typography.bodySmall)
                            }
                        },
                        selected = false, onClick = { vm.screen = Screen.ACCOUNT; scope.launch { drawer.close() } },
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
                    title = { ModelButton(vm) { picker = true } },
                    actions = { IconButton(onClick = vm::newChat, enabled = !vm.busy) { Icon(Icons.Outlined.EditNote, "New chat") } },
                )
            },
        ) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).imePadding()) {
                when (val s = vm.engineState) {
                    is EngineState.Loading -> StatusBar(
                        if (s.firstTime) "Preparing ${s.model.name} for first use. This happens only once and can take 1–3 minutes; later starts take seconds."
                        else "Starting ${s.model.name}…", progress = true)
                    is EngineState.Failed -> StatusBar(s.message, progress = false, action = "Models") { vm.screen = Screen.MODELS }
                    EngineState.NoModel -> StatusBar("No model selected.", progress = false, action = "Choose") { vm.screen = Screen.MODELS }
                    is EngineState.Ready -> {}
                }
                val messages = vm.current?.messages.orEmpty()
                if (messages.isEmpty() && vm.streaming == null) Welcome(vm, Modifier.weight(1f))
                else Messages(messages, vm.streaming, vm.streamingThought, Live(vm.phase, vm.startedAt, vm.wordsPerSecond), Modifier.weight(1f))
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

/** Live progress of the reply being written. */
private data class Live(val phase: Phase, val startedAt: Long, val wordsPerSecond: Double)

@Composable
private fun Messages(messages: List<Msg>, streaming: String?, thought: String, live: Live, modifier: Modifier) {
    val list = rememberLazyListState()
    val count = messages.size + if (streaming != null) 1 else 0
    // Follow the reply as it grows, without re-scrolling on every word.
    LaunchedEffect(count, (streaming?.length ?: 0) / 60, thought.length / 120, live.phase) {
        if (count > 0) list.scrollToItem(count - 1, Int.MAX_VALUE / 2)
    }
    LazyColumn(modifier.fillMaxWidth(), state = list, contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)) {
        items(messages) { m -> if (m.isUser) UserMessage(m.text) else AssistantMessage(m, live = null) }
        if (streaming != null) item { AssistantMessage(Msg("assistant", Prompt.clean(streaming), thought), live = live) }
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

/** What the AI is doing right now: phase, a one-line summary of its current thought, a timer and the writing speed. */
@Composable
private fun ActivityLine(live: Live, thought: String) {
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(250); now = System.currentTimeMillis() } }
    val secs = ((now - live.startedAt) / 1000).coerceAtLeast(0)
    val pulse = rememberInfiniteTransition(label = "dot")
    val a by pulse.animateFloat(0.25f, 1f, infiniteRepeatable(tween(650), RepeatMode.Reverse), label = "a")
    Row(
        Modifier.fillMaxWidth().padding(bottom = 6.dp).background(Soft, RoundedCornerShape(12.dp)).padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(8.dp).alpha(a).background(Green, CircleShape))
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(live.phase.label + "…", color = Ink, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyMedium)
            if (live.phase == Phase.THINKING) {
                val summary = thoughtSummary(thought)
                if (summary.isNotEmpty()) Text(summary, color = Muted, fontStyle = FontStyle.Italic, style = MaterialTheme.typography.bodySmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
        Spacer(Modifier.width(8.dp))
        Text(
            "${secs}s" + if (live.phase == Phase.WRITING && live.wordsPerSecond > 0) " · %.0f words/s".format(live.wordsPerSecond) else "",
            color = Muted, style = MaterialTheme.typography.labelSmall,
        )
    }
}

@Composable
private fun AssistantMessage(m: Msg, live: Live?) {
    val clipboard = LocalClipboardManager.current
    var showThought by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Image(painterResource(R.drawable.careva_mark), null, Modifier.size(28.dp).padding(top = 2.dp))
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            if (live != null) ActivityLine(live, m.thought)
            if (m.thought.isNotBlank()) {
                Row(
                    Modifier.clip(RoundedCornerShape(10.dp)).clickable { showThought = !showThought }.padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.Psychology, null, tint = Muted, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        when { live != null -> if (showThought) "Hide thinking" else "Show thinking"; m.seconds > 0 -> "Thought for ${m.seconds}s"; else -> "Thoughts" },
                        color = Muted, style = MaterialTheme.typography.bodyMedium,
                    )
                    Icon(Icons.Rounded.KeyboardArrowDown, null, tint = Muted, modifier = Modifier.size(18.dp))
                }
                AnimatedVisibility(showThought) {
                    Text(
                        m.thought.trim().let { if (live != null) it.takeLast(1500) else it },
                        color = Muted, style = MaterialTheme.typography.bodySmall.copy(lineHeight = 18.sp),
                        modifier = Modifier.padding(start = 8.dp, top = 4.dp, bottom = 8.dp).background(Soft, RoundedCornerShape(10.dp)).padding(10.dp),
                    )
                }
            }
            if (m.text.isNotEmpty()) SelectionContainer {
                Text(markdown(m.text + if (live != null) " ▍" else ""), color = Ink, style = MaterialTheme.typography.bodyLarge.copy(lineHeight = 24.sp))
            }
            if (live == null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { clipboard.setText(AnnotatedString(m.text)) }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Outlined.ContentCopy, "Copy", tint = Muted, modifier = Modifier.size(18.dp))
                    }
                    if (m.model.isNotEmpty()) Text("${m.model} · ${m.effort}", color = Muted, style = MaterialTheme.typography.labelSmall)
                }
                if (m.stats.isNotEmpty()) Text(m.stats, color = Muted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.padding(start = 10.dp))
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
            if (vm.activeModel?.cloud == false) "Runs privately on your phone. It can make mistakes; check important information."
            else "Runs in the Careva+ cloud. It can make mistakes; check important information.",
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
