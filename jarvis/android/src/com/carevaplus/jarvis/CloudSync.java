package com.carevaplus.jarvis;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Jarvis cloud account (Supabase Auth + the public.jarvis_sync table in the Careva+ project).
 *
 * Everything uploaded is encrypted on the phone with AES-256-GCM using a key derived from the
 * user's password (PBKDF2-SHA256). The server only stores ciphertext; the password and the key
 * never leave the phone. Uses only java.* and org.json so it can be tested on a desktop JVM.
 */
public class CloudSync {

    /** Careva+ Supabase project (publishable key: safe to ship in the app; data is protected by RLS). */
    static final String DEFAULT_URL = "https://prjedhzcrrboyhewvcar.supabase.co";
    static final String DEFAULT_KEY = "sb_publishable_GSX6LQ_mVVtDaEaagS_fig_Dpa-FE2I";
    static final int PBKDF2_ITERATIONS = 150_000;

    /** A signed-in session. */
    public static final class Session {
        public final String accessToken, refreshToken, userId, email;
        public final long expiresAtMs;

        Session(String accessToken, String refreshToken, String userId, String email, long expiresAtMs) {
            this.accessToken = accessToken; this.refreshToken = refreshToken;
            this.userId = userId; this.email = email; this.expiresAtMs = expiresAtMs;
        }

        boolean expiresSoon() { return System.currentTimeMillis() > expiresAtMs - 60_000; }

        String toJson() {
            try {
                return new JSONObject().put("a", accessToken).put("r", refreshToken).put("u", userId)
                        .put("e", email).put("x", expiresAtMs).toString();
            } catch (JSONException e) { return "{}"; }
        }

        static Session fromJson(String s) {
            if (s == null || s.isEmpty()) return null;
            try {
                JSONObject o = new JSONObject(s);
                return new Session(o.getString("a"), o.getString("r"), o.getString("u"), o.optString("e"), o.getLong("x"));
            } catch (JSONException e) { return null; }
        }
    }

    /** The encrypted row stored in the cloud. */
    public static final class Remote {
        public final String salt, blob, updatedAt;
        Remote(String salt, String blob, String updatedAt) { this.salt = salt; this.blob = blob; this.updatedAt = updatedAt; }
    }

    private final String url;
    private final String apiKey;

    public CloudSync() { this(DEFAULT_URL, DEFAULT_KEY); }

    CloudSync(String url, String apiKey) { this.url = url; this.apiKey = apiKey; }

    // ------------------------------------------------------------------ auth

    /** Creates an account. Returns a session, or null when the email must be confirmed first. */
    public Session signUp(String email, String password) throws JarvisClient.JarvisException {
        checkCredentials(email, password);
        JSONObject r = call("POST", "/auth/v1/signup", body("email", email.trim(), "password", password), null);
        return r.has("access_token") ? session(r) : null;
    }

    public Session signIn(String email, String password) throws JarvisClient.JarvisException {
        checkCredentials(email, password);
        return session(call("POST", "/auth/v1/token?grant_type=password", body("email", email.trim(), "password", password), null));
    }

    public Session refresh(Session s) throws JarvisClient.JarvisException {
        return session(call("POST", "/auth/v1/token?grant_type=refresh_token", body("refresh_token", s.refreshToken), null));
    }

    public void signOut(Session s) {
        try { call("POST", "/auth/v1/logout", "{}", s); } catch (JarvisClient.JarvisException ignored) { }
    }

    /** Emails a password-reset link. Note: synced data encrypted with the old password can't be read after a reset. */
    public void sendPasswordReset(String email) throws JarvisClient.JarvisException {
        if (email == null || !email.contains("@")) throw new JarvisClient.JarvisException("Enter your email address first.");
        call("POST", "/auth/v1/recover", body("email", email.trim()), null);
    }

    private static void checkCredentials(String email, String password) throws JarvisClient.JarvisException {
        if (email == null || !email.trim().matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
            throw new JarvisClient.JarvisException("Enter a valid email address.");
        }
        if (password == null || password.length() < 8) {
            throw new JarvisClient.JarvisException("Use a password of at least 8 characters.");
        }
    }

    private static Session session(JSONObject r) throws JarvisClient.JarvisException {
        try {
            JSONObject user = r.getJSONObject("user");
            long exp = r.has("expires_at") ? r.getLong("expires_at") * 1000L
                    : System.currentTimeMillis() + r.optLong("expires_in", 3600) * 1000L;
            return new Session(r.getString("access_token"), r.getString("refresh_token"),
                    user.getString("id"), user.optString("email"), exp);
        } catch (JSONException e) {
            throw new JarvisClient.JarvisException("The sign-in reply could not be read. Please try again.");
        }
    }

    // ------------------------------------------------------------------ data

    /** The user's encrypted row, or null if nothing has been synced yet. */
    public Remote pull(Session s) throws JarvisClient.JarvisException {
        JSONArray rows = callArray("GET", "/rest/v1/jarvis_sync?select=salt,blob,updated_at&user_id=eq." + s.userId, s);
        try {
            if (rows.length() == 0) return null;
            JSONObject o = rows.getJSONObject(0);
            return new Remote(o.getString("salt"), o.getString("blob"), o.optString("updated_at"));
        } catch (JSONException e) {
            throw new JarvisClient.JarvisException("The cloud copy could not be read.");
        }
    }

