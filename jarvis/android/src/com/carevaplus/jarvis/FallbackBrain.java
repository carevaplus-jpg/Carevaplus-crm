package com.carevaplus.jarvis;

import java.util.List;

/** Tries the chosen brain first; if it is busy or at its free limit, tries the next set-up brain. */
public class FallbackBrain implements Brain {
    private final List<Brain> chain;
    private Brain used;
    private Listener listener;
    private volatile boolean stopped;
    private String note = "";

    public FallbackBrain(List<Brain> chain) { this.chain = chain; }

    @Override public String label() { return (used != null ? used : chain.get(0)).label(); }

    /** e.g. "Groq was busy, so NVIDIA answered." — empty when the first brain answered. */
    public String note() { return note; }

    @Override public void setListener(Listener l) { listener = l; }

    @Override public void stop() {
        stopped = true;
        for (Brain b : chain) b.stop();
    }

    @Override
    public String reply(List<String[]> history) throws JarvisClient.JarvisException {
        JarvisClient.JarvisException first = null;
        note = "";
        for (int i = 0; i < chain.size(); i++) {
            Brain b = chain.get(i);
            b.setListener(listener);
            try {
                String r = b.reply(history);
                used = b;
                if (i > 0) note = shortName(chain.get(0)) + " was unavailable, so " + shortName(b) + " answered.";
                return r;
            } catch (JarvisClient.JarvisException e) {
                if (first == null) first = e;
                if (stopped || !e.retryable || i == chain.size() - 1) {
                    throw i == 0 ? e : new JarvisClient.JarvisException(first.getMessage() + "\n(Backup brains were also unavailable.)");
                }
                if (listener != null) listener.onPartial("");
            }
        }
        throw first;
    }

    private static String shortName(Brain b) {
        String l = b.label();
        int dot = l.indexOf(" · ");
        return dot > 0 ? l.substring(0, dot) : l;
    }
}
