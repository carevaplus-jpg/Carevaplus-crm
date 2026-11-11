# Careva+ app (patients · care staff · office)

A rebuilt, professional version of the Careva+ Home Health Care app. It uses the **existing live Supabase project `careva-plus`** (same tables, same logins, same security rules), so all current patients, staff, visits and bills appear as they are.

## Run it

```bash
npm install
cp app/.env.example app/.env      # then paste your Google Maps key (see below)
npm run app:dev                   # local dev server
npm run app:build                 # production build in app/dist/
```

Open `/?demo=1` to try every screen with sample data (nothing touches real records).

## Sign-in (unchanged)

| Who | ID | Becomes |
|---|---|---|
| Care staff | Staff ID, e.g. `S101` | `s101@staff.carevaplus.com` |
| Patient / family | Registered 10-digit mobile | `9xxxxxxxxx@patient.carevaplus.com` |
| Office (admin, coordinator, supervisor, billing) | Email | as entered |

## Google Maps

Set `VITE_GOOGLE_MAPS_KEY` in `app/.env`. In Google Cloud Console enable **Maps JavaScript API** and **Directions API**, and restrict the key to your app's domain. With a key you get styled live maps, smoothly moving staff markers, real driving routes and traffic-aware ETAs. Without a key the app still works using keyless Google Maps embeds and "Navigate" links, with ETAs estimated from distance.

## What each role gets

- **Office:** live operations dashboard, full-screen live map with today's travel trails, schedule with skill/distance-ranked staff assignment and clash warnings, patients (vitals trends, visits, bills, Google-Maps-link location pinning), visit requests → one-click scheduling, staff (shift, live status, timesheets), billing (invoices from completed visits at your rates, UPI payment verification), alerts, messages, settings (geofence, late threshold, signature rule, rates, office location).
- **Care staff:** shift on/off with automatic live GPS sharing (and km travelled), next-visit card with Google Maps route and ETA, one-tap Navigate/Call, "Start travel" (notifies the family), geofenced GPS check-in/out (EVV) with automatic office alerts when outside the geofence or late, care-task checklist, vitals with abnormal-value alerts, notes and family signature.
- **Patient & family:** live tracking of the caregiver on Google Maps with ETA and progress steps, next visit, updates, rating after each visit, booking requests, vitals history and self-recorded readings, care profile, bills with UPI pay + reference submission, chat with the care team.
