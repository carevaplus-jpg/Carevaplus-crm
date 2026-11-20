package com.carevaplus.jarvis;

import android.content.Context;
import android.content.SharedPreferences;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/** Builds the brain the user chose in Settings (shared by the chat and settings screens). */
final class BrainFactory {
    private BrainFactory() {}

    static final String PREFS = "jarvis";
    static final String K_BRAIN = "brain";
    static final String K_PROFILE = "profile";
    static final String K_SPEAK = "speak";
    static final String K_BACKUP = "backup";
    // Older key names kept so existing settings carry over.
    static final String K_URL = "url";
    static final String K_PC_KEY = "key";

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static String keyPref(String id) { return id + "_key"; }
    static String modelPref(String id) { return id + "_model_choice"; }

    static File modelFile(Context c) { return new File(c.getFilesDir(), LocalBrain.MODEL_FILE); }

    static String chosen(SharedPreferences p) { return p.getString(K_BRAIN, "groq"); }

    static boolean isReady(Context c, String id) {
        SharedPreferences p = prefs(c);
        switch (id) {
            case "local": return LocalBrain.isModelReady(modelFile(c));
            case "computer": return !p.getString(K_URL, "").isEmpty();
            default: return !p.getString(keyPref(id), "").isEmpty();
        }
    }

    static Brain create(Context c, String id) {
        SharedPreferences p = prefs(c);
        String profile = p.getString(K_PROFILE, "");
        String key = p.getString(keyPref(id), "");
        String model = p.getString(modelPref(id), "");
        switch (id) {
            case "claude": return new ClaudeBrain(key, profile, model);
            case "gemini": return new GeminiBrain(key, profile, model);
            case "local": return new LocalBrain(modelFile(c), profile);
            case "computer": return new JarvisClient(p.getString(K_URL, ""), p.getString(K_PC_KEY, ""));
            default: return new OpenAICompatBrain(Providers.byId(id), key, model, profile);
        }
    }

    /** The chosen brain, plus (if enabled) the other free online brains that have keys, as backups. */
    static Brain createWithBackups(Context c) {
        SharedPreferences p = prefs(c);
        String id = chosen(p);
        Brain main = create(c, id);
        boolean backups = p.getBoolean(K_BACKUP, true);
        if (!backups || "local".equals(id) || "computer".equals(id)) return main;
        List<Brain> chain = new ArrayList<>();
        chain.add(main);
        for (Providers.Provider pr : Providers.BACKUP_ORDER) {
            if (!pr.id.equals(id) && isReady(c, pr.id)) chain.add(create(c, pr.id));
        }
        return chain.size() == 1 ? main : new FallbackBrain(chain);
    }

    /** One-time move from the v2 settings layout. */
    static void migrate(SharedPreferences p) {
        if (p.getInt("prefs_version", 0) >= 3) return;
        SharedPreferences.Editor e = p.edit();
        if (p.contains("claude_key")) { /* same name in v3 */ }
        e.remove("gemini_model");                 // was an auto-picked cache; v3 re-picks
        if (!p.contains(K_BRAIN) && (p.contains("claude_key") || p.contains(K_URL))) e.putString(K_BRAIN, "claude");
        e.putInt("prefs_version", 3).apply();
    }
}
