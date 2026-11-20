package com.carevaplus.jarvis;

import java.util.Arrays;
import java.util.List;

/** Every brain Jarvis can use, with what the Settings screen shows about it. */
final class Providers {
    private Providers() {}

    static final class Provider {
        final String id;            // also the prefs key prefix
        final String name;
        final String tagline;
        final String[] badges;      // FREE, FAST, HEAVY, PRIVATE, BEST, PAID, OFFLINE
        final String keyUrl;        // where to get a key (null = no key)
        final String keyHint;
        final String baseUrl;       // OpenAI-compatible base URL (null for other kinds)
        final List<String> preferred;   // best first; used for "Auto"
        final String privacy;

        Provider(String id, String name, String tagline, String[] badges, String keyUrl, String keyHint,
                 String baseUrl, List<String> preferred, String privacy) {
            this.id = id; this.name = name; this.tagline = tagline; this.badges = badges;
            this.keyUrl = keyUrl; this.keyHint = keyHint; this.baseUrl = baseUrl;
            this.preferred = preferred; this.privacy = privacy;
        }

        boolean isOpenAICompatible() { return baseUrl != null; }
        boolean needsKey() { return keyUrl != null; }
        boolean isFreeCloud() { return Arrays.asList(badges).contains("FREE") && !"local".equals(id); }
    }

    static final Provider NVIDIA = new Provider("nvidia", "NVIDIA",
            "Free access to some of the biggest open models (Kimi K3.1 Pro, Mistral Large 4, Nemotron 3 Ultra 550B).",
            new String[]{"FREE", "HEAVY"},
            "https://build.nvidia.com", "nvapi-…",
            "https://integrate.api.nvidia.com/v1",
            Arrays.asList("moonshotai/kimi-k3.1-pro", "mistralai/mistral-large-4-1t-a52b",
                    "nvidia/nemotron-3-ultra-550b-a55b", "z-ai/glm-5.3-flash", "minimaxai/minimax-m3.1-flash",
                    "stepfun-ai/step-5-preview", "google/gemma-4-31b-it"),
            "Messages are sent to NVIDIA.");

    static final Provider GROQ = new Provider("groq", "Groq",
            "Free and extremely fast — answers in about a second (GPT-OSS 120B, Llama 3.3 70B).",
            new String[]{"FREE", "FAST"},
            "https://console.groq.com/keys", "gsk_…",
            "https://api.groq.com/openai/v1",
            Arrays.asList("openai/gpt-oss-120b", "llama-3.3-70b-versatile", "qwen/qwen3.8-27b", "openai/gpt-oss-20b",
                    "llama-3.1-8b-instant"),
            "Messages are sent to Groq.");

    static final Provider OPENROUTER = new Provider("openrouter", "OpenRouter",
            "Free models from many labs (Nemotron 3 Ultra 550B, Gemma 4 31B). About 50 free messages a day.",
            new String[]{"FREE", "HEAVY"},
            "https://openrouter.ai/keys", "sk-or-…",
            "https://openrouter.ai/api/v1",
            Arrays.asList("nvidia/nemotron-3-ultra-550b-a55b:free", "google/gemma-4-31b-it:free",
                    "nvidia/nemotron-3.5-super-vl:free", "baidu/ernie-5.5-flash-preview:free",
                    "inclusionai/ling-3.2-flash:free", "openrouter/free"),
            "Messages are sent to OpenRouter and the model's host. Free models may log prompts.");

    static final Provider GEMINI = new Provider("gemini", "Google Gemini",
            "Free tier with fast Flash models.",
            new String[]{"FREE", "FAST"},
            "https://aistudio.google.com/apikey", "AIza…", null, Arrays.asList(),
            "Messages are sent to Google; on the free tier Google may use them to improve its products.");

    static final Provider CLAUDE = new Provider("claude", "Claude",
            "Anthropic's Claude — the strongest option here. Small cost per message.",
            new String[]{"BEST", "PAID"},
            "https://console.anthropic.com/settings/keys", "sk-ant-…", null,
            Arrays.asList("claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"),
            "Messages are sent to Anthropic.");

    static final Provider LOCAL = new Provider("local", "On this phone",
            "Runs Qwen 3.5 (2B) inside the phone. Nothing leaves your phone; works offline. Slower and simpler.",
            new String[]{"FREE", "PRIVATE", "OFFLINE"},
            null, null, null, Arrays.asList(), "Nothing leaves your phone.");

    static final Provider COMPUTER = new Provider("computer", "My computer",
            "OpenJarvis running on your computer, over the same Wi-Fi.",
            new String[]{"FREE", "PRIVATE"},
            null, null, null, Arrays.asList(), "Messages stay on your Wi-Fi.");

    static final List<Provider> ALL = Arrays.asList(GROQ, NVIDIA, OPENROUTER, GEMINI, CLAUDE, LOCAL, COMPUTER);

    /** Order used when the chosen brain is busy and a backup is needed: fastest free first. */
    static final List<Provider> BACKUP_ORDER = Arrays.asList(GROQ, NVIDIA, GEMINI, OPENROUTER);

    static Provider byId(String id) {
        for (Provider p : ALL) if (p.id.equals(id)) return p;
        return GROQ;
    }
}