    /** Creates or replaces the user's encrypted row. */
    public void push(Session s, String salt, String blob) throws JarvisClient.JarvisException {
        String json;
        try {
            json = new JSONObject().put("user_id", s.userId).put("salt", salt).put("blob", blob)
                    .put("updated_at", java.time.Instant.now().toString()).toString();
        } catch (JSONException e) { throw new JarvisClient.JarvisException("Could not prepare the upload."); }
        Map<String, String> extra = new HashMap<>();
        extra.put("Prefer", "resolution=merge-duplicates,return=minimal");
        send("POST", "/rest/v1/jarvis_sync?on_conflict=user_id", json, s, extra);
    }

    // ------------------------------------------------------------------ encryption

    public static String newSalt() {
        byte[] b = new byte[16];
        new SecureRandom().nextBytes(b);
        return Base64.getEncoder().encodeToString(b);
    }

    /** PBKDF2-SHA256 → 256-bit AES key (base64), slow on purpose to resist password guessing. */
    public static String deriveKey(String password, String salt) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), Base64.getDecoder().decode(salt), PBKDF2_ITERATIONS, 256);
            byte[] key = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
            spec.clearPassword();
            return Base64.getEncoder().encodeToString(key);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("PBKDF2 unavailable", e);
        }
    }

    /** AES-256-GCM; output = base64(iv || ciphertext+tag). */
    public static String encrypt(String keyB64, String plaintext) {
        try {
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(Base64.getDecoder().decode(keyB64), "AES"), new GCMParameterSpec(128, iv));
            byte[] ct = c.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] out = new byte[iv.length + ct.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(ct, 0, out, iv.length, ct.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("AES-GCM unavailable", e);
        }
    }

    /** @throws JarvisClient.JarvisException if the key is wrong (e.g. the password was reset) or data is damaged. */
    public static String decrypt(String keyB64, String blobB64) throws JarvisClient.JarvisException {
        try {
            byte[] all = Base64.getDecoder().decode(blobB64);
            if (all.length < 13) throw new GeneralSecurityException("short");
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(Base64.getDecoder().decode(keyB64), "AES"),
                    new GCMParameterSpec(128, all, 0, 12));
            return new String(c.doFinal(all, 12, all.length - 12), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new JarvisClient.JarvisException("The cloud copy can't be unlocked with this password. "
                    + "This happens after a password reset. You can replace the cloud copy with this phone's data.");
        }
    }

    // ------------------------------------------------------------------ HTTP

    private static String body(String... kv) {
        try {
            JSONObject o = new JSONObject();
            for (int i = 0; i + 1 < kv.length; i += 2) o.put(kv[i], kv[i + 1]);
            return o.toString();
        } catch (JSONException e) { return "{}"; }
    }

    private JSONObject call(String method, String path, String json, Session s) throws JarvisClient.JarvisException {
        String text = send(method, path, json, s, null);
        try { return text.trim().isEmpty() ? new JSONObject() : new JSONObject(text); }
        catch (JSONException e) { throw new JarvisClient.JarvisException("Unexpected reply from the cloud."); }
    }

    private JSONArray callArray(String method, String path, Session s) throws JarvisClient.JarvisException {
        String text = send(method, path, null, s, null);
        try { return new JSONArray(text); }
        catch (JSONException e) { throw new JarvisClient.JarvisException("Unexpected reply from the cloud."); }
    }

    private String send(String method, String path, String json, Session s, Map<String, String> extra)
            throws JarvisClient.JarvisException {
        Map<String, String> h = new HashMap<>();
        h.put("apikey", apiKey);
        if (s != null) h.put("Authorization", "Bearer " + s.accessToken);
        if (extra != null) h.putAll(extra);
        try {
            Http.Response r = Http.send(method, url + path, h, json, 15000, 30000);
            if (r.code >= 200 && r.code < 300) return r.body;
            throw new JarvisClient.JarvisException(errorMessage(r));
        } catch (UnknownHostException e) {
            throw new JarvisClient.JarvisException("No internet connection.");
        } catch (SocketTimeoutException e) {
            throw new JarvisClient.JarvisException("The cloud took too long to answer. Try again.", true);
        } catch (IOException e) {
            throw new JarvisClient.JarvisException("Connection problem: " + e.getMessage(), true);
        }
    }

    static String errorMessage(Http.Response r) {
        String code = "", msg = "";
        try {
            JSONObject o = new JSONObject(r.body);
            code = o.optString("error_code", o.optString("error", o.optString("code", "")));
            msg = o.optString("msg", o.optString("message", o.optString("error_description", "")));
        } catch (JSONException ignored) { }
        switch (code) {
            case "invalid_credentials": case "invalid_grant":
                return "Wrong email or password.";
            case "email_not_confirmed":
                return "Please confirm your email first — open the link we sent you, then sign in.";
            case "user_already_exists": case "email_exists":
                return "An account with this email already exists. Sign in instead.";
            case "weak_password":
                return "That password is too weak. Use at least 8 characters with letters and numbers.";
            case "over_email_send_rate_limit": case "over_request_rate_limit":
                return "Too many attempts. Please wait a few minutes and try again.";
            case "signup_disabled":
                return "New accounts are switched off for this Jarvis cloud.";
            default:
                if (r.code == 401 || "bad_jwt".equals(code)) return "Your sign-in expired. Please sign in again.";
                return "Cloud error (" + r.code + ")" + (msg.isEmpty() ? "." : ": " + msg);
        }
    }
}
