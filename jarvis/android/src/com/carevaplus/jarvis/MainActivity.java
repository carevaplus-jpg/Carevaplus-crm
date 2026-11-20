package com.carevaplus.jarvis;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.text.InputType;
import android.text.format.DateFormat;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.EditText;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener, ModelDownloads.Watcher, SyncManager.Watcher {

    private static final int REQ_VOICE = 42;
    private static final int MAX_HISTORY = 20;

    /** Quick actions for everyday Careva+ work: {chip label, text put in the message box}. */
    private static final String[][] QUICK = {
            {"✉  Reply to enquiry", "Draft a warm WhatsApp reply to this new enquiry and list the details I should collect: "},
            {"🔔  Follow-up", "Write a short, polite follow-up message to a family who enquired 2 days ago about "},
            {"📅  Shift plan", "Make a clear shift plan for these nurses/caretakers and patients: "},
            {"💰  Quotation", "Prepare a simple quotation for: "},
            {"🧾  Invoice", "Write an invoice message for: "},
            {"📣  Social post", "Write an Instagram post (with hashtags) about our "},
            {"📋  Staff notice", "Write a short notice to all nurses and caretakers about "},
    };

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final List<ChatStore.Msg> msgs = new ArrayList<>();

    private SharedPreferences prefs;
    private LinearLayout chat;
    private ScrollView scroll;
    private EditText input;
    private Button sendBtn;
    private TextView chip;
    private ArcView arc;
    private View welcome;
    private View typing;
    private TextView liveBubble;
    private ValueAnimator typingAnim;
    private TextToSpeech tts;
    private boolean ttsReady;
    private boolean busy;
    private Brain activeBrain;
    private String lastShownDownload = "";

    private int dp(float v) { return Ui.dp(this, v); }

    // ------------------------------------------------------------------ lifecycle

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = BrainFactory.prefs(this);
        BrainFactory.migrate(prefs);
        getWindow().setStatusBarColor(Ui.BG_TOP);
        getWindow().setNavigationBarColor(Ui.PANEL);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        setContentView(buildUi());
        tts = new TextToSpeech(this, this);

        msgs.addAll(ChatStore.load(prefs));
        if (msgs.isEmpty()) showWelcome();
        else for (ChatStore.Msg m : msgs) addView(m);
        scrollToBottom();

        if (!prefs.contains(BrainFactory.K_BRAIN)) {
            ui.postDelayed(() -> startActivity(new Intent(this, SettingsActivity.class)), 600);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        ModelDownloads.watch(this);
        SyncManager.watch(this);
        onChange();
        if (SyncManager.signedIn(prefs)) SyncManager.syncNow(prefs, null);   // fetch changes made on another phone
    }

    @Override
    protected void onPause() {
        ModelDownloads.unwatch(this);
        SyncManager.unwatch(this);
        SyncManager.markDirty(prefs);
        super.onPause();
    }

    /** A sync finished: if another phone changed the chat, show the new version. */
    @Override
    public void onSyncChange() {
        refreshChip(null);
        if (busy) return;
        List<ChatStore.Msg> stored = ChatStore.load(prefs);
        boolean same = stored.size() == msgs.size()
                && (stored.isEmpty() || stored.get(stored.size() - 1).time == msgs.get(msgs.size() - 1).time);
        if (same) return;
        msgs.clear();
        msgs.addAll(stored);
        chat.removeAllViews();
        welcome = null;
        if (msgs.isEmpty()) showWelcome();
        else for (ChatStore.Msg m : msgs) addView(m);
        scrollToBottom();
    }

    @Override
    public void onInit(int result) {
        if (result == TextToSpeech.SUCCESS && tts != null) {
            ttsReady = true;
            tts.setLanguage(Locale.getDefault());
            tts.setPitch(0.9f);
            tts.setSpeechRate(1.0f);
        }
    }

    @Override
    protected void onDestroy() {
        if (activeBrain != null) activeBrain.stop();
        worker.execute(LocalBrain::unload);
        worker.shutdown();
        if (typingAnim != null) typingAnim.cancel();
        if (tts != null) { tts.stop(); tts.shutdown(); }
        super.onDestroy();
    }

    /** Download progress / result, and the status chip. */
    @Override
    public void onChange() {
        if (!ModelDownloads.running && !ModelDownloads.lastResult.isEmpty()
                && !ModelDownloads.lastResult.equals(lastShownDownload)) {
            lastShownDownload = ModelDownloads.lastResult;
            addMessage(ModelDownloads.lastOk ? "note" : "error", ModelDownloads.lastResult);
        }
        if (ModelDownloads.running) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        refreshChip(null);
    }

    // ------------------------------------------------------------------ layout

    private View buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackground(Ui.gradient(Ui.BG_TOP, Ui.BG_BOTTOM));
        root.setFitsSystemWindows(true);

        // Header: animated core, title, brain chip, actions
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(14), dp(10), dp(6), dp(10));
        arc = new ArcView(this);
        header.addView(arc, new LinearLayout.LayoutParams(dp(46), dp(46)));

        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setPadding(dp(12), 0, 0, 0);
        TextView title = new TextView(this);
        title.setText("J.A.R.V.I.S.");
        title.setTextColor(Ui.ACCENT);
        title.setTextSize(19);
        title.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        title.setLetterSpacing(0.14f);
        titles.addView(title);
        chip = new TextView(this);
        chip.setTextSize(12);
        chip.setPadding(dp(10), dp(3), dp(10), dp(3));
        chip.setBackground(Ui.pill(this, Ui.CARD, Ui.CARD_STROKE));
        chip.setContentDescription("Switch brain");
        chip.setOnClickListener(v -> showBrainSwitcher());
        LinearLayout.LayoutParams clp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        clp.topMargin = dp(3);
        titles.addView(chip, clp);
        header.addView(titles, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        Button newChat = iconButton("＋", "New conversation");
        newChat.setOnClickListener(v -> newConversation());
        header.addView(newChat);
        Button settings = iconButton("⚙", "Settings");
        settings.setOnClickListener(v -> startActivity(new Intent(this, SettingsActivity.class)));
        header.addView(settings);
        root.addView(header);

        View line = new View(this);
        line.setBackgroundColor(Ui.CARD_STROKE);
        root.addView(line, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1));

        // Conversation
        scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        chat = new LinearLayout(this);
        chat.setOrientation(LinearLayout.VERTICAL);
        chat.setPadding(dp(12), dp(10), dp(12), dp(14));
        scroll.addView(chat);
        root.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        // Quick actions
        HorizontalScrollView chipsScroll = new HorizontalScrollView(this);
        chipsScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout chips = new LinearLayout(this);
        chips.setPadding(dp(10), dp(6), dp(10), dp(4));
        for (String[] q : QUICK) {
            TextView c = new TextView(this);
            c.setText(q[0]);
            c.setTextColor(Ui.TEXT);
            c.setTextSize(13);
            c.setPadding(dp(14), dp(7), dp(14), dp(7));
            c.setBackground(Ui.pill(this, Ui.CARD, Ui.CARD_STROKE));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(dp(3), 0, dp(3), 0);
            c.setOnClickListener(v -> {
                input.setText(q[1]);
                input.setSelection(input.getText().length());
                input.requestFocus();
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) imm.showSoftInput(input, InputMethodManager.SHOW_IMPLICIT);
            });
            chips.addView(c, lp);
        }
        chipsScroll.addView(chips);
        chipsScroll.setBackgroundColor(Ui.PANEL);
        root.addView(chipsScroll);

        // Input bar
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.BOTTOM);
        bar.setPadding(dp(10), dp(6), dp(10), dp(10));
        bar.setBackgroundColor(Ui.PANEL);
        Button mic = roundButton("🎤", Ui.CARD);
        mic.setContentDescription("Speak to Jarvis");
        mic.setOnClickListener(v -> startVoice());
        bar.addView(mic);
        input = new EditText(this);
        input.setHint("Ask Jarvis anything…");
        input.setHintTextColor(Ui.MUTED);
        input.setTextColor(Ui.TEXT);
        input.setTextSize(16);
        input.setMaxLines(6);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        input.setBackground(Ui.card(this, Ui.CARD, Ui.CARD_STROKE, 23));
        input.setPadding(dp(16), dp(11), dp(16), dp(11));
        LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        ip.setMargins(dp(8), 0, dp(8), 0);
        bar.addView(input, ip);
        sendBtn = roundButton("➤", Ui.ACCENT);
        sendBtn.setTextColor(Ui.BG_TOP);
        sendBtn.setContentDescription("Send");
        sendBtn.setOnClickListener(v -> onSendTapped());
        bar.addView(sendBtn);
        root.addView(bar);
        return root;
    }

    private Button iconButton(String label, String description) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextColor(Ui.ACCENT);
        b.setTextSize(21);
        b.setBackground(null);
        b.setMinWidth(dp(46));
        b.setMinimumWidth(dp(46));
        b.setContentDescription(description);
        return b;
    }

    private Button roundButton(String label, int color) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(18);
        b.setTextColor(Ui.TEXT);
        b.setAllCaps(false);
        b.setPadding(0, 0, 0, 0);
        android.graphics.drawable.GradientDrawable d = new android.graphics.drawable.GradientDrawable();
        d.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        d.setColor(color);
        b.setBackground(d);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setLayoutParams(new LinearLayout.LayoutParams(dp(46), dp(46)));
        return b;
    }

    // ------------------------------------------------------------------ status chip & brain switcher

    private void refreshChip(String override) {
        String id = BrainFactory.chosen(prefs);
        Providers.Provider p = Providers.byId(id);
        if (ModelDownloads.running) {
            setChip("⬇ " + ModelDownloads.status, Ui.ACCENT);
        } else if (override != null) {
            setChip(cloudMark() + "● " + override + "  ▾", Ui.OK);
        } else if (!BrainFactory.isReady(this, id)) {
            setChip(cloudMark() + "● " + p.name + " · tap to set up  ▾", Ui.WARN);
        } else {
            String model = prefs.getString(BrainFactory.modelPref(id), "");
            String label = p.name + (model.isEmpty() ? "" : " · " + OpenAICompatBrain.shortName(model));
            setChip(cloudMark() + "● " + label + "  ▾", Ui.MUTED);
        }
    }

    private String cloudMark() { return SyncManager.signedIn(prefs) ? "☁ " : ""; }

    private void setChip(String text, int color) {
        chip.setText(text);
        chip.setTextColor(color);
    }

    private void showBrainSwitcher() {
        List<Providers.Provider> list = Providers.ALL;
        String chosen = BrainFactory.chosen(prefs);
        String[] items = new String[list.size() + 1];
        for (int i = 0; i < list.size(); i++) {
            Providers.Provider p = list.get(i);
            boolean ready = BrainFactory.isReady(this, p.id);
            items[i] = (p.id.equals(chosen) ? "◉  " : "○  ") + p.name + "  ·  " + String.join(" ", p.badges)
                    + (ready ? "" : "   (set up)");
        }
        items[list.size()] = "⚙  Open settings";
        new AlertDialog.Builder(this)
                .setTitle("Jarvis's brain")
                .setItems(items, (d, which) -> {
                    if (which == list.size()) { startActivity(new Intent(this, SettingsActivity.class)); return; }
                    Providers.Provider p = list.get(which);
                    prefs.edit().putString(BrainFactory.K_BRAIN, p.id).apply();
                    if (!BrainFactory.isReady(this, p.id)) startActivity(new Intent(this, SettingsActivity.class));
                    refreshChip(null);
                })
                .show();
    }

    // ------------------------------------------------------------------ messages

    private void showWelcome() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(20), dp(36), dp(20), dp(20));
        ArcView big = new ArcView(this);
        card.addView(big, new LinearLayout.LayoutParams(dp(110), dp(110)));
        TextView hello = new TextView(this);
        hello.setText(greeting());
        hello.setTextColor(Ui.TEXT);
        hello.setTextSize(22);
        hello.setTypeface(Typeface.DEFAULT_BOLD);
        hello.setGravity(Gravity.CENTER);
        hello.setPadding(0, dp(18), 0, dp(6));
        card.addView(hello);
        TextView sub = new TextView(this);
        sub.setText("I'm Jarvis, the Careva+ assistant. Ask me to reply to enquiries, plan shifts, write quotations, "
                + "follow-ups and posts. Tap a quick action below, type, or tap 🎤 to speak.");
        sub.setTextColor(Ui.MUTED);
        sub.setTextSize(14);
        sub.setGravity(Gravity.CENTER);
        sub.setLineSpacing(0, 1.2f);
        card.addView(sub);
        welcome = card;
        chat.addView(card);
    }

    private String greeting() {
        int h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        String g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
        String profile = prefs.getString(BrainFactory.K_PROFILE, "");
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?i)call me\\s+([^.,\\n]+)").matcher(profile);
        if (m.find()) return g + ", " + m.group(1).trim() + ".";
        return g + ".";
    }

    private void addMessage(String role, String text) {
        ChatStore.Msg m = new ChatStore.Msg(role, text, System.currentTimeMillis());
        msgs.add(m);
        ChatStore.save(prefs, msgs);
        SyncManager.markDirty(prefs);
        addView(m);
        scrollToBottom();
    }

    private void addView(ChatStore.Msg m) {
        if (welcome != null) { chat.removeView(welcome); welcome = null; }
        switch (m.role) {
            case "user": chat.addView(userBubble(m)); break;
            case "assistant": chat.addView(jarvisBubble(m.text, m.time, false)); break;
            case "note": chat.addView(noteView(m.text)); break;
            default: chat.addView(errorView(m.text)); break;
        }
    }

    private String time(long t) { return DateFormat.getTimeFormat(this).format(new Date(t)); }

    private View userBubble(ChatStore.Msg m) {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.END);
        TextView tv = new TextView(this);
        tv.setText(m.text);
        tv.setTextColor(0xFFFFFFFF);
        tv.setTextSize(16);
        tv.setLineSpacing(0, 1.15f);
        tv.setPadding(dp(14), dp(10), dp(14), dp(10));
        android.graphics.drawable.GradientDrawable g = new android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.TL_BR, new int[]{Ui.ACCENT_2, 0xFF1479A3});
        float r = dp(18), s = dp(5);
        g.setCornerRadii(new float[]{r, r, r, r, s, s, r, r});
        tv.setBackground(g);
        tv.setOnLongClickListener(v -> { showActions(m.text); return true; });
        col.addView(tv);
        col.addView(meta(time(m.time), Gravity.END));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(dp(48), dp(6), 0, dp(4));
        col.setLayoutParams(lp);
        return col;
    }

    /** Jarvis bubble with avatar, formatted text and Copy / Share / Read actions. */
    private View jarvisBubble(String text, long at, boolean live) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.TOP);
        TextView avatar = new TextView(this);
        avatar.setText("J");
        avatar.setGravity(Gravity.CENTER);
        avatar.setTextColor(Ui.BG_TOP);
        avatar.setTypeface(Typeface.DEFAULT_BOLD);
        avatar.setTextSize(13);
        android.graphics.drawable.GradientDrawable av = new android.graphics.drawable.GradientDrawable();
        av.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        av.setColor(Ui.ACCENT);
        avatar.setBackground(av);
        LinearLayout.LayoutParams alp = new LinearLayout.LayoutParams(dp(28), dp(28));
        alp.setMargins(0, dp(2), dp(8), 0);
        row.addView(avatar, alp);

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        TextView tv = new TextView(this);
        tv.setText(Markdown.render(text));
        tv.setTextColor(Ui.TEXT);
        tv.setTextSize(16);
        tv.setLineSpacing(0, 1.18f);
        tv.setPadding(dp(14), dp(10), dp(14), dp(10));
        android.graphics.drawable.GradientDrawable g = Ui.corners(this, Ui.CARD, 5, 18, 18, 18);
        g.setStroke(1, Ui.CARD_STROKE);
        tv.setBackground(g);
        tv.setOnLongClickListener(v -> { showActions(JarvisClient.plainText(text)); return true; });
        col.addView(tv);
        if (live) {
            liveBubble = tv;
        } else {
            LinearLayout actions = new LinearLayout(this);
            actions.setGravity(Gravity.CENTER_VERTICAL);
            actions.setPadding(dp(4), dp(2), 0, 0);
            String plain = JarvisClient.plainText(text);
            actions.addView(action("Copy", v -> copy(plain)));
            actions.addView(action("Share", v -> share(plain)));
            actions.addView(action("Read", v -> speak(plain, true)));
            actions.addView(meta(time(at), Gravity.START));
            col.addView(actions);
        }
        row.addView(col, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, dp(6), dp(24), dp(4));
        row.setLayoutParams(lp);
        return row;
    }

    private TextView action(String label, View.OnClickListener l) {
        TextView t = new TextView(this);
        t.setText(label);
        t.setTextColor(Ui.ACCENT);
        t.setTextSize(12);
        t.setPadding(dp(6), dp(6), dp(10), dp(6));
        t.setOnClickListener(l);
        return t;
    }

    private TextView meta(String text, int gravity) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Ui.MUTED);
        t.setTextSize(11);
        t.setGravity(gravity);
        t.setPadding(dp(6), dp(2), dp(6), 0);
        return t;
    }

    private View noteView(String text) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Ui.MUTED);
        t.setTextSize(12);
        t.setGravity(Gravity.CENTER);
        t.setPadding(dp(24), dp(6), dp(24), dp(6));
        return t;
    }

    private View errorView(String text) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(14), dp(10), dp(14), dp(8));
        box.setBackground(Ui.card(this, 0x22FF8A80, 0x66FF8A80, 14));
        TextView t = new TextView(this);
        t.setText("⚠  " + text);
        t.setTextColor(Ui.ERROR);
        t.setTextSize(14);
        box.addView(t);
        LinearLayout acts = new LinearLayout(this);
        acts.addView(action("Retry", v -> retry()));
        acts.addView(action("Settings", v -> startActivity(new Intent(this, SettingsActivity.class))));
        box.addView(acts);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(dp(36), dp(6), dp(24), dp(4));
        box.setLayoutParams(lp);
        return box;
    }

    /** Animated "…" bubble shown until the first words arrive. */
    private View typingView() {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(36), dp(8), 0, dp(8));
        LinearLayout dots = new LinearLayout(this);
        dots.setPadding(dp(14), dp(12), dp(14), dp(12));
        dots.setBackground(Ui.corners(this, Ui.CARD, 5, 18, 18, 18));
        final View[] d = new View[3];
        for (int i = 0; i < 3; i++) {
            View v = new View(this);
            android.graphics.drawable.GradientDrawable c = new android.graphics.drawable.GradientDrawable();
            c.setShape(android.graphics.drawable.GradientDrawable.OVAL);
            c.setColor(Ui.ACCENT);
            v.setBackground(c);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(8), dp(8));
            lp.setMargins(dp(3), 0, dp(3), 0);
            dots.addView(v, lp);
            d[i] = v;
        }
        row.addView(dots);
        TextView label = new TextView(this);
        label.setText("  Jarvis is thinking…");
        label.setTextColor(Ui.MUTED);
        label.setTextSize(12);
        row.addView(label);
        typingAnim = ValueAnimator.ofFloat(0f, 3f);
        typingAnim.setDuration(1100);
        typingAnim.setRepeatCount(ValueAnimator.INFINITE);
        typingAnim.addUpdateListener(a -> {
            float t = (float) a.getAnimatedValue();
            for (int i = 0; i < 3; i++) {
                float k = Math.max(0f, 1f - Math.abs(t - i - 0.5f));
                d[i].setAlpha(0.3f + 0.7f * k);
                d[i].setTranslationY(-dp(3) * k);
            }
        });
        typingAnim.start();
        return row;
    }

    private void scrollToBottom() { scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN)); }

    private void showActions(String text) {
        new AlertDialog.Builder(this)
                .setItems(new String[]{"Copy", "Share (WhatsApp, SMS, email…)", "Read aloud"}, (d, which) -> {
                    if (which == 0) copy(text);
                    else if (which == 1) share(text);
                    else speak(text, true);
                })
                .show();
    }

    private void copy(String text) {
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        cm.setPrimaryClip(ClipData.newPlainText("Jarvis", text));
        Toast.makeText(this, "Copied", Toast.LENGTH_SHORT).show();
    }

    private void share(String text) {
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_TEXT, text);
        startActivity(Intent.createChooser(send, "Share with"));
    }

    private void newConversation() {
        if (busy) { Toast.makeText(this, "Please wait for Jarvis to finish", Toast.LENGTH_SHORT).show(); return; }
        if (msgs.isEmpty()) return;
        new AlertDialog.Builder(this)
                .setMessage("Start a new conversation? This clears the current chat.")
                .setPositiveButton("New conversation", (d, w) -> {
                    msgs.clear();
                    ChatStore.save(prefs, msgs);
                    chat.removeAllViews();
                    if (tts != null) tts.stop();
                    showWelcome();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    // ------------------------------------------------------------------ talking to Jarvis

    private void onSendTapped() {
        if (busy) {
            if (activeBrain != null) activeBrain.stop();
            return;
        }
        String text = input.getText().toString().trim();
        if (text.isEmpty()) return;
        BrainCommands.Command cmd = BrainCommands.parse(text);
        if (cmd != null) {
            input.setText("");
            text = runCommand(text, cmd);
            if (text.isEmpty()) return;          // nothing more to send
        }
        if (!BrainFactory.isReady(this, BrainFactory.chosen(prefs))) {
            Toast.makeText(this, "Set up Jarvis's brain first", Toast.LENGTH_SHORT).show();
            startActivity(new Intent(this, SettingsActivity.class));
            return;
        }
        input.setText("");
        addMessage("user", text);
        ask();
    }

    /**
     * Carries out "use the heavy model", "switch to Groq", "go offline", "which brain are you using?" …
     * Returns the text still to send to the (new) brain, or "" if there is none.
     */
    private String runCommand(String original, BrainCommands.Command cmd) {
        addMessage("user", original);
        String id = BrainFactory.chosen(prefs);
        if (BrainCommands.Kind.STATUS.equals(cmd.kind)) {
            String model = prefs.getString(BrainFactory.modelPref(id), "");
            addMessage("note", "I'm using " + Providers.byId(id).name
                    + (model.isEmpty() ? " (Auto model)" : " · " + OpenAICompatBrain.shortName(model))
                    + (BrainFactory.isReady(this, id) ? "." : " — it still needs setting up in ⚙ Settings."));
            return "";
        }
        String target = cmd.providerId != null ? cmd.providerId : id;
        SharedPreferences.Editor e = prefs.edit().putString(BrainFactory.K_BRAIN, target);
        if (cmd.model != null) e.putString(BrainFactory.modelPref(target), cmd.model);
        e.apply();
        refreshChip(null);
        if (!BrainFactory.isReady(this, target)) {
            Providers.Provider p = Providers.byId(target);
            addMessage("error", "Switched to " + cmd.label + ", but " + p.name + " isn't set up yet. "
                    + (p.needsKey() ? "Add its free key in Settings." : "Finish setting it up in Settings."));
            return "";
        }
        addMessage("note", "Switched to " + cmd.label + ".");
        if (!cmd.remainder.isEmpty()) {
            addMessage("user", cmd.remainder);
            ask();
        }
        return "";
    }

    private void retry() {
        if (busy) return;
        List<String[]> h = ChatStore.history(msgs, MAX_HISTORY);
        if (h.isEmpty() || !"user".equals(h.get(h.size() - 1)[0])) {
            Toast.makeText(this, "Nothing to retry", Toast.LENGTH_SHORT).show();
            return;
        }
        ask();
    }

    private void ask() {
        final List<String[]> history = ChatStore.history(msgs, MAX_HISTORY);
        final Brain brain = BrainFactory.createWithBackups(this);
        activeBrain = brain;
        setBusy(true);
        brain.setListener(partial -> ui.post(() -> {
            if (!busy) return;
            if (partial.isEmpty()) {                 // a backup brain is starting over
                if (liveBubble != null) { chat.removeView((View) liveBubble.getParent().getParent()); liveBubble = null; }
                if (typing == null) { typing = typingView(); chat.addView(typing); }
                return;
            }
            if (liveBubble == null) {
                removeTyping();
                chat.addView(jarvisBubble(partial, System.currentTimeMillis(), true));
            } else {
                liveBubble.setText(Markdown.render(partial));
            }
            scrollToBottom();
        }));
        worker.execute(() -> {
            try {
                String reply = brain.reply(history);
                String note = brain instanceof FallbackBrain ? ((FallbackBrain) brain).note() : "";
                ui.post(() -> {
                    finishLive();
                    setBusy(false);
                    addMessage("assistant", reply);
                    if (!note.isEmpty()) addMessage("note", note);
                    refreshChip(brain.label());
                    speak(JarvisClient.plainText(reply), false);
                });
            } catch (JarvisClient.JarvisException e) {
                ui.post(() -> {
                    finishLive();
                    setBusy(false);
                    if (!"Stopped.".equals(e.getMessage())) addMessage("error", e.getMessage());
                    else addMessage("note", "Stopped.");
                    refreshChip(null);
                });
            } catch (RuntimeException e) {
                ui.post(() -> {
                    finishLive();
                    setBusy(false);
                    addMessage("error", "Something went wrong: " + e.getMessage());
                    refreshChip(null);
                });
            }
        });
    }

    private void finishLive() {
        removeTyping();
        if (liveBubble != null) {
            chat.removeView((View) liveBubble.getParent().getParent());
            liveBubble = null;
        }
    }

    private void removeTyping() {
        if (typing != null) {
            chat.removeView(typing);
            typing = null;
        }
        if (typingAnim != null) { typingAnim.cancel(); typingAnim = null; }
    }

    private void setBusy(boolean b) {
        busy = b;
        arc.setBusy(b);
        sendBtn.setText(b ? "■" : "➤");
        sendBtn.setContentDescription(b ? "Stop" : "Send");
        if (b) {
            typing = typingView();
            chat.addView(typing);
            scrollToBottom();
        }
    }

    // ------------------------------------------------------------------ voice

    private void startVoice() {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to Jarvis");
        try {
            startActivityForResult(i, REQ_VOICE);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Voice input is not available on this phone", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_VOICE && resultCode == RESULT_OK && data != null) {
            ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (results != null && !results.isEmpty()) {
                input.setText(results.get(0));
                onSendTapped();
            }
        }
    }

    private void speak(String text, boolean force) {
        if (!ttsReady || tts == null) return;
        if (!force && !prefs.getBoolean(BrainFactory.K_SPEAK, true)) return;
        String t = text.replace("•", "").replace("☐", "").replace("☑", "");
        tts.speak(t.length() > 3900 ? t.substring(0, 3900) : t, TextToSpeech.QUEUE_FLUSH, null, "jarvis");
    }
}
