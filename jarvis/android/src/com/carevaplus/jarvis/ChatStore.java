package com.carevaplus.jarvis;

import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Keeps the conversation when the app is closed (on the phone only). */
final class ChatStore {
    static final class Msg {
        final String role;   // user | assistant | error | note
        final String text;
        final long time;
        Msg(String role, String text, long time) { this.role = role; this.text = text; this.time = time; }
    }

    private static final String KEY = "chat_v3";
    private static final int MAX = 80;

    private ChatStore() {}

    static List<Msg> load(SharedPreferences p) {
        List<Msg> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(p.getString(KEY, "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                out.add(new Msg(o.getString("r"), o.getString("t"), o.optLong("at")));
            }
        } catch (JSONException ignored) { }
        return out;
    }

    static void save(SharedPreferences p, List<Msg> msgs) {
        JSONArray a = new JSONArray();
        int from = Math.max(0, msgs.size() - MAX);
        try {
            for (int i = from; i < msgs.size(); i++) {
                Msg m = msgs.get(i);
                a.put(new JSONObject().put("r", m.role).put("t", m.text).put("at", m.time));
            }
        } catch (JSONException ignored) { }
        p.edit().putString(KEY, a.toString()).apply();
    }

    /** What the AI sees: user/assistant turns only, newest last, at most n. */
    static List<String[]> history(List<Msg> msgs, int n) {
        List<String[]> h = new ArrayList<>();
        for (Msg m : msgs) if ("user".equals(m.role) || "assistant".equals(m.role)) h.add(new String[]{m.role, m.text});
        return h.size() > n ? new ArrayList<>(h.subList(h.size() - n, h.size())) : h;
    }
}
