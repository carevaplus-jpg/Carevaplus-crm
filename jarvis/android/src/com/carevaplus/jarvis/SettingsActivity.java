package com.carevaplus.jarvis;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Full-screen settings: choose and set up Jarvis's brain, backups, profile and voice. */
public class SettingsActivity extends Activity implements ModelDownloads.Watcher {

    private final ExecutorService bg = Executors.newCachedThreadPool();
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Map<String, LinearLayout> cards = new HashMap<>();
    private final Map<String, View> details = new HashMap<>();
    private final Map<String, TextView> radios = new HashMap<>();
    private final Map<String, TextView> states = new HashMap<>();
    private SharedPreferences prefs;
    private TextView localStatus;
    private Button localButton;

    private int dp(float v) { return Ui.dp(this, v); }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = BrainFactory.prefs(this);
        getWindow().setStatusBarColor(Ui.BG_TOP);
        getWindow().setNavigationBarColor(Ui.BG_BOTTOM);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackground(Ui.gradient(Ui.BG_TOP, Ui.BG_BOTTOM));
        root.setFitsSystemWindows(true);

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(4), dp(6), dp(16), dp(6));
        Button back = flatButton("←", 22);
        back.setContentDescription("Back");
        back.setOnClickListener(v -> finish());
        bar.addView(back);
        TextView title = new TextView(this);
        title.setText("Settings");
        title.setTextColor(Ui.TEXT);
        title.setTextSize(20);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        bar.addView(title);
        root.addView(bar);

        ScrollView sv = new ScrollView(this);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(14), dp(4), dp(14), dp(28));
        sv.addView(box);
        root.addView(sv, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        box.addView(section("JARVIS'S BRAIN"));
        box.addView(hint("Choose where Jarvis thinks. Free brains need a free key — tap “Get free key”, sign up, "
                + "copy the key and paste it here. It takes about a minute."));
        for (Providers.Provider p : Providers.ALL) box.addView(providerCard(p));

        box.addView(section("BACKUP"));
        CheckBox backup = check("If the chosen brain is busy or reaches its free limit, automatically use another "
                + "free brain I've set up", prefs.getBoolean(BrainFactory.K_BACKUP, true));
        backup.setOnCheckedChangeListener((b, on) -> prefs.edit().putBoolean(BrainFactory.K_BACKUP, on).apply());
        box.addView(backup);

        box.addView(section("ABOUT YOU"));
        box.addView(hint("Jarvis uses this in every reply: your name, how to address you, city, services and prices, office hours."));
        EditText profile = input("e.g. Name: Priya. Call me Ma'am. City: Pune. 12-hour caretaker: Rs 900 per shift. Hours 9–7.",
                prefs.getString(BrainFactory.K_PROFILE, ""), false);
        profile.setSingleLine(false);
        profile.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        profile.setMinLines(3);
        profile.setGravity(Gravity.TOP);
        saveOnChange(profile, BrainFactory.K_PROFILE);
        box.addView(profile);

        box.addView(section("VOICE"));
        CheckBox speak = check("Read Jarvis's replies aloud", prefs.getBoolean(BrainFactory.K_SPEAK, true));
        speak.setOnCheckedChangeListener((b, on) -> prefs.edit().putBoolean(BrainFactory.K_SPEAK, on).apply());
        box.addView(speak);

        box.addView(section("PRIVACY"));
        box.addView(hint("Online brains send your messages to that company. Avoid typing sensitive patient medical "
                + "details unless you use “On this phone” or “My computer”. Your keys and chats are stored only on this phone."));

        setContentView(root);
        refreshSelection();
    }

    @Override protected void onResume() { super.onResume(); ModelDownloads.watch(this); onChange(); }
    @Override protected void onPause() { ModelDownloads.unwatch(this); super.onPause(); }
    @Override protected void onDestroy() { bg.shutdownNow(); super.onDestroy(); }

    // ------------------------------------------------------------------ provider cards

    private View providerCard(Providers.Provider p) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(14), dp(12), dp(14), dp(12));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, dp(6), 0, dp(6));
        card.setLayoutParams(lp);
        cards.put(p.id, card);

        LinearLayout head = new LinearLayout(this);
        head.setGravity(Gravity.CENTER_VERTICAL);
        TextView radio = new TextView(this);
        radio.setTextSize(22);
        radio.setPadding(0, 0, dp(12), 0);
        radio.setContentDescription("Use " + p.name);
        radios.put(p.id, radio);
        head.addView(radio);

        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        LinearLayout nameRow = new LinearLayout(this);
        nameRow.setGravity(Gravity.CENTER_VERTICAL);
        TextView name = new TextView(this);
        name.setText(p.name);
        name.setTextColor(Ui.TEXT);
        name.setTextSize(17);
        name.setTypeface(Typeface.DEFAULT_BOLD);
        nameRow.addView(name);
        for (String b : p.badges) nameRow.addView(badge(b));
        titles.addView(nameRow);
        TextView st = new TextView(this);
        st.setTextSize(12);
        states.put(p.id, st);
        titles.addView(st);
        head.addView(titles, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        TextView chevron = new TextView(this);
        chevron.setText("⌄");
        chevron.setTextColor(Ui.MUTED);
        chevron.setTextSize(20);
        head.addView(chevron);
        card.addView(head);

        TextView tag = new TextView(this);
        tag.setText(p.tagline);
        tag.setTextColor(Ui.MUTED);
        tag.setTextSize(13);
        tag.setPadding(dp(34), dp(4), 0, 0);
        card.addView(tag);

        LinearLayout det = new LinearLayout(this);
        det.setOrientation(LinearLayout.VERTICAL);
        det.setPadding(dp(34), dp(8), 0, 0);
        det.setVisibility(View.GONE);
        details.put(p.id, det);
        if ("local".equals(p.id)) buildLocal(det);
        else if ("computer".equals(p.id)) buildComputer(det);
        else buildKeyed(det, p);
        card.addView(det);

        radio.setOnClickListener(v -> select(p.id));
        head.setOnClickListener(v -> det.setVisibility(det.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE));
        return card;
    }

    private void select(String id) {
        prefs.edit().putString(BrainFactory.K_BRAIN, id).apply();
        View det = details.get(id);
        if (det != null) det.setVisibility(View.VISIBLE);
        if (!BrainFactory.isReady(this, id)) {
            Providers.Provider p = Providers.byId(id);
            if (p.needsKey()) toast("Now add your " + p.name + " key below.");
        }
        refreshSelection();
    }

    private void refreshSelection() {
        String chosen = BrainFactory.chosen(prefs);
        for (Providers.Provider p : Providers.ALL) {
            boolean sel = p.id.equals(chosen);
            boolean ready = BrainFactory.isReady(this, p.id);
            TextView r = radios.get(p.id);
            r.setText(sel ? "◉" : "○");
            r.setTextColor(sel ? Ui.ACCENT : Ui.MUTED);
            cards.get(p.id).setBackground(Ui.card(this, Ui.CARD, sel ? Ui.ACCENT : Ui.CARD_STROKE, 16));
            TextView st = states.get(p.id);
            if (sel && ready) { st.setText("In use · ready"); st.setTextColor(Ui.OK); }
            else if (sel) { st.setText("In use · needs setting up"); st.setTextColor(Ui.WARN); }
            else if (ready) { st.setText(p.isFreeCloud() ? "Set up · used as a backup" : "Set up"); st.setTextColor(Ui.MUTED); }
            else { st.setText("Not set up"); st.setTextColor(Ui.MUTED); }
            if (sel) details.get(p.id).setVisibility(View.VISIBLE);
        }
    }

    private void buildKeyed(LinearLayout det, Providers.Provider p) {
        det.addView(small("API key"));
        EditText key = input(p.keyHint, prefs.getString(BrainFactory.keyPref(p.id), ""), true);
        saveOnChange(key, BrainFactory.keyPref(p.id));
        det.addView(key);

        LinearLayout row = new LinearLayout(this);
        Button get = actionButton("Get free key ↗");
        if (!p.isFreeCloud()) get.setText("Get key ↗");
        get.setOnClickListener(v -> open(p.keyUrl));
        row.addView(get);
        Button test = actionButton("Test");
        row.addView(test);
        det.addView(row);

        det.addView(small("Model"));
        LinearLayout mrow = new LinearLayout(this);
        mrow.setGravity(Gravity.CENTER_VERTICAL);
        Spinner spinner = new Spinner(this);
        mrow.addView(spinner, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        Button reload = actionButton("↻");
        reload.setContentDescription("Load the latest model list");
        mrow.addView(reload);
        det.addView(mrow);
        List<String> initial = new ArrayList<>(p.preferred);
        setModels(spinner, p, initial);

        TextView result = small("");
        det.addView(result);
        TextView privacy = small(p.privacy);
        privacy.setTextColor(Ui.MUTED);
        det.addView(privacy);

        reload.setOnClickListener(v -> {
            String k = prefs.getString(BrainFactory.keyPref(p.id), "");
            if (k.isEmpty()) { result.setText("Add the key first."); result.setTextColor(Ui.WARN); return; }
            result.setText("Loading models…");
            result.setTextColor(Ui.MUTED);
            bg.execute(() -> {
                try {
                    List<String> ids;
                    if ("gemini".equals(p.id)) ids = new GeminiBrain(k, "", "").listModels();
                    else if ("claude".equals(p.id)) ids = p.preferred;
                    else ids = new OpenAICompatBrain(p, k, "", "").listModels();
                    final List<String> f = ids;
                    ui.post(() -> {
                        setModels(spinner, p, f);
                        result.setText(f.size() + " models available. “Auto” uses the best one.");
                        result.setTextColor(Ui.OK);
                    });
                } catch (JarvisClient.JarvisException e) {
                    ui.post(() -> { result.setText("✗ " + e.getMessage()); result.setTextColor(Ui.ERROR); });
                }
            });
        });
        test.setOnClickListener(v -> runTest(p.id, result));
    }

    private void setModels(Spinner spinner, Providers.Provider p, List<String> ids) {
        List<String> labels = new ArrayList<>();
        List<String> values = new ArrayList<>();
        labels.add("Auto — best available");
        values.add("");
        String chosen = prefs.getString(BrainFactory.modelPref(p.id), "");
        List<String> all = new ArrayList<>(ids);
        if (!chosen.isEmpty() && !all.contains(chosen)) all.add(0, chosen);
        for (String id : all) {
            values.add(id);
            String note = "";
            if ("claude".equals(p.id)) {
                note = id.contains("opus") ? "  (smartest)" : id.contains("sonnet") ? "  (faster, cheaper)" : id.contains("haiku") ? "  (fastest, cheapest)" : "";
            } else if (p.preferred.indexOf(id) == 0) {
                note = "  ★";
            }
            labels.add(id + note);
        }
        ArrayAdapter<String> ad = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, labels);
        ad.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setOnItemSelectedListener(null);
        spinner.setAdapter(ad);
        spinner.setSelection(Math.max(0, values.indexOf(chosen)), false);
        spinner.setOnItemSelectedListener(new ModelSelected(prefs, BrainFactory.modelPref(p.id), values));
    }

    private void buildLocal(LinearLayout det) {
        localStatus = small("");
        det.addView(localStatus);
        LinearLayout row = new LinearLayout(this);
        localButton = actionButton("");
        row.addView(localButton);
        Button test = actionButton("Test");
        row.addView(test);
        det.addView(row);
        TextView result = small("");
        det.addView(result);
        localButton.setOnClickListener(v -> {
            File f = BrainFactory.modelFile(this);
            if (ModelDownloads.running) {
                ModelDownloads.cancel();
            } else if (LocalBrain.isModelReady(f)) {
                new AlertDialog.Builder(this)
                        .setMessage("Delete the on-phone AI model (1.3 GB)? You can download it again later.")
                        .setPositiveButton("Delete", (d, w) -> bg.execute(() -> {
                            LocalBrain.unload();
                            //noinspection ResultOfMethodCallIgnored
                            f.delete();
                            ui.post(this::onChange);
                        }))
                        .setNegativeButton("Cancel", null)
                        .show();
            } else {
                ModelDownloads.start(f);
            }
        });
        test.setOnClickListener(v -> runTest("local", result));
    }

    @Override
    public void onChange() {
        if (localStatus == null) return;
        File f = BrainFactory.modelFile(this);
        if (ModelDownloads.running) {
            localStatus.setText(ModelDownloads.status + "\nKeep the app open and use Wi-Fi. If it stops, tap Download again — it continues.");
            localStatus.setTextColor(Ui.ACCENT);
            localButton.setText("Pause download");
        } else if (LocalBrain.isModelReady(f)) {
            localStatus.setText("Model downloaded (1.3 GB). Works offline; nothing leaves your phone.");
            localStatus.setTextColor(Ui.OK);
            localButton.setText("Delete model");
        } else {
            String extra = ModelDownloads.lastResult.isEmpty() || ModelDownloads.lastOk ? "" : "\n" + ModelDownloads.lastResult;
            localStatus.setText("Needs a one-time 1.3 GB download (use Wi-Fi). Best on 64-bit phones with 6 GB+ memory." + extra);
            localStatus.setTextColor(extra.isEmpty() ? Ui.MUTED : Ui.WARN);
            localButton.setText(new File(f.getPath() + ".part").exists() ? "Continue download" : "Download model");
        }
        refreshSelection();
    }

    private void buildComputer(LinearLayout det) {
        det.addView(small("On your computer run  jarvis auth create-key  once, then  jarvis serve --host 0.0.0.0. "
                + "Enter the computer's address (e.g. 192.168.1.5) and the key. Same Wi-Fi only."));
        EditText url = input("Computer address, e.g. 192.168.1.5", prefs.getString(BrainFactory.K_URL, ""), false);
        url.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        url.addTextChangedListener(new Watcher(s -> prefs.edit().putString(BrainFactory.K_URL, JarvisClient.normalizeUrl(s)).apply()));
        det.addView(url);
        EditText key = input("Access key (starts with oj_sk_)", prefs.getString(BrainFactory.K_PC_KEY, ""), true);
        saveOnChange(key, BrainFactory.K_PC_KEY);
        det.addView(key);
        Button test = actionButton("Test");
        det.addView(test);
        TextView result = small("");
        det.addView(result);
        test.setOnClickListener(v -> runTest("computer", result));
    }

    private void runTest(String id, TextView result) {
        if (!BrainFactory.isReady(this, id)) {
            result.setText("Set this brain up first.");
            result.setTextColor(Ui.WARN);
            return;
        }
        result.setText("Testing…");
        result.setTextColor(Ui.MUTED);
        Brain b = BrainFactory.create(this, id);
        bg.execute(() -> {
            long t = System.currentTimeMillis();
            try {
                List<String[]> h = Collections.singletonList(new String[]{"user", "Reply with exactly: Jarvis online."});
                String r = b.reply(h);
                double secs = (System.currentTimeMillis() - t) / 1000.0;
                String shown = r.length() > 80 ? r.substring(0, 80) + "…" : r;
                ui.post(() -> {
                    result.setText(String.format(Locale.US, "✓ Works · %s · %.1f s\n“%s”", b.label(), secs, shown));
                    result.setTextColor(Ui.OK);
                    refreshSelection();
                });
            } catch (JarvisClient.JarvisException e) {
                ui.post(() -> { result.setText("✗ " + e.getMessage()); result.setTextColor(Ui.ERROR); });
            } catch (RuntimeException e) {
                ui.post(() -> { result.setText("✗ " + e); result.setTextColor(Ui.ERROR); });
            }
        });
    }

    // ------------------------------------------------------------------ small view helpers

    private TextView section(String text) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Ui.ACCENT);
        t.setTextSize(12);
        t.setLetterSpacing(0.15f);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setPadding(dp(4), dp(20), 0, dp(4));
        return t;
    }

    private TextView hint(String text) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Ui.MUTED);
        t.setTextSize(13);
        t.setPadding(dp(4), 0, dp(4), dp(6));
        return t;
    }

    private TextView small(String text) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextColor(Ui.TEXT);
        t.setTextSize(13);
        t.setPadding(0, dp(6), 0, dp(2));
        return t;
    }

    private TextView badge(String b) {
        TextView t = new TextView(this);
        t.setText(b);
        t.setTextSize(10);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        int c = Ui.badgeColor(b);
        t.setTextColor(c);
        t.setPadding(dp(7), dp(1), dp(7), dp(1));
        t.setBackground(Ui.pill(this, (c & 0x00FFFFFF) | 0x22000000, (c & 0x00FFFFFF) | 0x88000000));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(dp(6), 0, 0, 0);
        t.setLayoutParams(lp);
        return t;
    }

    private EditText input(String hint, String value, boolean secret) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setHintTextColor(Ui.MUTED);
        e.setTextColor(Ui.TEXT);
        e.setTextSize(15);
        e.setSingleLine(true);
        e.setInputType(InputType.TYPE_CLASS_TEXT | (secret ? InputType.TYPE_TEXT_VARIATION_PASSWORD : 0));
        e.setText(value);
        e.setBackground(Ui.card(this, Ui.PANEL, Ui.CARD_STROKE, 12));
        e.setPadding(dp(12), dp(10), dp(12), dp(10));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, dp(4), 0, dp(4));
        e.setLayoutParams(lp);
        return e;
    }

    private Button actionButton(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextColor(Ui.ACCENT);
        b.setTextSize(14);
        b.setBackground(Ui.pill(this, 0x2229C5F6, 0x8829C5F6));
        b.setPadding(dp(16), 0, dp(16), 0);
        b.setMinHeight(dp(40));
        b.setMinimumHeight(dp(40));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(40));
        lp.setMargins(0, dp(6), dp(8), dp(2));
        b.setLayoutParams(lp);
        return b;
    }

    private Button flatButton(String text, int size) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextColor(Ui.ACCENT);
        b.setTextSize(size);
        b.setBackground(null);
        b.setMinWidth(dp(48));
        b.setMinimumWidth(dp(48));
        return b;
    }

    private CheckBox check(String text, boolean on) {
        CheckBox c = new CheckBox(this);
        c.setText(text);
        c.setTextColor(Ui.TEXT);
        c.setTextSize(14);
        c.setChecked(on);
        c.setPadding(dp(4), dp(4), 0, dp(4));
        return c;
    }

    private void saveOnChange(EditText e, String key) {
        e.addTextChangedListener(new Watcher(s -> {
            prefs.edit().putString(key, s.trim()).apply();
            refreshSelection();
        }));
    }

    private void open(String url) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
        catch (Exception e) { toast("Open this in your browser: " + url); }
    }

    private void toast(String s) { android.widget.Toast.makeText(this, s, android.widget.Toast.LENGTH_SHORT).show(); }

    private static final class ModelSelected implements AdapterView.OnItemSelectedListener {
        private final SharedPreferences prefs;
        private final String key;
        private final List<String> values;
        ModelSelected(SharedPreferences prefs, String key, List<String> values) { this.prefs = prefs; this.key = key; this.values = values; }
        @Override public void onItemSelected(AdapterView<?> parent, View view, int pos, long id) {
            prefs.edit().putString(key, values.get(pos)).apply();
        }
        @Override public void onNothingSelected(AdapterView<?> parent) { }
    }

    private static final class Watcher implements TextWatcher {
        interface Fn { void on(String s); }
        private final Fn fn;
        Watcher(Fn fn) { this.fn = fn; }
        @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
        @Override public void onTextChanged(CharSequence s, int a, int b, int c) { }
        @Override public void afterTextChanged(Editable s) { fn.on(s.toString()); }
    }
}
