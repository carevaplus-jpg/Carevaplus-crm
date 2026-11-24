# Careva+ CRM

An executive-grade CRM for Careva+ — contacts, companies, a drag-and-drop sales pipeline, tasks & calendar, products/quotes/invoicing, and reporting. Built with React 19, TypeScript, Tailwind CSS and Supabase; installable as a full offline-capable **PWA**, and packaged as a native Android app with Capacitor. The interface uses an Apple-style "liquid glass" look — frosted, translucent panels with soft motion throughout.

## What's inside

| Module | Highlights |
|---|---|
| **Dashboard** | KPI cards, revenue trend, pipeline-by-stage funnel, team leaderboard, org-wide activity feed |
| **Contacts** | Searchable/sortable directory, status (Lead → Prospect → Customer → Churned), full record page with activity timeline, tasks and deals |
| **Companies** | Directory with open-pipeline value per account, contacts roster, deals, activity |
| **Deals** | Drag-and-drop Kanban pipeline across configurable stages, per-rep filters, deal detail with stage stepper and Won/Lost actions |
| **Tasks & Calendar** | Calls/emails/meetings/follow-ups/to-dos with priorities, My Tasks/Overdue/Today filters, a month calendar view |
| **Products, Quotes & Invoices** | Price catalog, a quote builder with line items/discounts/tax, quote → invoice conversion, payment status tracking |
| **Email, WhatsApp & SMS** | Every message is logged on the contact or company timeline; sending opens a pre-filled draft in the user's own mail app, WhatsApp (via `wa.me`) or texting app — no account connection, API key or business approval required |
| **Reports** | Won/lost revenue trend, contacts by status, rep performance table |
| **Notifications** | Opt-in local reminders (Settings → Notifications) that ping this device when one of your tasks comes due |
| **Settings & Team** | Pipeline stage editor, team roster with roles (Admin / Executive / Sales Rep), role-gated controls, company name |
| **Backup & Restore** | One-tap backup of the whole workspace to a JSON file (Android share sheet → Drive, WhatsApp, email), restore on any device, and Erase all data |
| **Command palette** | <kbd>⌘K</kbd> / <kbd>Ctrl K</kbd> instant search across contacts, companies and deals |
| **Install anywhere** | A fully offline-capable PWA — "Install app" from the browser, or install the Android APK below |

## Design system

A navy-and-gold "executive" identity rendered in an Apple-inspired **liquid glass** style: frosted, translucent panels (`.glass-panel`, `.glass-navy`, `.glass-bar` in `src/index.css`) over a soft ambient color wash, specular highlight edges, and light spring-eased motion on drawers, modals, menus, KPI cards and page transitions. Dense data tables stay crisp and opaque for legibility. Built with Tailwind v4 tokens in `src/index.css` and a small reusable UI kit in `src/ui/`. Respects `prefers-reduced-motion`.

## Install as a PWA

The app is a fully offline-capable Progressive Web App (via `vite-plugin-pwa`): the production build precaches the app shell, so after the first load it keeps working with no connection (on top of its local-first data store). Open the deployed site in Chrome/Edge/Safari and use "Install app" / "Add to Home Screen" — or accept the in-app install banner that appears automatically once the browser considers the app installable. The service worker auto-updates and prompts to refresh when a new version is deployed. It is skipped entirely inside the native Android shell below, which ships the bundle directly.

## Run it

```bash
cd crm-app
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run lint        # oxlint
```

There is **no demo data**. On first launch a short welcome screen asks for your name and company name, then creates an empty workspace with you as Admin and a ready-made 6-stage sales pipeline (or restores a backup file instead). A **Get started** checklist on the dashboard walks through adding the first contact, company, deal and products. Everything is stored on the device (local-first, fully offline); Settings → **Back up now** exports the whole workspace so it can be restored on another phone.

## Enable multi-user accounts & cloud sync (optional)

1. Create a Supabase project.
2. Apply the schema: `supabase db push`, or paste `supabase/migrations/20261123000000_careva_crm_init.sql` into the SQL editor. It creates `organizations`, `profiles` and every business table (companies, contacts, pipelines, stages, deals, tasks, activities, products, quotes, invoices, message_log) — all row-level-security-scoped to one organization per company account, with roles (`admin` / `executive` / `sales_rep`) enforced in policy.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. The first person to sign up calls `bootstrap_organization(org_name, your_name)` — this creates their organization, makes them its Admin, and seeds a default 6-stage pipeline. Admins invite teammates by adding a row to `invites` (`org_id`, `email`, `role`); the moment that email signs up, a trigger attaches them to the right organization and role automatically — no email-sending infrastructure required.

