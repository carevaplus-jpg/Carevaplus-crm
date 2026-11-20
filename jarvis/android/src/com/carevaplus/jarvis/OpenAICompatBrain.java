package com.carevaplus.jarvis;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Brains with an OpenAI-compatible chat API: NVIDIA, Groq and OpenRouter.
 * Streams the answer so text appears as it is written.
 */
public class OpenAICompatBrain implements Brain {
    private static final String[] NOT_CHAT = {"embed", "guard", "safety", "clip", "retriever", "detector",
            "calibration", "translate", "starcoder", "reward", "whisper", "tts", "orpheus", "prompt-guard",
            "cosmos", "lyria", "image", "nemoretriever", "content-safety"};

    private final Providers.Provider provider;
    private final String apiKey;
    private final String system;
    private final String chosenModel;   // "" = auto
    private final String base;
    private String resolved = "";
    private Listener listener;
    private volatile HttpURLConnection active;
    private volatile boolean stopped;

    public OpenAICompatBrain(Providers.Provider provider, String apiKey, String model, String profile) {
        this(provider, apiKey, model, profile, provider.baseUrl);
    }

    OpenAICompatBrain(Providers.Provider provider, String apiKey, String model, String profile, String base) {
        this.provider = provider;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.chosenModel = model == null ? "" : model.trim();
        this.system = Persona.systemPrompt(profile);
        this.base = base;
    }

    @Override public String label() {
        String m = resolved.isEmpty() ? chosenModel : resolved;
        return m.isEmpty() ? provider.name : provider.name + " · " + shortName(m);
    }

    static String shortName(String model) {
        String m = model.substring(model.lastIndexOf('/') + 1);
        return m.replace(":free", "");
    }

    @Override public void setListener(Listener l) { listener = l; }

    @Override public void stop() {
        stopped = true;
        HttpURLConnection c = active;
        if (c != null) c.disconnect();
    }

    @Override
    public String reply(List<String[]> history) throws JarvisClient.JarvisException {
        if (apiKey.isEmpty()) throw new JarvisClient.JarvisException("Add your " + provider.name + " key in Settings (⚙).");
        stopped = false;
        try {
            resolved = chosenModel.isEmpty() ? pickModel() : chosenModel;
            JSONArray messages = new JSONArray();
            messages.put(new JSONObject().put("role", "system").put("content", system));
            for (String[] m : Http.trimToUserStart(history)) {
                messages.put(new JSONObject().put("role", m[0]).put("content", m[1]));
            }
            JSONObject body = new JSONObject()
                    .put("model", resolved)
                    .put("messages", messages)
                    .put("stream", true)
                    .put("max_tokens", 4096)
                    .put("temperature", 0.6);
            if (resolved.contains("gpt-oss")) body.put("reasoning_effort", "low"); // faster answers
            return stream(body.toString());
        } catch (JSONException e) {
            throw new JarvisClient.JarvisException(provider.name + " sent a reply this app could not read. Please try again.", true);
        }
    }

