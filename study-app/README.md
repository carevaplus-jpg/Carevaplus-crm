# Vidya: Study like it's an art

An immersive study companion for **CBSE students in Classes 8–12**, built around the **NCERT** syllabus with Science **PCM / PCB** streams for Classes 11–12. Built with React Native and Expo (SDK 58) for iOS and Android, with a web build for previews.

> विद्या (*vidya*): knowledge.

## What's inside

| Area | Highlights |
|---|---|
| **Onboarding** | 6-step animated flow: name → class → stream (PCM / PCB / PCMB) → daily goal and board-exam countdown → personalised subject summary |
| **Today** | Daily-goal ring, streak, exam countdown, cards due, level/XP bar, "continue learning", today's plan, daily quote |
| **Learn** | Full NCERT chapter map for each subject, per-chapter status (Not started → Learning → Revising → Mastered), mastery rings, custom subjects (English, SST, Hindi, CS…) |
| **Chapter hub** | Status stepper, memory-strength meter, and one-tap Focus / Flashcards / Quiz / Ask-tutor, plus notes and cards for that chapter |
| **Focus mode** | Full-screen breathing orb, Pomodoro / Deep work / Flow presets, long break every 4th round, generated soundscapes (rain, brown noise, ocean, night), keep-awake, background audio, tab bar hidden while focusing |
| **Flashcards** | Spaced repetition (SM-2 family, Again/Hard/Good/Easy with interval previews), 3D flip, "again" cards come back in the same session, ~100 seeded NCERT formula cards |
| **Quizzes** | Curated board-style MCQ bank plus questions generated from the student's own flashcards; instant feedback, explanations, mistake review |
| **AI Tutor** | Chat with markdown rendering, chapter context, starter prompts. **Demo mode** works offline from the built-in content; **Cloud mode** calls Claude through a secure Supabase Edge Function |
| **Planner** | Week strip, tasks (Learn / Revise / Practice / Homework / Test), **Smart plan** built from due cards, weakest subject and chapters being revised; extra exam countdowns |
| **Progress** | XP and 10 level titles, 12 achievements, streaks, 15-week heatmap, 7-day card forecast, time by subject, quiz accuracy |
| **Accounts & sync** | Optional Supabase email accounts with offline-first, last-write-wins sync across devices; JSON backup export |

## Design system: "Midnight Aurora"

- A dark, low-glare palette with slowly drifting aurora light fields, frosted-glass cards and a gradient accent per subject.
- **Sora** for headings and **Inter** for body text.
- Spring physics on every press, with haptics (tick, soft, firm, success).
- Reanimated layout and entrance animations, and celebration toasts for XP, level-ups and achievements.
- Tokens live in `src/theme/tokens.ts`, components in `src/ui/`.

## Run it

```bash
cd study-app
npm install
npx expo start          # press i / a for simulator, or scan with a dev build
npm run check           # typecheck + lint
```

The app uses native modules beyond Expo Go's set (audio background mode, etc.), so use a **development build**: `npx expo run:ios` / `npx expo run:android`, or `npx eas-cli@latest build --profile development`.

## Enable accounts, sync and the cloud tutor (optional)

1. Create a Supabase project (Mumbai `ap-south-1` is closest to students in India).
2. Apply the schema: `supabase db push`, or paste `supabase/migrations/20261122000000_vidya_init.sql` into the SQL editor. It creates `profiles`, `sync_records` and `tutor_usage` with row-level security, plus the `push_records()` and `bump_tutor_usage()` functions.
3. Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy the AI tutor:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase functions deploy tutor
   ```
   Optional secrets: `TUTOR_MODEL` (default `claude-opus-5-5`), `TUTOR_EFFORT` (`low` / `medium` / `high`, default `medium`), `TUTOR_DAILY_LIMIT` (default 60 messages per student per day).
5. In the app: **Settings → AI Tutor → Cloud AI**.

The AI key never ships inside the app. The function verifies the student's Supabase session, rate-limits per student, and caches its system prompt. It also enables server-side refusal fallbacks (`fallbacks: "default"`), so a safety refusal is retried on a fallback model. Remove that parameter in `supabase/functions/tutor/index.ts` if you don't want it.

## Syllabus notes

- **Classes 10–12:** rationalised NCERT textbooks.
- **Class 8:** new NCF-2023 books, *Curiosity* (Science) and *Ganita Prakash* Parts 1–2 (Maths).
- **Class 9:** new 2026-27 books, *Exploration* (Science) and *Ganita Manjari* (Maths). Part 2 maths chapters are marked **"Verify syllabus"** because only one source listed them. Confirm them on ncert.nic.in.
- Board-exam dates are tentative defaults. Students can edit them anytime.

Edit `src/data/syllabus.ts` to update chapters. Flashcards and quiz questions are in `src/data/content.ts`.

## Project map

```
src/app/            screens (Expo Router): (tabs)/, onboarding, chapter, review, quiz, planner, settings…
src/ui/             design-system components (Glass, Button, Ring, Aurora, Celebrations…)
src/theme/          design tokens
src/store/          zustand store (persisted, offline-first) + selectors
src/lib/            srs, progress/XP, planner, sync, tutor, supabase, dates
src/data/           NCERT syllabus + seed content
supabase/           SQL migration + tutor Edge Function
scripts/            procedural app-icon and soundscape generators
```
