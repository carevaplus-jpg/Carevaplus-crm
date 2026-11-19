package com.carevaplus.jarvis;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Claude via the Anthropic Messages API (raw HTTP: the app has no third-party libraries). */
public class ClaudeBrain implements Brain {
    static final String URL = "https://api.anthropic.com/v1/messages";
    static final String MODEL = "claude-opus-5-5";
    static final String API_VERSION = "2026-10-21";
    // Server-side fallback: if Claude Opus 5.5 declines a request, another model answers instead of failing.
    static final String FALLBACK_BETA = "server-side-fallback-2026-07-01";

    private final String apiKey;
    private final String system;
    private final String baseUrl;

    public ClaudeBrain(String apiKey, String profile) { this(apiKey, profile, URL); }

    /** baseUrl is overridable for tests. */
    ClaudeBrain(String apiKey, String profile, String baseUrl) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.system = Persona.systemPrompt(profile);
        this.baseUrl = baseUrl;
    }

    @Override public String label() { return "Claude"; }

    @Override
    public String reply(List<String[]> history) throws JarvisClient.JarvisException {
        if (apiKey.isEmpty()) throw new JarvisClient.JarvisException("Add your Claude API key in Settings (⚙).");
        try {
            JSONArray messages = new JSONArray();
            for (String[] m : Http.trimToUserStart(history)) {
                messages.put(new JSONObject().put("role", m[0]).put("content", m[1]));
            }
            JSONObject body = new JSONObject()
                    .put("model", MODEL)
                    .put("max_tokens", 16000)
                    .put("system", system)
                    .put("output_config", new JSONObject().put("effort", "medium"))
                    .put("fallbacks", "default")
                    .put("messages", messages);
            Map<String, String> h = new HashMap<>();
            h.put("x-api-key", apiKey);
            h.put("anthropic-version", API_VERSION);
            h.put("anthropic-beta", FALLBACK_BETA);
            Http.Response r = Http.send("POST", baseUrl, h, body.toString(), 15000, 5 * 60 * 1000);
            if (r.code != 200) throw new JarvisClient.JarvisException(errorMessage(r));
            return parse(r.body);
        } catch (JSONException e) {
            throw new JarvisClient.JarvisException("Claude sent a reply this app could not read. Please try again.");
        } catch (UnknownHostException e) {
            throw new JarvisClient.JarvisException("No internet connection. Check your Wi-Fi or mobile data.");
        } catch (SocketTimeoutException e) {
            throw new JarvisClient.JarvisException("Claude took too long to answer. Please try again.");
        } catch (IOException e) {
            throw new JarvisClient.JarvisException("Connection problem: " + e.getMessage());
        }
    }

    static String parse(String json) throws JSONException, JarvisClient.JarvisException {
        JSONObject resp = new JSONObject(json);
        if ("refusal".equals(resp.optString("stop_reason"))) {
            throw new JarvisClient.JarvisException("Claude declined to answer that. Try rephrasing the request.");
        }
        StringBuilder sb = new StringBuilder();
        JSONArray content = resp.getJSONArray("content");
        for (int i = 0; i < content.length(); i++) {
            JSONObject block = content.getJSONObject(i);
            if ("text".equals(block.optString("type"))) sb.append(block.optString("text"));
        }
        String text = sb.toString().trim();
        if (text.isEmpty()) throw new JarvisClient.JarvisException("Claude sent an empty reply. Please try again.");
        return text;
    }

    static String errorMessage(Http.Response r) {
        String detail = "";
        try { detail = new JSONObject(r.body).getJSONObject("error").optString("message", ""); }
        catch (JSONException ignored) { }
        switch (r.code) {
            case 401: return "Your Claude API key was not accepted. Check it in Settings (⚙).";
            case 403: return "This Claude API key is not allowed to do that. " + detail;
            case 429: return "Too many requests or your Claude credit has run out. Wait a minute, or check your account at console.anthropic.com.";
            case 529: case 500: case 502: case 503: return "Claude is busy right now. Please try again in a moment.";
            default: return "Claude had a problem (error " + r.code + ")." + (detail.isEmpty() ? "" : "\n" + detail);
        }
    }
}