    private HttpURLConnection open(String method, String path, int readTimeoutMs) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(base + path).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(15000);
        c.setReadTimeout(readTimeoutMs);
        if (!apiKey.isEmpty()) c.setRequestProperty("Authorization", "Bearer " + apiKey);
        if (provider == Providers.OPENROUTER) {
            c.setRequestProperty("HTTP-Referer", "https://github.com/carevaplus-jpg/Carevaplus-crm");
            c.setRequestProperty("X-Title", "Careva+ Jarvis");
        }
        return c;
    }

    private String stream(String json) throws JarvisClient.JarvisException, JSONException {
        HttpURLConnection c = null;
        try {
            c = open("POST", "/chat/completions", 120_000);
            active = c;
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            c.setRequestProperty("Accept", "text/event-stream");
            c.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream os = c.getOutputStream()) { os.write(bytes); }
            int code = c.getResponseCode();
            if (code != 200) throw error(code, Http.readAll(c.getErrorStream()));

            StringBuilder acc = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while (!stopped && (line = r.readLine()) != null) {
                    if (!line.startsWith("data:")) continue;          // skips ": keep-alive" comments
                    String data = line.substring(5).trim();
                    if (data.equals("[DONE]")) break;
                    if (data.isEmpty()) continue;
                    JSONObject ev = new JSONObject(data);
                    if (ev.has("error")) {
                        JSONObject err = ev.optJSONObject("error");
                        String msg = err != null ? err.optString("message", "") : ev.optString("error");
                        throw new JarvisClient.JarvisException(provider.name + " stopped with an error: " + msg, true);
                    }
                    JSONArray choices = ev.optJSONArray("choices");
                    if (choices == null || choices.length() == 0) continue;
                    JSONObject delta = choices.getJSONObject(0).optJSONObject("delta");
                    if (delta == null || delta.isNull("content")) continue;
                    String piece = delta.optString("content", "");
                    if (piece.isEmpty()) continue;
                    acc.append(piece);
                    if (listener != null) listener.onPartial(Http.cleanReply(acc.toString()));
                }
            }
            String text = Http.cleanReply(acc.toString());
            if (text.isEmpty()) {
                if (stopped) throw new JarvisClient.JarvisException("Stopped.");
                throw new JarvisClient.JarvisException(provider.name + " sent an empty reply. Please try again.", true);
            }
            return text;
        } catch (SocketTimeoutException e) {
            throw new JarvisClient.JarvisException(provider.name + " took too long to answer.", true);
        } catch (UnknownHostException e) {
            throw new JarvisClient.JarvisException("No internet connection. Check your Wi-Fi or mobile data.");
        } catch (IOException e) {
            if (stopped) throw new JarvisClient.JarvisException("Stopped.");
            throw new JarvisClient.JarvisException("Connection problem with " + provider.name + ": " + e.getMessage(), true);
        } finally {
            active = null;
            if (c != null) c.disconnect();
        }
    }

    private JarvisClient.JarvisException error(int code, String body) {
        String detail = "";
        try {
            JSONObject o = new JSONObject(body);
            Object e = o.opt("error");
            detail = e instanceof JSONObject ? ((JSONObject) e).optString("message", "") : o.optString("detail", String.valueOf(e == null ? "" : e));
        } catch (JSONException ignored) { }
        if (detail.length() > 200) detail = detail.substring(0, 200) + "…";
        switch (code) {
            case 401: case 403:
                return new JarvisClient.JarvisException("Your " + provider.name + " key was not accepted. Check it in Settings (⚙).");
            case 402:
                return new JarvisClient.JarvisException(provider.name + " says this needs credit. Pick a free model in Settings (⚙).", true);
            case 404:
                return new JarvisClient.JarvisException(provider.name + " no longer offers " + shortName(resolved) + ". Choose another model in Settings (⚙).", true);
            case 429:
                return new JarvisClient.JarvisException(provider.name + "'s free limit was reached for now. Try again in a minute.", true);
            default:
                if (code >= 500) return new JarvisClient.JarvisException(provider.name + " is busy right now. Please try again shortly.", true);
                return new JarvisClient.JarvisException(provider.name + " had a problem (error " + code + ")." + (detail.isEmpty() ? "" : "\n" + detail));
        }
    }

    /** Chat models this key can use, best first (OpenRouter: free models only). */
    public List<String> listModels() throws JarvisClient.JarvisException {
        HttpURLConnection c = null;
        try {
            c = open("GET", "/models", 30_000);
            c.setRequestProperty("Accept", "application/json");
            int code = c.getResponseCode();
            if (code != 200) throw error(code, Http.readAll(c.getErrorStream()));
            JSONArray data = new JSONObject(Http.readAll(c.getInputStream())).optJSONArray("data");
            List<String> ids = new ArrayList<>();
            if (data != null) {
                for (int i = 0; i < data.length(); i++) {
                    String id = data.getJSONObject(i).optString("id");
                    if (id.isEmpty() || !isChatModel(id)) continue;
                    if (provider == Providers.OPENROUTER && !id.endsWith(":free") && !id.equals("openrouter/free")) continue;
                    ids.add(id);
                }
            }
            return rank(ids);
        } catch (JSONException e) {
            throw new JarvisClient.JarvisException("Could not read " + provider.name + "'s model list.");
        } catch (UnknownHostException e) {
            throw new JarvisClient.JarvisException("No internet connection.");
        } catch (IOException e) {
            throw new JarvisClient.JarvisException("Could not reach " + provider.name + ": " + e.getMessage(), true);
        } finally {
            if (c != null) c.disconnect();
        }
    }

    static boolean isChatModel(String id) {
        String l = id.toLowerCase();
        for (String bad : NOT_CHAT) if (l.contains(bad)) return false;
        return true;
    }

    /** Preferred models first (in order), then the rest alphabetically. */
    List<String> rank(List<String> ids) {
        List<String> out = new ArrayList<>();
        for (String p : provider.preferred) if (ids.contains(p)) out.add(p);
        List<String> rest = new ArrayList<>(ids);
        rest.removeAll(out);
        Collections.sort(rest);
        out.addAll(rest);
        return out;
    }

    /** "Auto": the best preferred model that is currently offered. */
    String pickModel() {
        try {
            List<String> ids = listModels();
            if (!ids.isEmpty()) return ids.get(0);
        } catch (JarvisClient.JarvisException ignored) { }
        return provider.preferred.get(0);
    }
}