The current build code (`src/store`) runs fully offline-first against local storage; wiring the UI to Supabase reads/writes is the next step once a project is provisioned — the schema, RLS and bootstrap/invite flow above are ready and tested (validated with PGlite: multi-tenant isolation, the bootstrap flow and the invite trigger all verified).

## Install the Android app (APK)

Download `careva-crm-1.0.0.apk` and open it on an Android phone (Android 7.0+). Allow "Install unknown apps" for your browser or file manager when asked. If a pre-release test build is installed, uninstall it first.

This is a real native app, not a bookmarked website: edge-to-edge status bar, the hardware/gesture back button navigates the app (and exits on the root screen), task-due reminders fire as real OS notifications scheduled with `@capacitor/local-notifications` (they arrive even if the app is closed), key actions get a light haptic tap, the keyboard resizes the layout instead of covering inputs, and there's no pinch-to-zoom, pull-to-refresh or browser-style text-selection on buttons/nav. All of this (`src/lib/native.ts`, `src/lib/notifications.ts`) is gated behind a Capacitor native-platform check, so the same codebase still behaves like a normal installable PWA in a browser.

To build it yourself (uses [Capacitor](https://capacitorjs.com), which wraps the web build in a native WebView shell):

```bash
npm run build
npx cap sync android     # copies dist/ into the native project
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

The native `android/` project (and its generated icons/splash) is not committed — it's regenerated on demand:

```bash
npx cap add android
python3 scripts/generate-icon.py          # writes assets-src/*.png and public/icons/*.png (PWA + native)
cp assets-src/icon-1024.png resources/icon.png
cp assets-src/android-foreground.png resources/icon-foreground.png
cp assets-src/android-background.png resources/icon-background.png
cp assets-src/splash.png resources/splash.png resources/splash-dark.png
npx @capacitor/assets generate --android
```

## Google Play release

The Play Store upload is an Android App Bundle signed with the **upload key** (`android-sign/careva-crm-upload.jks`, alias `upload` — never committed; keep it and its password safe, Play App Signing re-signs the app for distribution):

```bash
npm run build && npx cap sync android
# bump versionCode (+1 every upload) and versionName in android/app/build.gradle
cd android && ./gradlew bundleRelease assembleRelease
jarsigner -keystore ../android-sign/careva-crm-upload.jks -sigalg SHA256withRSA -digestalg SHA-256 \
  app/build/outputs/bundle/release/app-release.aab upload
```

Store listing assets live in `store-listing/` (512×512 icon, 1024×500 feature graphic, six 1080×1920 phone screenshots; `store-listing/source/feature-graphic.html` is the editable source). The privacy policy is [`PRIVACY.md`](PRIVACY.md). The full feature walkthrough and step-by-step Play Console guide (listing text, Data safety and content-rating answers) is in [`docs/Careva-CRM-Features-Guide-Thanglish.pdf`](docs/Careva-CRM-Features-Guide-Thanglish.pdf).

## Project map

```
src/
  App.tsx              router
  components/           app shell (sidebar, topbar, command palette), shared record widgets
  ui/                    design-system kit (Button, Card, DataTable, Drawer, Modal, Toasts…)
  pages/                one folder per module (contacts, companies, deals, tasks, calendar,
                         products, quotes, invoices, reports, settings)
  store/                 zustand store (persisted, offline-first) + selectors
  lib/                   formatting, ids, workspace setup, backup/restore, native shell, stats, status maps
  types/                 the whole CRM data model
supabase/
  migrations/             SQL schema + RLS + bootstrap/invite flow for cloud accounts
scripts/
  generate-icon.py        procedural app-icon generator (navy/gold crown)
store-listing/            Play Store icon, feature graphic, screenshots
docs/                     Thanglish features & Play Store publishing guide (PDF + HTML source)
PRIVACY.md                privacy policy (linked from Settings and the Play listing)
```
