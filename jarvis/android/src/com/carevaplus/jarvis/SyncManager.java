package com.carevaplus.jarvis;

import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Keeps Jarvis's settings, keys, profile and chat in the user's cloud account, encrypted.
 * The newest change wins: the phone uploads after local changes and downloads on start-up
 * when the cloud copy is newer than the last one this phone saw.
 */
final class SyncManager {
    interface Watcher { void onSyncChange(); }

    // Local-only bookkeeping (never synced).
    static final String K_SESSION = "cloud_session";
    static final String K_KEY = "cloud_key";        // derived AES key (base64); the password itself is never stored
    static final String K_SALT = "cloud_salt";
    static final String K_LAST_SYNC = "cloud_last_sync";      // ms, last successful sync
    static final String K_REMOTE_SEEN = "cloud_remote_seen";  // updated_at of the cloud copy last applied/pushed
    static final String K_DIRTY = "cloud_dirty";              // local changes not yet uploaded
    static final String K_STATUS = "cloud_status";
    static final String K_LAST_HASH = "cloud_last_hash";      // fingerprint of the last synced content

    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();
    private static final Handler UI = new Handler(Looper.getMainLooper());
    private static final Set<Watcher> WATCHERS = new CopyOnWriteArraySet<>();
    private static final CloudSync CLOUD = new CloudSync();
    private static Runnable pendingPush;

    private SyncManager() {}

    static void watch(Watcher w) { WATCHERS.add(w); }
    static void unwatch(Watcher w) { WATCHERS.remove(w); }
    private static void changed() { UI.post(() -> { for (Watcher w : WATCHERS) w.onSyncChange(); }); }

    static boolean isLocalOnly(String key) { return key.startsWith("cloud_") || key.equals("prefs_version"); }

    static CloudSync.Session session(SharedPreferences p) { return CloudSync.Session.fromJson(p.getString(K_SESSION, "")); }

    static boolean signedIn(SharedPreferences p) { return session(p) != null && !p.getString(K_KEY, "").isEmpty(); }

    static String status(SharedPreferences p) { return p.getString(K_STATUS, ""); }

    private static void setStatus(SharedPreferences p, String s) { p.edit().putString(K_STATUS, s).apply(); changed(); }

    // ------------------------------------------------------------------ snapshot of everything worth syncing

    /** All synced prefs (brain, keys, models, profile, voice, backup, computer, chat) as JSON. */
    static String snapshot(SharedPreferences p) {
        JSONObject o = new JSONObject();
        try {
            for (Map.Entry<String, ?> e : p.getAll().entrySet()) {
                if (isLocalOnly(e.getKey())) continue;
                Object v = e.getValue();
                if (v instanceof String || v instanceof Boolean || v instanceof Integer || v instanceof Long) {
                    o.put(e.getKey(), v);
                }
            }
            return new JSONObject().put("v", 1).put("prefs", o).toString();
        } catch (JSONException ex) { return "{}"; }
    }

    /** Applies a downloaded snapshot. Keys missing from it are kept, so nothing local is lost silently. */
    static void apply(SharedPreferences p, String json) throws JSONException {
        JSONObject prefs = new JSONObject(json).getJSONObject("prefs");
        SharedPreferences.Editor e = p.edit();
        for (java.util.Iterator<String> it = prefs.keys(); it.hasNext(); ) {
            String k = it.next();
            if (isLocalOnly(k)) continue;
            Object v = prefs.get(k);
            if (v instanceof Boolean) e.putBoolean(k, (Boolean) v);
            else if (v instanceof Integer) e.putInt(k, (Integer) v);
            else if (v instanceof Long) e.putLong(k, (Long) v);
            else e.putString(k, String.valueOf(v));
        }
        e.commit();   // synchronous, so the fingerprint below sees the new values
        p.edit().putString(K_LAST_HASH, fingerprint(p)).commit();
    }

