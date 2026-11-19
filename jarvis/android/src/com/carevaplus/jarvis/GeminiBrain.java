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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Google Gemini via the Generative Language API. Picks the newest stable "Flash" model automatically. */
public class GeminiBrain implements Brain {
    static final String BASE = "https://generativelanguage.googleapis.com/v1beta";

    private final String apiKey;
    private final String system;
    private final String base;
    private String model; // e.g. "gemini-2.5-flash"; resolved on first use when empty
    private static volatile String autoModel = ""; // remembered "Auto" pick for this app session

    public GeminiBrain(String apiKey, String profile, String cachedModel) { this(apiKey, profile, cachedModel, BASE); }

    GeminiBrain(String apiKey, String profile, String cachedModel, String base) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.system = Persona.systemPrompt(profile);
        this.model = cachedModel == null ? "" : cachedModel.trim();
        this.base = base;
    }

    @Override public String label() { return model.isEmpty() ? "Gemini" : "Gemini · " + model.replace("gemini-", ""); }

    public String getModel() { return model; }

    private Map<String, String> headers() {
        Map<String, String> h = new HashMap<>();
        h.put("x-goog-api-key", apiKey);
        return h;
    }

    @Override
    public String reply(List<String[]> history) throws JarvisClient.JarvisException {
        if (apiKey.isEmpty()) throw new JarvisClient.JarvisException("Add your Gemini API key in Settings (⚙).");
        try {
            if (model.isEmpty()) model = autoModel;
            if (model.isEmpty()) { model = pickModel(); autoModel = model; }
            JSONArray contents = new JSONArray();
            for (String[] m : Http.trimToUserStart(history)) {
                contents.put(new JSONObject()
                        .put("role", "assistant".equals(m[0]) ? "model" : "user")
                        .put("parts", new JSONArray().put(new JSONObject().put("text", m[1]))));
            }
            JSONObject body = new JSONObject()
                    .put("systemInstruction", new JSONObject().put("parts",
                            new JSONArray().put(new JSONObject().put("text", system))))
                    .put("contents", contents);
            Http.Response r = Http.send("POST", base + "/models/" + model + ":generateContent",
                    headers(), body.toString(), 15000, 5 * 60 * 1000);
            if (r.code == 404) {
                model = ""; autoModel = ""; // model retired: pick again next time
                throw new JarvisClient.JarvisException("That Gemini model is no longer available. Please send your message again.", true);
            }
            if (r.code != 200) throw new JarvisClient.JarvisException(errorMessage(r), r.code == 429 || r.code >= 500);
            return parse(r.body);
        } catch (JSONException e) {
            throw new JarvisClient.JarvisException("Gemini sent a reply this app could not read. Please try again.");
        } catch (UnknownHostException e) {
            throw new JarvisClient.JarvisException("No internet connection. Check your Wi-Fi or mobile data.");
        } catch (SocketTimeoutException e) {
            throw new JarvisClient.JarvisException("Gemini took too long to answer. Please try again.", true);
        } catch (IOException e) {
            throw new JarvisClient.JarvisException("Connection problem: " + e.getMessage());
        }
    }

    /** Lists the models this key can use and returns the newest stable Flash model. */
    String pickModel() throws IOException, JSONException, JarvisClient.JarvisException {
        Http.Response r = Http.send("GET", base + "/models?pageSize=1000", headers(), null, 15000, 30000);
        if (r.code != 200) throw new JarvisClient.JarvisException(errorMessage(r));
        return choose(new JSONObject(r.body).optJSONArray("models"));
    }

    /** All Gemini chat models this key can use, newest Flash first. */
    public java.util.List<String> listModels() throws JarvisClient.JarvisException {
        try {
            Http.Response r = Http.send("GET", base + "/models?pageSize=1000", headers(), null, 15000, 30000);
            if (r.code != 200) throw new JarvisClient.JarvisException(errorMessage(r));
            JSONArray models = new JSONObject(r.body).optJSONArray("models");
            java.util.List<String> out = new java.util.ArrayList<>();
            String best = choose(models);
            out.add(best);
            for (int i = 0; models != null && i < models.length(); i++) {
                JSONObject m = models.getJSONObject(i);
                String name = m.optString("name").replaceFirst("^models/", "");
                JSONArray methods = m.optJSONArray("supportedGenerationMethods");
                if (methods == null || !methods.toString().contains("\"generateContent\"")) continue;
                if (!name.startsWith("gemini-") || name.contains("image") || name.contains("tts") || name.contains("live")
                        || name.contains("embedding") || out.contains(name)) continue;
                out.add(name);
            }
            return out;
        } catch (JSONException e) {
            throw new JarvisClient.JarvisException("Could not read Gemini's model list.");
        } catch (IOException e) {
            throw new JarvisClient.JarvisException("Could not reach Gemini: " + e.getMessage());
        }
    }

    static String choose(JSONArray models) throws JSONException, JarvisClient.JarvisException {
        Pattern p = Pattern.compile("^gemini-(\\d+(?:\\.\\d+)?)-flash$");
        String best = null; double bestV = -1;
        String fallback = null;
        if (models != null) {
            for (int i = 0; i < models.length(); i++) {
                JSONObject m = models.getJSONObject(i);
                String name = m.optString("name").replaceFirst("^models/", "");
                JSONArray methods = m.optJSONArray("supportedGenerationMethods");
                if (methods == null || !methods.toString().contains("\"generateContent\"")) continue;
                Matcher mm = p.matcher(name);
                if (mm.matches()) {
                    double v = Double.parseDouble(mm.group(1));
                    if (v > bestV) { bestV = v; best = name; }
                } else if (fallback == null && name.startsWith("gemini-") && name.contains("flash")
                        && !name.contains("image") && !name.contains("tts") && !name.contains("live")) {
                    fallback = name;
                }
            }
        }
        if (best != null) return best;
        if (fallback != null) return fallback;
        throw new JarvisClient.JarvisException("No Gemini chat model is available for this API key.");
    }

    static String parse(String json) throws JSONException, JarvisClient.JarvisException {
        JSONObject resp = new JSONObject(json);
        JSONArray cands = resp.optJSONArray("candidates");
        if (cands == null || cands.length() == 0) {
            JSONObject fb = resp.optJSONObject("promptFeedback");
            if (fb != null && fb.has("blockReason")) {
                throw new JarvisClient.JarvisException("Gemini declined to answer that. Try rephrasing the request.");
            }
            throw new JarvisClient.JarvisException("Gemini sent an empty reply. Please try again.");
        }
        JSONObject content = cands.getJSONObject(0).optJSONObject("content");
        StringBuilder sb = new StringBuilder();
        if (content != null && content.optJSONArray("parts") != null) {
            JSONArray parts = content.getJSONArray("parts");
            for (int i = 0; i < parts.length(); i++) {
                JSONObject part = parts.getJSONObject(i);
                if (part.optBoolean("thought", false)) continue;
                sb.append(part.optString("text", ""));
            }
        }
        String text = sb.toString().trim();
        if (text.isEmpty()) {
            if ("SAFETY".equals(cands.getJSONObject(0).optString("finishReason"))) {
                throw new JarvisClient.JarvisException("Gemini declined to answer that. Try rephrasing the request.");
            }
            throw new JarvisClient.JarvisException("Gemini sent an empty reply. Please try again.");
        }
        return text;
    }

    static String errorMessage(Http.Response r) {
        String detail = "";
        try { detail = new JSONObject(r.body).getJSONObject("error").optString("message", ""); }
        catch (JSONException ignored) { }
        switch (r.code) {
            case 400:
                if (detail.toLowerCase().contains("api key")) return "Your Gemini API key was not accepted. Check it in Settings (⚙).";
                return "Gemini could not handle that request." + (detail.isEmpty() ? "" : "\n" + detail);
            case 401: case 403: return "Your Gemini API key was not accepted. Check it in Settings (⚙).";
            case 429: return "Gemini's free limit was reached. Wait a minute and try again.";
            case 500: case 503: return "Gemini is busy right now. Please try again in a moment.";
            default: return "Gemini had a problem (error " + r.code + ")." + (detail.isEmpty() ? "" : "\n" + detail);
        }
    }
}
