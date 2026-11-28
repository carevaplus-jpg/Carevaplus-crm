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

## Architecture

Careva AI uses the same front-end stack as claude.ai: **React + TypeScript + Tailwind CSS**. Motion
comes from **Framer Motion** and state lives in **Zustand**. Vite builds it into a static site. (Claude
itself uses Next.js, which needs a server; this app is a pure client that talks to OpenRouter.)

```
src/
├── main.tsx, App.tsx      app shell: layout, boot, shortcuts, the composer's shared-layout glide
├── index.css              design tokens (light/dark), prose and syntax themes, Tailwind
├── lib/                   framework-free logic
│   ├── openrouter.ts      free-model discovery + ranking, streaming, transcription, OAuth (PKCE)
│   ├── engine.ts          Auto / Council / single-model generation, fallback, titles
│   ├── artifacts.ts       artifact detection, versions, sandboxed preview documents (HTML, SVG, React, Mermaid)
│   ├── voice.ts           dictation: browser speech recognition + AI transcription fallback
│   ├── highlight.ts       syntax highlighting split into lines
│   ├── prompts.ts, db.ts (IndexedDB), types.ts, utils.ts
├── stores/                Zustand: settings (persisted), models, chat, ui
├── hooks/                 useSmoothText (steady streaming), useDictation, useMediaQuery
└── components/
    ├── layout/            Sidebar (icon rail + mobile drawer), TopBar, chat menus
    ├── chat/              Thread, messages, Markdown + KaTeX, CodeBlock, Disclosure, Welcome
    ├── composer/          Composer, ModelPicker, VoiceBar
    ├── artifacts/         ArtifactPanel, ArtifactCard, CodeView
    ├── dialogs/           Settings, Welcome, rename/confirm
    └── ui/                Icon, Logo, Menu, Dialog, Toaster, Button, CopyButton
```

**Artifacts.** Big or renderable code blocks become cards that open in a resizable side panel:
- **Live previews** for HTML, SVG, **React components** (Tailwind and lucide-react available) and
  **Mermaid diagrams**.
- A line-numbered code view with syntax highlighting and wrap toggle.
- **Version history** when the AI revises the same artifact.
- Copy, download, open in a new tab and full screen.
- When a preview throws an error, an **"Ask Careva to fix"** bar appears.

Previews run in an iframe sandbox **without** same-origin access, so generated code can never read
your API key or chats.

**Motion.**
- The message box glides from the center to the bottom when a chat starts.
- Streamed text is revealed at a steady pace.
- Panels, menus and dialogs use springs.
- The logo turns only while the AI is working.
- Everything respects the system "reduce motion" setting.

## Run locally

```bash
cd ai-chat
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

## Deploy to the cloud (free)

**Netlify** (already configured in `netlify.toml`): connect the repo with *Base directory* `ai-chat`.
It runs `npm ci && npm run build` and publishes `dist/`. Vercel and Cloudflare Pages work the same
way: build command `npm run build`, output directory `dist`.

It must be served over HTTPS (or localhost) for "Connect with OpenRouter", installing as an app,
and voice input to work.

## Customizing

- App name: `APP_NAME` in `src/lib/openrouter.ts`, plus `index.html` and `public/manifest.webmanifest`.
- Assistant personality and artifact rules: `systemPrompt()` in `src/lib/prompts.ts`.
- Model ranking: `FAMILY_SCORES` in `src/lib/openrouter.ts`. Higher scores are tried first.
- Colors, fonts and syntax colors: tokens at the top of `src/index.css`.
