package com.carevaplus.jarvis;

import java.util.List;

/** Something that can answer Jarvis conversations: a cloud AI, the phone's own model, or the user's computer. */
public interface Brain {
    /** Receives the reply text so far while it is being written (streaming brains only). */
    interface Listener { void onPartial(String textSoFar); }

    /** @param history {role, content} pairs, oldest first; roles are "user" and "assistant". */
    String reply(List<String[]> history) throws JarvisClient.JarvisException;

    /** Short label for the status chip, e.g. "Groq · gpt-oss-120b". */
    String label();

    default void setListener(Listener l) { }

    /** Asks a reply in progress to stop as soon as possible. */
    default void stop() { }
}
