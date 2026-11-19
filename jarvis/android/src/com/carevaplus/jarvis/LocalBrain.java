package com.carevaplus.jarvis;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Runs the Qwen model on the phone itself via llama.cpp. Private and offline. */
public class LocalBrain implements Brain {

    /** The model the app downloads (Qwen3.5 2B, 4-bit). */
    public static final String MODEL_FILE = "Qwen3.5-2B-Q4_K_M.gguf";
    public static final String MODEL_URL =
            "https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/main/" + MODEL_FILE;
    public static final long MODEL_BYTES = 1_280_835_840L;

    private static final int N_CTX = 4096;
    private static final int MAX_REPLY_TOKENS = 700;

    private static long handle;          // shared: loading the model takes a few seconds
    private static String loadedPath;

    private final File modelFile;
    private final String system;
    private Brain.Listener listener;

    public LocalBrain(File modelFile, String profile) {
        this.modelFile = modelFile;
        this.system = Persona.systemPrompt(profile);
    }

    @Override public void setListener(Brain.Listener l) { this.listener = l; }

    @Override public void stop() { stopAll(); }

    @Override public String label() { return "On phone · Qwen 3.5"; }

    public static boolean isModelReady(File f) { return f.isFile() && f.length() == MODEL_BYTES; }

    private static synchronized long ensureLoaded(File f) throws JarvisClient.JarvisException {
        if (LlamaNative.loadError != null) {
            throw new JarvisClient.JarvisException("This phone cannot run the on-phone AI (needs a 64-bit ARM phone). Use Claude or Gemini instead.");
        }
        if (handle != 0 && f.getAbsolutePath().equals(loadedPath)) return handle;
        if (handle != 0) { LlamaNative.free(handle); handle = 0; }
        int threads = Math.max(2, Math.min(4, Runtime.getRuntime().availableProcessors()));
        long h = LlamaNative.load(f.getAbsolutePath(), N_CTX, threads);
        if (h == 0) {
            throw new JarvisClient.JarvisException("Could not load the AI model. It may be damaged or the phone is low on memory. Delete it in Settings and download again.");
        }
        handle = h;
        loadedPath = f.getAbsolutePath();
        return h;
    }

    public static synchronized void unload() {
        if (handle != 0) { LlamaNative.free(handle); handle = 0; loadedPath = null; }
    }

    public static void stopAll() {
        long h = handle;
        if (h != 0) LlamaNative.stop(h);
    }

    @Override
    public String reply(List<String[]> history) throws JarvisClient.JarvisException {
        if (!isModelReady(modelFile)) {
            throw new JarvisClient.JarvisException("The on-phone AI model is not downloaded yet. Open Settings (⚙) and tap Download.");
        }
        long h = ensureLoaded(modelFile);
        String prompt = buildPrompt(h, Http.trimToUserStart(history));
        final ByteArrayOutputStream acc = new ByteArrayOutputStream();
        byte[] out = LlamaNative.generate(h, prompt.getBytes(StandardCharsets.UTF_8), MAX_REPLY_TOKENS, 0.6f,
                piece -> {
                    acc.write(piece, 0, piece.length);
                    if (listener != null) listener.onPartial(clean(new String(acc.toByteArray(), StandardCharsets.UTF_8)));
                });
        if (out == null) throw new JarvisClient.JarvisException("The on-phone AI could not answer. Try a shorter message or start a New conversation.");
        String text = clean(new String(out, StandardCharsets.UTF_8));
        if (text.isEmpty()) throw new JarvisClient.JarvisException("The on-phone AI gave an empty answer. Please try again.");
        return text;
    }

    /** Qwen ChatML with thinking switched off; drops the oldest turns until it fits the context. */
    String buildPrompt(long h, List<String[]> history) {
        List<String[]> turns = new ArrayList<>(history);
        while (true) {
            String p = format(system, turns);
            int n = LlamaNative.countTokens(h, p.getBytes(StandardCharsets.UTF_8));
            if (n + MAX_REPLY_TOKENS < N_CTX || turns.size() <= 1) return p;
            turns.remove(0);
            while (!turns.isEmpty() && !"user".equals(turns.get(0)[0])) turns.remove(0);
        }
    }

    static String format(String system, List<String[]> turns) {
        StringBuilder sb = new StringBuilder();
        sb.append("<|im_start|>system\n").append(system).append("<|im_end|>\n");
        for (String[] t : turns) {
            sb.append("<|im_start|>").append("assistant".equals(t[0]) ? "assistant" : "user").append('\n')
              .append(t[1]).append("<|im_end|>\n");
        }
        sb.append("<|im_start|>assistant\n<think>\n\n</think>\n\n");
        return sb.toString();
    }

    /** Removes any leftover reasoning tags and trailing replacement characters from partial UTF-8. */
    static String clean(String s) {
        String t = s.replaceAll("(?s)<think>.*?</think>", "");
        int open = t.indexOf("<think>");
        if (open >= 0) t = t.substring(0, open);
        t = t.replace("<|im_end|>", "");
        while (t.endsWith("�")) t = t.substring(0, t.length() - 1);
        return t.trim();
    }
}
