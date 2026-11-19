package com.carevaplus.jarvis;

import java.util.List;

/** Something that can answer Jarvis conversations: a cloud AI, the phone's own model, or the user's computer. */
public interface Brain {
    /** @param history {role, content} pairs, oldest first; roles are "user" and "assistant". */
    String reply(List<String[]> history) throws JarvisClient.JarvisException;

    /** Short label for the status bar, e.g. "Claude" or "On phone · Qwen". */
    String label();
}
