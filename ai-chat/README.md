# Careva AI

A Claude-style AI assistant that runs on the **best free open-source models on OpenRouter**.
It's an installable web app (PWA): use it in any browser, or "Add to Home Screen" on your phone
so it opens like a native app.

## What it does

- **Auto mode**: sends each message to the strongest free model available right now. If that
  model is rate-limited or down, it automatically switches to the next one (up to 6, then
  OpenRouter's own free router).
- **Council mode** (for hard questions): asks the top 2–6 free models in parallel, then has
  the best model merge their answers into one. You can expand the council to see each draft.
- **Pick a model**: choose any single free model from the list.
- Live free-model list: models are fetched from OpenRouter and ranked automatically, so new
  free models (DeepSeek, Qwen, Kimi, GLM, Nemotron, Gemma, Llama, gpt-oss, Mistral, …) show up
  without code changes.
- Streaming answers, "thought process" view for reasoning models, Markdown, tables, highlighted
  code blocks with copy, edit and resend, regenerate, stop.
- Image input for vision models, text and code file attachments, paste and drag-and-drop, voice
  dictation.
- Chat history with search, automatic titles, Markdown export, custom instructions, light and dark
  themes.
- Everything stays in your browser: chats in IndexedDB, your key in localStorage. The key is only
  ever sent to `openrouter.ai`.

## Connecting OpenRouter

1. Open the app and tap **Connect with OpenRouter**. You'll sign in (or sign up, free, no card
   needed), approve, and come straight back connected. This uses OpenRouter's official OAuth
   (PKCE) flow.
2. Or paste a key from <https://openrouter.ai/settings/keys> under **Settings → Or paste an
   API key**.

**Free limits:** OpenRouter free models allow about 50 requests per day per account, or about
1,000 per day once you've bought $10 of credits at any point. Council mode uses
(council size + 1) requests per message. Check current limits on OpenRouter.

## Run locally

It's plain HTML/CSS/JS, with no build step:

```bash
cd ai-chat
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy to the cloud (free)

Any static host works. The folder is the whole site.

- **Netlify:** drag the `ai-chat` folder onto <https://app.netlify.com/drop>, or connect the repo
  and set *Base directory* to `ai-chat` (the included `netlify.toml` needs no build command).
- **Vercel / Cloudflare Pages / GitHub Pages:** set the root or output directory to `ai-chat`, with
  no build command.

It must be served over HTTPS (or localhost) for "Connect with OpenRouter", installing as an
app, and voice input to work.

## Customizing

- App name: `APP_NAME` in `js/openrouter.js`, plus the text in `index.html` and `manifest.webmanifest`.
- Assistant personality: `systemPrompt()` in `js/prompts.js`.
- Model ranking: `FAMILY_SCORES` in `js/openrouter.js`. Higher scores are tried first.
- Colors and fonts: CSS variables at the top of `styles.css`.

## Files

```
ai-chat/
├── index.html            app shell
├── styles.css            styling (light/dark)
├── js/app.js             UI, chat flow, Auto/Council modes, attachments, settings
├── js/openrouter.js      OpenRouter API: free models + ranking, streaming, OAuth connect
├── js/prompts.js         system prompt, council merge prompt, suggestions
├── js/store.js           IndexedDB chats + settings
├── sw.js                 offline app shell (PWA)
├── manifest.webmanifest  install metadata
└── icons/                app icons
```
