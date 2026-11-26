# Careva AI

A Claude-style AI assistant that runs on the **best free open-source models on OpenRouter**.
It's an installable web app (PWA): use it in any browser, or "Add to Home Screen" on your phone
so it opens like a native app.

## What it does

**Models**
- **Auto mode** sends each message to the strongest free model available right now. If that model
  is rate-limited or down, it switches to the next one automatically (up to 6, then OpenRouter's
  free router).
- **Council mode** is for hard questions. The top 2–6 free models answer in parallel, then the best
  model merges their answers into one. You can expand the council to see each draft.
- **Pick a model** lets you choose any single free model. The list is fetched live and ranked, so
  new free models show up without code changes.

**Interface**
- A new chat opens with a greeting and the message box centered on the screen, with suggestion
  buttons underneath. Once you send, the box moves to the bottom.
- The sidebar collapses to an icon strip (Ctrl+.). It has **Starred** and **Recents**, and each chat
  has a menu to star, rename, export or delete it. Search with Ctrl+K.
- The **+** menu uploads files or photos (or takes a photo on a phone) and picks a writing style:
  Normal, Concise, Explanatory, Formal or Friendly.
- The **Extended thinking** toggle asks reasoning models to think harder. Their reasoning shows as
  a collapsible "Thought for N seconds" section.
- **Artifacts:** long code and HTML/SVG answers become cards that open in a side panel. The panel
  has Preview and Code tabs, copy and download. Previews run in a locked-down sandbox.
- Answers stream in, with Markdown, tables, highlighted code and **LaTeX math**. You can edit and
  resend a message, retry, stop, and jump back to the newest message.
- Pasting more than 2,500 characters turns the text into an attachment, like Claude.
- Light and dark themes, an installable PWA, and a layout that works on phones.

**Voice (mic button, Ctrl+M)**
- Tap the mic and talk. Your words are typed into the message box as you speak (browser speech
  recognition in Chrome, Edge and Safari), with a live waveform and timer.
- Tap ✓ to finish, ✕ or Esc to cancel. Pressing Enter while dictating finishes and sends.
- In browsers without speech recognition (such as Firefox), or if the browser's speech service
  fails, it records instead and transcribes with a free audio-capable model on OpenRouter.
- Settings → Voice input sets the language (English, Hindi, Tamil, Telugu, Malayalam, Kannada,
  Marathi, Bengali, Gujarati, Punjabi, Urdu, Arabic and more), the speech engine, and auto-send.

**Privacy:** chats are stored in IndexedDB and your key in localStorage, both in your browser only.
The key is only ever sent to `openrouter.ai`.

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
├── js/app.js             UI, chat flow, Auto/Council modes, menus, attachments, settings
├── js/voice.js           mic dictation: live browser speech + AI transcription fallback
├── js/artifacts.js       side panel with code / live preview
├── js/markdown.js        Markdown + KaTeX math + code blocks / artifact cards
├── js/icons.js           the app's single icon set
├── js/openrouter.js      OpenRouter API: free models + ranking, streaming, OAuth connect
├── js/prompts.js         system prompt, council merge prompt, suggestions
├── js/store.js           IndexedDB chats + settings
├── sw.js                 offline app shell (PWA)
├── manifest.webmanifest  install metadata
└── icons/                app icons
```