    /** SHA-256 of the synced content; used to skip uploads when nothing really changed (no ping-pong between phones). */
    static String fingerprint(SharedPreferences p) {
        try {
            byte[] d = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(snapshot(p).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.Base64.getEncoder().encodeToString(d);
        } catch (java.security.NoSuchAlgorithmException e) { return ""; }
    }

    // ------------------------------------------------------------------ account actions (call from UI thread)

    interface Done { void done(boolean ok, String message); }

    static void signIn(SharedPreferences p, String email, String password, boolean create, Done done) {
        EXEC.execute(() -> {
            try {
                CloudSync.Session s = create ? CLOUD.signUp(email, password) : CLOUD.signIn(email, password);
                if (s == null) {
                    post(done, true, "Account created. Open the confirmation link we emailed to " + email.trim()
                            + ", then come back and tap Sign in.");
                    return;
                }
                CloudSync.Remote remote = CLOUD.pull(s);
                String salt = remote != null ? remote.salt : CloudSync.newSalt();
                String key = CloudSync.deriveKey(password, salt);
                p.edit().putString(K_SESSION, s.toJson()).putString(K_KEY, key).putString(K_SALT, salt).apply();
                String msg;
                if (remote != null) {
                    String json = CloudSync.decrypt(key, remote.blob);   // throws if the password was reset
                    apply(p, json);
                    p.edit().putString(K_REMOTE_SEEN, remote.updatedAt).putBoolean(K_DIRTY, false)
                            .putLong(K_LAST_SYNC, System.currentTimeMillis()).apply();
                    msg = "Signed in. Your Jarvis settings and chats were restored from the cloud.";
                } else {
                    pushNow(p, s);
                    msg = "Signed in. This phone's Jarvis settings and chats are now backed up, encrypted.";
                }
                setStatus(p, "");
                post(done, true, msg);
            } catch (JarvisClient.JarvisException e) {
                post(done, false, e.getMessage());
            } catch (JSONException e) {
                post(done, false, "The cloud copy is damaged. You can replace it with this phone's data.");
            }
        });
    }

    /** After a password reset: overwrite the unreadable cloud copy with this phone's data under the new password. */
    static void replaceCloudCopy(SharedPreferences p, String email, String password, Done done) {
        EXEC.execute(() -> {
            try {
                CloudSync.Session s = CLOUD.signIn(email, password);
                String salt = CloudSync.newSalt();
                p.edit().putString(K_SESSION, s.toJson()).putString(K_SALT, salt)
                        .putString(K_KEY, CloudSync.deriveKey(password, salt)).apply();
                pushNow(p, s);
                post(done, true, "Cloud copy replaced with this phone's data.");
            } catch (JarvisClient.JarvisException e) {
                post(done, false, e.getMessage());
            }
        });
    }

    static void resetPassword(String email, Done done) {
        EXEC.execute(() -> {
            try {
                CLOUD.sendPasswordReset(email);
                post(done, true, "Password-reset email sent. Note: after a reset, the old cloud copy can't be unlocked; "
                        + "this phone's data will be uploaded again when you sign in.");
            } catch (JarvisClient.JarvisException e) { post(done, false, e.getMessage()); }
        });
    }

    static void signOut(SharedPreferences p) {
        CloudSync.Session s = session(p);
        p.edit().remove(K_SESSION).remove(K_KEY).remove(K_SALT).remove(K_LAST_SYNC).remove(K_REMOTE_SEEN)
                .remove(K_DIRTY).remove(K_STATUS).remove(K_LAST_HASH).apply();
        if (s != null) EXEC.execute(() -> CLOUD.signOut(s));
        changed();
    }

    // ------------------------------------------------------------------ background sync

    /** Call after any local change; uploads a few seconds later (changes are batched). */
    static void markDirty(SharedPreferences p) {
        if (!signedIn(p)) return;
        if (fingerprint(p).equals(p.getString(K_LAST_HASH, ""))) return;   // nothing new to upload
        p.edit().putBoolean(K_DIRTY, true).apply();
        synchronized (SyncManager.class) {
            if (pendingPush != null) UI.removeCallbacks(pendingPush);
            pendingPush = () -> syncNow(p, null);
            UI.postDelayed(pendingPush, 4000);
        }
    }

    /** Download-if-newer, otherwise upload pending changes. Safe to call often (e.g. on start-up). */
    static void syncNow(SharedPreferences p, Done done) {
        if (!signedIn(p)) { if (done != null) done.done(false, "Not signed in."); return; }
        EXEC.execute(() -> {
            try {
                CloudSync.Session s = validSession(p);
                CloudSync.Remote remote = CLOUD.pull(s);
                boolean dirty = p.getBoolean(K_DIRTY, false);
                String seen = p.getString(K_REMOTE_SEEN, "");
                if (remote != null && !remote.updatedAt.equals(seen) && !dirty) {
                    // Another phone changed something: take it.
                    if (!remote.salt.equals(p.getString(K_SALT, ""))) {
                        throw new JarvisClient.JarvisException("Your password was changed on another phone. Sign in again here.");
                    }
                    apply(p, CloudSync.decrypt(p.getString(K_KEY, ""), remote.blob));
                    p.edit().putString(K_REMOTE_SEEN, remote.updatedAt).putLong(K_LAST_SYNC, System.currentTimeMillis()).apply();
                } else if (dirty || remote == null) {
                    pushNow(p, s);
                } else {
                    p.edit().putLong(K_LAST_SYNC, System.currentTimeMillis()).apply();
                }
                setStatus(p, "");
                post(done, true, "Synced.");
            } catch (JarvisClient.JarvisException e) {
                setStatus(p, e.getMessage());
                post(done, false, e.getMessage());
            } catch (JSONException e) {
                setStatus(p, "The cloud copy is damaged.");
                post(done, false, "The cloud copy is damaged.");
            }
        });
    }

    private static CloudSync.Session validSession(SharedPreferences p) throws JarvisClient.JarvisException {
        CloudSync.Session s = session(p);
        if (s == null) throw new JarvisClient.JarvisException("Not signed in.");
        if (s.expiresSoon()) {
            s = CLOUD.refresh(s);
            p.edit().putString(K_SESSION, s.toJson()).apply();
        }
        return s;
    }

    private static void pushNow(SharedPreferences p, CloudSync.Session s) throws JarvisClient.JarvisException {
        String blob = CloudSync.encrypt(p.getString(K_KEY, ""), snapshot(p));
        CLOUD.push(s, p.getString(K_SALT, ""), blob);
        CloudSync.Remote after = CLOUD.pull(s);
        p.edit().putBoolean(K_DIRTY, false).putLong(K_LAST_SYNC, System.currentTimeMillis())
                .putString(K_REMOTE_SEEN, after != null ? after.updatedAt : "")
                .putString(K_LAST_HASH, fingerprint(p)).apply();
        changed();
    }

    private static void post(Done d, boolean ok, String msg) {
        changed();
        if (d != null) UI.post(() -> d.done(ok, msg));
    }
}
