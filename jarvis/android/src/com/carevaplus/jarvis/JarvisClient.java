package com.carevaplus.jarvis;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Talks to the OpenJarvis API server running on the user's computer
 * (OpenAI-compatible: GET /v1/info, POST /v1/chat/completions).
 * Uses only java.* and org.json so it also runs on a desktop JVM for testing.
 */
public class JarvisClient implements Brain {

    /** A user-friendly error message, safe to show on screen. */
    public static class JarvisException extends Exception {
        public JarvisException(String message) { super(message); }
    }

    private static final int CONNECT_TIMEOUT_MS = 8000;
    private static final int INFO_TIMEOUT_MS = 15000;
    private static final int CHAT_TIMEOUT_MS = 10 * 60 * 1000; // small local models can be slow

    private final String baseUrl;
    private final String apiKey;

    public JarvisClient(String baseUrl, String apiKey) {
        this.baseUrl = normalizeUrl(baseUrl);
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    /** "192.168.1.5" -> "http://192.168.1.5:8000"; strips spaces and trailing slashes. */
    public static String normalizeUrl(String raw) {
        String u = raw == null ? "" : raw.trim();
        if (u.isEmpty()) return "";
        if (!u.startsWith("http://") && !u.startsWith("https://")) u = "http://" + u;
        while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
        // Add the default Jarvis port when only an IP/host was typed.
        String afterScheme = u.substring(u.indexOf("://") + 3);
        if (u.startsWith("http://") && !afterScheme.contains(":") && !afterScheme.contains("/")) {
            u = u + ":8000";
        }
        return u;
    }

    public String getBaseUrl() { return baseUrl; }

    private String model = "";

    @Override public String label() { return model.isEmpty() ? "My computer" : "My computer · " + model; }

    @Override
    public String reply(List<String[]> history) throws JarvisException {
        if (model.isEmpty()) model = fetchModel();
        return chat(model, Http.trimToUserStart(history));
    }

    /** Checks the server and the access key; returns the model Jarvis is using. */
    public String fetchModel() throws JarvisException {
        String body = request("GET", "/v1/info", null, INFO_TIMEOUT_MS);
        try {
            String model = new JSONObject(body).optString("model", "");
            if (!model.isEmpty()) return model;
        } catch (JSONException ignored) { }
        // Fallback: first model in the list (the server puts its default first).
        body = request("GET", "/v1/models", null, INFO_TIMEOUT_MS);
        try {
            JSONArray data = new JSONObject(body).getJSONArray("data");
            if (data.length() > 0) return data.getJSONObject(0).getString("id");
        } catch (JSONException ignored) { }
        throw new JarvisException("Connected, but Jarvis has no AI model ready. On your computer run: ollama pull qwen3.5:2b");
    }

    /**
     * Sends the conversation and returns Jarvis's reply.
     * @param history list of {role, content} pairs, oldest first ("user" / "assistant").
     */
    public String chat(String model, List<String[]> history) throws JarvisException {
        try {
            JSONArray messages = new JSONArray();
            for (String[] m : history) {
                messages.put(new JSONObject().put("role", m[0]).put("content", m[1]));
            }
            JSONObject req = new JSONObject()
                    .put("model", model)
                    .put("messages", messages)
                    .put("stream", false)
                    .put("max_tokens", 1024);
            // Small local models occasionally return an empty answer; retry once.
            for (int attempt = 0; attempt < 2; attempt++) {
                String body = request("POST", "/v1/chat/completions", req.toString(), CHAT_TIMEOUT_MS);
                JSONObject msg = new JSONObject(body).getJSONArray("choices")
                        .getJSONObject(0).getJSONObject("message");
                String content = msg.isNull("content") ? "" : msg.optString("content", "").trim();
                if (!content.isEmpty()) return content;
            }
            throw new JarvisException("Jarvis sent an empty reply. Please try again.");
        } catch (JSONException e) {
            throw new JarvisException("Jarvis sent a reply this app could not read. Please try again.");
        }
    }

    private String request(String method, String path, String jsonBody, int readTimeoutMs)
            throws JarvisException {
        if (baseUrl.isEmpty()) {
            throw new JarvisException("Set your computer's address in Settings first.");
        }
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(baseUrl + path).openConnection();
            conn.setRequestMethod(method);
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(readTimeoutMs);
            conn.setRequestProperty("Accept", "application/json");
            if (!apiKey.isEmpty()) conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            if (jsonBody != null) {
                byte[] bytes = jsonBody.getBytes(StandardCharsets.UTF_8);
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setFixedLengthStreamingMode(bytes.length);
                try (OutputStream os = conn.getOutputStream()) { os.write(bytes); }
            }
            int code = conn.getResponseCode();
            String text = readAll(code >= 400 ? conn.getErrorStream() : conn.getInputStream());
            if (code == 401 || code == 403) {
                throw new JarvisException("The access key is wrong or missing. Copy it again from your computer (jarvis auth create-key).");
            }
            if (code == 404) {
                throw new JarvisException("Reached " + baseUrl + " but it is not Jarvis. Check the address and port (usually 8000).");
            }
            if (code == 503) {
                throw new JarvisException("Jarvis is running but its AI engine is not ready. Make sure Ollama is running on your computer.");
            }
            if (code >= 400) {
                throw new JarvisException("Jarvis had a problem (error " + code + "). Please try again." + shortDetail(text));
            }
            return text;
        } catch (JarvisException e) {
            throw e;
        } catch (SocketTimeoutException e) {
            throw new JarvisException("Jarvis took too long to answer. Try a shorter question, or check your computer.");
        } catch (ConnectException | UnknownHostException e) {
            throw new JarvisException("Can't reach your computer at " + baseUrl + ". Check that it is on, that your phone is on the same Wi-Fi, and that 'jarvis serve --host 0.0.0.0' is running.");
        } catch (IOException e) {
            throw new JarvisException("Connection problem: " + e.getMessage());
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static String shortDetail(String text) {
        if (text == null) return "";
        try {
            String d = new JSONObject(text).optString("detail", "");
            if (!d.isEmpty()) return "\n(" + (d.length() > 160 ? d.substring(0, 160) + "…" : d) + ")";
        } catch (JSONException ignored) { }
        return "";
    }

    private static String readAll(InputStream in) throws IOException {
        if (in == null) return "";
        try (InputStream is = in) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) out.write(buf, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    /** Turns simple Markdown into plain text for chat bubbles and speech. */
    public static String plainText(String md) {
        if (md == null) return "";
        StringBuilder sb = new StringBuilder();
        for (String line : md.replace("\r", "").split("\n", -1)) {
            String l = line;
            String t = l.trim();
            if (t.startsWith("```")) continue;
            if (t.matches("^-{3,}$|^\\*{3,}$|^_{3,}$")) { sb.append("\n"); continue; }
            l = l.replaceFirst("^\\s*#{1,6}\\s+", "");
            l = l.replaceFirst("^(\\s*)[*-]\\s+\\[[ xX]\\]\\s+", "$1☐ ");
            l = l.replaceFirst("^(\\s*)[*-]\\s+", "$1• ");
            l = l.replace("**", "").replace("__", "").replace("`", "");
            sb.append(l).append("\n");
        }
        return sb.toString().replaceAll("\n{3,}", "\n\n").trim();
    }
}
