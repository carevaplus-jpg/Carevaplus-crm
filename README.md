# Careva+ Home Health Care — web app

This branch (`careva-app`) is the hosted Careva+ app. It is separate from the CRM code on `main`.

**Turn the website on (one time):** repository **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `careva-app`, folder `/ (root)` → Save.**
After a minute the app is live at **https://carevaplus-jpg.github.io/carevaplus-crm/**

- No build step; plain HTML/CSS/JS. The Supabase library (MIT) is included in `vendor/` (version in `vendor/SUPABASE_VERSION.txt`).
- `js/config.js` holds the public (publishable) database key — safe to publish; row-level security protects all data. No secret keys are in this branch.
- `proxy-worker.js.txt`: optional Cloudflare Worker that gives the database a backup address for networks that block `*.supabase.co`.
