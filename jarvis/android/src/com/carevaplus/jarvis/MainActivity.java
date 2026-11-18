package com.carevaplus.jarvis;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    // Colours
    private static final int BG = Color.parseColor("#0A1018");
    private static final int PANEL = Color.parseColor("#111B26");
    private static final int ACCENT = Color.parseColor("#29C5F6");
    private static final int ACCENT_DIM = Color.parseColor("#1B6F8C");
    private static final int USER_BUBBLE = Color.parseColor("#1479A3");
    private static final int JARVIS_BUBBLE = Color.parseColor("#17222E");
    private static final int TEXT = Color.parseColor("#E8F4FA");
    private static final int MUTED = Color.parseColor("#7F93A3");
    private static final int ERROR = Color.parseColor("#FF8A80");

    private static final int REQ_VOICE = 42;
    private static final int MAX_HISTORY = 16;

    private static final String PREFS = "jarvis";
    private static final String K_URL = "url";
    private static final String K_KEY = "key";
    private static final String K_SPEAK = "speak";

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final List<String[]> history = new ArrayList<>();

    private SharedPreferences prefs;
    private LinearLayout chat;
    private ScrollView scroll;
    private EditText input;
    private Button sendBtn;
    private TextView status;
    private TextView thinking;
    private TextToSpeech tts;
    private boolean ttsReady;
    private boolean busy;
    private String model = "";

    // ------------------------------------------------------------------ setup

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        setContentView(buildUi());
        tts = new TextToSpeech(this, this);

        addJarvis("Good day. I'm Jarvis, the Careva+ assistant.\n"
                + "Ask me to draft replies, plan shifts, prepare quotations, or anything else. "
                + "Tap the microphone to speak, and long-press any reply to copy or share it.");
        if (prefs.getString(K_URL, "").isEmpty()) {
            ui.postDelayed(this::showSettings, 400);
        } else {
            connect(false);
        }
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
        worker.shutdownNow();
        if (tts != null) { tts.stop(); tts.shutdown(); }
        super.onDestroy();
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private GradientDrawable rounded(int color, float radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radiusDp));
        return d;
    }

    private View buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        root.setFitsSystemWindows(true);

        // Header
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(16), dp(12), dp(8), dp(12));
        header.setBackgroundColor(PANEL);

        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        TextView title = new TextView(this);
        title.setText("J.A.R.V.I.S.");
        title.setTextColor(ACCENT);
        title.setTextSize(20);
        title.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        title.setLetterSpacing(0.12f);
        status = new TextView(this);
        status.setTextColor(MUTED);
        status.setTextSize(12);
        status.setText("● Not connected");
        titles.addView(title);
        titles.addView(status);
        header.addView(titles, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        Button clear = headerButton("New");
        clear.setContentDescription("New conversation");
        clear.setOnClickListener(v -> newConversation());
        header.addView(clear);
        Button settings = headerButton("⚙");
        settings.setTextSize(20);
        settings.setContentDescription("Settings");
        settings.setOnClickListener(v -> showSettings());
        header.addView(settings);
        root.addView(header);

        // Chat area
        scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        chat = new LinearLayout(this);
        chat.setOrientation(LinearLayout.VERTICAL);
        chat.setPadding(dp(12), dp(12), dp(12), dp(12));
        scroll.addView(chat);
        root.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        // Input row
        LinearLayout bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.BOTTOM);
        bar.setPadding(dp(10), dp(8), dp(10), dp(10));
        bar.setBackgroundColor(PANEL);

        Button mic = roundButton("🎤", JARVIS_BUBBLE);
        mic.setContentDescription("Speak to Jarvis");
        mic.setOnClickListener(v -> startVoice());
        bar.addView(mic);

        input = new EditText(this);
        input.setHint("Message Jarvis…");
        input.setHintTextColor(MUTED);
        input.setTextColor(TEXT);
        input.setTextSize(16);
        input.setMaxLines(5);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE
                | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        input.setImeOptions(EditorInfo.IME_ACTION_SEND);
        input.setBackground(rounded(JARVIS_BUBBLE, 22));
        input.setPadding(dp(16), dp(10), dp(16), dp(10));
        LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        ip.setMargins(dp(8), 0, dp(8), 0);
        bar.addView(input, ip);

        sendBtn = roundButton("➤", ACCENT);
        sendBtn.setTextColor(BG);
        sendBtn.setContentDescription("Send");
        sendBtn.setOnClickListener(v -> send(input.getText().toString()));
        bar.addView(sendBtn);
        root.addView(bar);
        return root;
    }

    private Button headerButton(String label) {
        Button b = new Button(this);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextColor(ACCENT);
        b.setTextSize(15);
        b.setBackground(null);
        b.setMinWidth(dp(48));
        b.setMinimumWidth(dp(48));
        return b;
    }

    private Button roundButton(String label, int color) {
        Button b = new Button(this);
        b.setText(label);
        b.setTextSize(18);
        b.setTextColor(TEXT);
        b.setAllCaps(false);
        b.setPadding(0, 0, 0, 0);
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(color);
        b.setBackground(d);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setLayoutParams(new LinearLayout.LayoutParams(dp(46), dp(46)));
        return b;
    }

    // ------------------------------------------------------------------ chat bubbles

    private TextView bubble(String text, boolean fromUser, int textColor) {
        TextView tv = new TextView(this);
        tv.setText(text);
        tv.setTextColor(textColor);
        tv.setTextSize(16);
        tv.setLineSpacing(0, 1.15f);
        tv.setTextIsSelectable(false);
        tv.setPadding(dp(14), dp(10), dp(14), dp(10));
        tv.setBackground(rounded(fromUser ? USER_BUBBLE : JARVIS_BUBBLE, 16));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.gravity = fromUser ? Gravity.END : Gravity.START;
        lp.setMargins(fromUser ? dp(48) : 0, dp(5), fromUser ? 0 : dp(48), dp(5));
        tv.setLayoutParams(lp);
        tv.setOnLongClickListener(v -> { showMessageActions(tv.getText().toString()); return true; });
        chat.addView(tv);
        scrollToBottom();
        return tv;
    }

    private void addUser(String text) { bubble(text, true, TEXT); }
    private void addJarvis(String text) { bubble(text, false, TEXT); }
    private void addError(String text) { bubble("⚠ " + text, false, ERROR); }

    private void scrollToBottom() {
        scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN));
    }

    private void showMessageActions(String text) {
        new AlertDialog.Builder(this)
                .setItems(new String[]{"Copy", "Share (WhatsApp, SMS, email…)", "Read aloud"}, (d, which) -> {
                    if (which == 0) {
                        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                        cm.setPrimaryClip(ClipData.newPlainText("Jarvis", text));
                        Toast.makeText(this, "Copied", Toast.LENGTH_SHORT).show();
                    } else if (which == 1) {
                        Intent send = new Intent(Intent.ACTION_SEND);
                        send.setType("text/plain");
                        send.putExtra(Intent.EXTRA_TEXT, text);
                        startActivity(Intent.createChooser(send, "Share with"));
                    } else {
                        speak(text, true);
                    }
                })
                .show();
    }

    private void newConversation() {
        if (busy) { Toast.makeText(this, "Please wait for Jarvis to finish", Toast.LENGTH_SHORT).show(); return; }
        history.clear();
        chat.removeAllViews();
        if (tts != null) tts.stop();
        addJarvis("New conversation. How can I help?");
    }

    // ------------------------------------------------------------------ talking to Jarvis

    private JarvisClient client() {
        return new JarvisClient(prefs.getString(K_URL, ""), prefs.getString(K_KEY, ""));
    }

    private void setStatus(String text, int color) {
        status.setText(text);
        status.setTextColor(color);
    }

    private void connect(boolean announce) {
        setStatus("● Connecting…", MUTED);
        JarvisClient c = client();
        worker.execute(() -> {
            try {
                String m = c.fetchModel();
                ui.post(() -> {
                    model = m;
                    setStatus("● Online · " + m, ACCENT);
                    if (announce) addJarvis("Connected to your computer. I'm ready.");
                });
            } catch (JarvisClient.JarvisException e) {
                ui.post(() -> {
                    model = "";
                    setStatus("● Offline", ERROR);
                    if (announce) addError(e.getMessage());
                });
            }
        });
    }

    private void send(String raw) {
        String text = raw == null ? "" : raw.trim();
        if (text.isEmpty() || busy) return;
        if (prefs.getString(K_URL, "").isEmpty()) { showSettings(); return; }
        input.setText("");
        addUser(text);
        history.add(new String[]{"user", text});
        while (history.size() > MAX_HISTORY) history.remove(0);
        final List<String[]> snapshot = new ArrayList<>(history);
        setBusy(true);
        JarvisClient c = client();
        worker.execute(() -> {
            try {
                String m = model.isEmpty() ? c.fetchModel() : model;
                String reply = c.chat(m, snapshot);
                ui.post(() -> {
                    model = m;
                    setStatus("● Online · " + m, ACCENT);
                    setBusy(false);
                    history.add(new String[]{"assistant", reply});
                    String shown = JarvisClient.plainText(reply);
                    addJarvis(shown);
                    speak(shown, false);
                });
            } catch (JarvisClient.JarvisException e) {
                ui.post(() -> {
                    setBusy(false);
                    // Drop the unanswered question so the conversation stays consistent.
                    if (!history.isEmpty() && "user".equals(history.get(history.size() - 1)[0])) {
                        history.remove(history.size() - 1);
                    }
                    setStatus("● Offline", ERROR);
                    model = "";
                    addError(e.getMessage());
                });
            }
        });
    }

    private void setBusy(boolean b) {
        busy = b;
        sendBtn.setEnabled(!b);
        sendBtn.setAlpha(b ? 0.4f : 1f);
        if (b) {
            thinking = bubble("Jarvis is thinking…", false, MUTED);
        } else if (thinking != null) {
            chat.removeView(thinking);
            thinking = null;
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
            if (results != null && !results.isEmpty()) send(results.get(0));
        }
    }

    private void speak(String text, boolean force) {
        if (!ttsReady || tts == null) return;
        if (!force && !prefs.getBoolean(K_SPEAK, true)) return;
        String t = text.replace("•", "").replace("☐", "");
        tts.speak(t.length() > 3900 ? t.substring(0, 3900) : t, TextToSpeech.QUEUE_FLUSH, null, "jarvis");
    }

    // ------------------------------------------------------------------ settings

    private void showSettings() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(22), dp(8), dp(22), 0);

        TextView help = new TextView(this);
        help.setText("On your computer, run:\n  jarvis auth create-key\n  jarvis serve --host 0.0.0.0\n\n"
                + "Then enter your computer's address (e.g. 192.168.1.5) and the key it printed. "
                + "Your phone must be on the same Wi-Fi.");
        help.setTextSize(13);
        box.addView(help);

        EditText url = new EditText(this);
        url.setHint("Computer address, e.g. 192.168.1.5");
        url.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        url.setText(prefs.getString(K_URL, ""));
        box.addView(url);

        EditText key = new EditText(this);
        key.setHint("Access key (starts with oj_sk_)");
        key.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        key.setText(prefs.getString(K_KEY, ""));
        box.addView(key);

        CheckBox speakBox = new CheckBox(this);
        speakBox.setText("Speak Jarvis's replies aloud");
        speakBox.setChecked(prefs.getBoolean(K_SPEAK, true));
        box.addView(speakBox);

        new AlertDialog.Builder(this)
                .setTitle("Connect to Jarvis")
                .setView(box)
                .setPositiveButton("Save & connect", (d, w) -> {
                    prefs.edit()
                            .putString(K_URL, JarvisClient.normalizeUrl(url.getText().toString()))
                            .putString(K_KEY, key.getText().toString().trim())
                            .putBoolean(K_SPEAK, speakBox.isChecked())
                            .apply();
                    model = "";
                    connect(true);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }
}
