package com.carevaplus.jarvis;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Understands spoken or typed brain commands, e.g.
 *   "Jarvis, use the heavy model", "switch to Groq", "go offline", "use Kimi and plan tomorrow's shifts",
 *   "which brain are you using?"
 * Pure Java so it can be tested on a desktop JVM.
 */
final class BrainCommands {
    private BrainCommands() {}

    /** Command kinds (plain constants: the d8 in build-tools 34 crashes on some javac 21 enum classes). */
    static final class Kind {
        static final String SWITCH = "SWITCH";
        static final String STATUS = "STATUS";
        private Kind() {}
    }

    static final class Command {
        final String kind;
        final String providerId;   // for SWITCH
        final String model;        // null = keep the provider's current model; "" = Auto
        final String label;        // friendly name for the confirmation
        final String remainder;    // what to send after switching ("" if nothing)

        Command(String kind, String providerId, String model, String label, String remainder) {
            this.kind = kind; this.providerId = providerId; this.model = model; this.label = label; this.remainder = remainder;
        }
    }

    /** {regex for what the user says, provider, model (null = keep), friendly label}. First match wins. */
    private static final String[][] TARGETS = {
            {"kimi(?: k?3(?:\\.1)?)?(?: pro)?", "nvidia", "moonshotai/kimi-k3.1-pro", "NVIDIA · Kimi K3.1 Pro"},
            {"mistral(?: large)?(?: 4)?", "nvidia", "mistralai/mistral-large-4-1t-a52b", "NVIDIA · Mistral Large 4"},
            {"nemotron(?: 3)?(?: ultra)?", "nvidia", "nvidia/nemotron-3-ultra-550b-a55b", "NVIDIA · Nemotron 3 Ultra 550B"},
            {"glm(?: 5(?:\\.3)?)?", "nvidia", "z-ai/glm-5.3-flash", "NVIDIA · GLM 5.3"},
            {"gpt[ -]?oss(?: 120b)?", "groq", "openai/gpt-oss-120b", "Groq · GPT-OSS 120B"},
            {"llama(?: 3(?:\\.3)?)?(?: 70b)?", "groq", "llama-3.3-70b-versatile", "Groq · Llama 3.3 70B"},
            {"gemma(?: 4)?", "openrouter", "google/gemma-4-31b-it:free", "OpenRouter · Gemma 4 31B"},
            {"(?:claude )?opus", "claude", "claude-opus-5-5", "Claude Opus"},
            {"(?:claude )?sonnet", "claude", "claude-sonnet-5-5", "Claude Sonnet"},
            {"(?:claude )?haiku", "claude", "claude-haiku-5-5", "Claude Haiku"},
            {"claude|anthropic|(?:the )?best(?: model| brain)?", "claude", null, "Claude"},
            {"nvidia|(?:the )?(?:heavy|heaviest|big|biggest|large|largest|powerful|strongest|smartest free)(?: model| brain| one| ai)?", "nvidia", null, "NVIDIA (heavy models)"},
            {"groq|(?:the )?(?:fast|fastest|quick|quickest|speedy)(?: model| brain| one| ai| mode)?", "groq", null, "Groq (fastest)"},
            {"open ?router", "openrouter", null, "OpenRouter"},
            {"gemini|google", "gemini", null, "Google Gemini"},
            {"(?:the )?(?:phone|on[- ]?device|local|offline|private)(?: model| brain| ai| mode)?|qwen", "local", null, "On this phone (offline)"},
            {"(?:my )?(?:computer|laptop|pc|desktop)|open ?jarvis", "computer", null, "My computer"},
    };

    private static final String VERBS =
            "(?:use|switch(?: over)? to|change(?: brain)? to|go to|move to|try|select|pick|set (?:the )?brain to|turn on|activate)";
    private static final Pattern PREFIX = Pattern.compile("^(?:(?:hey|hi|ok|okay)\\s+)?jarvis[,:!.]?\\s*", Pattern.CASE_INSENSITIVE);
    private static final Pattern STATUS = Pattern.compile(
            "^(?:which|what)\\s+(?:brain|model|ai)\\s+(?:are you using|are you on|is (?:on|active|this)|am i (?:using|on))\\b.*"
                    + "|^(?:who|which brain) is answering\\b.*");
    private static final Pattern THEN = Pattern.compile(
            "^(?:\\s*(?:,|;|:|\\.|-)\\s*|\\s+)(?:(?:for (?:now|this))\\s*[,.]?\\s*)?(?:and(?: then)?|then|to|please|now)?\\s*(.*)$",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    /** Returns a command, or null if the text is a normal message for the AI. */
    static Command parse(String raw) {
        if (raw == null) return null;
        String text = PREFIX.matcher(raw.trim()).replaceFirst("");
        String lower = text.toLowerCase(Locale.ROOT).replaceAll("[?!.]+$", "").trim();

        if (STATUS.matcher(lower).matches()) return new Command(Kind.STATUS, null, null, null, "");

        // "go offline" / "offline mode" / "go online"
        if (lower.matches("^(?:go|switch|work) offline\\b.*|^offline mode\\b.*")) {
            String rest = lower.replaceFirst("^(?:go|switch|work) offline|^offline mode", "");
            return new Command(Kind.SWITCH, "local", null, "On this phone (offline)", remainder(text, text.length() - rest.length()));
        }

        Matcher v = Pattern.compile("^(?:please\\s+)?" + VERBS + "\\s+(?:the\\s+|my\\s+)?", Pattern.CASE_INSENSITIVE).matcher(lower);
        if (!v.find()) return null;
        int start = v.end();
        String after = lower.substring(start);
        for (String[] t : TARGETS) {
            // The brain name must end the sentence or be followed by "and/then/to/please/now" or punctuation,
            // so "use the fast lane entrance" or "use Google Maps" stay normal messages.
            Matcher m = Pattern.compile("^(?:" + t[0] + ")(?:\\s+(?:model|brain|ai|mode))?"
                    + "(?=$|\\s*[,;:.!-]|\\s+(?:and|then|to|please|now|for this|for now)\\b)").matcher(after);
            if (m.find()) {
                return new Command(Kind.SWITCH, t[1], t[2], t[3], remainder(text, start + m.end()));
            }
        }
        if (after.matches("^auto(?:matic)?(?: model)?\\b.*")) {
            Matcher m = Pattern.compile("^auto(?:matic)?(?: model)?").matcher(after);
            m.find();
            return new Command(Kind.SWITCH, null, "", "Auto model", remainder(text, start + m.end()));
        }
        return null;
    }

    /** The original-case text after the command, minus joining words like "and" / "then". */
    private static String remainder(String original, int from) {
        if (from >= original.length()) return "";
        Matcher m = THEN.matcher(original.substring(from));
        String r = m.matches() ? m.group(1).trim() : original.substring(from).trim();
        return r;
    }
}
