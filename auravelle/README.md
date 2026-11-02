# Auravelle — Kojiba

An immersive, installable storefront for Auravelle Cosmetics and its first
product, **Kojiba Brightening & Nourishing Soap**. Plain HTML, CSS and
JavaScript — no frameworks, no build tooling, no dependencies.

## Pages

| File | Page |
|---|---|
| `index.html` | Home — hero with price, trust strip, pack cards, the four actives, usage, FAQ |
| `kojiba.html` | Product — gallery, pack selection, cart, formulation panels |
| `about.html` | Auravelle's story and company details |
| `faq.html` | Eight questions |
| `contact.html` | Phone, WhatsApp, email, address, message form |
| `offline.html` | Shown by the service worker when a page isn't cached |

## Editing

All content lives at the top of `build.py`. Change it, then run:

```bash
python3 build.py
```

Every `.html` file is rewritten. Editing one by hand works, but the next
`build.py` run overwrites it.

## Run it

Keep all files in this folder together, then:

```bash
python3 -m http.server 4300
```

Open <http://localhost:4300>. A plain `file://` open works for looking around,
but the service worker and the install prompt need `http(s)`.

## What comes from the carton

These were read off the Kojiba packaging artwork, not invented:

- Net quantity **75 g**, **MRP ₹149** inclusive of all taxes
- Actives: **kojic acid, niacinamide, jojoba oil, licorice extract**
- Directions, caution text, and the three pack claims
- Consumer care **+91 96555 73574**, `auravellecosmetics@gmail.com`
- Address: 44/1, Govinda Kounder Thottam, Peramanur, Salem - 636007

## Still to confirm before launch

1. **The INCI ingredient list.** The carton still reads
   `[INGREDIENT LIST - CONFIRM WITH MANUFACTURER]`. Add it to `INGREDIENTS` in
   `build.py` and the product page panel fills itself in. A cosmetic sold in
   India must declare this.
2. **Manufacturing licence number and manufacturer name/address** — both still
   marked CONFIRM on the carton. `MFG_LICENCE` and `MANUFACTURER` in `build.py`.
3. **Pack-of-3 and pack-of-6 prices.** Only the single-bar MRP is confirmed; the
   pack prices in `VARIANTS` are placeholders marked TODO.
4. **Instagram URL** — `INSTAGRAM` in `build.py`; the footer link appears once set.
5. **Domain** — set `SITE_URL` and the canonical, Open Graph and Twitter tags
   start being emitted. Until then they are deliberately left out rather than
   pointing nowhere.

## Checkout

There is no payment gateway yet, by choice. **Checkout** composes an itemised
order and hands it to WhatsApp, where you confirm it before dispatch. When you
open a Razorpay or Cashfree account, only the `[data-checkout]` handler at the
bottom of `app.js` changes — the catalogue, cart and pricing stay as they are.

## The cart

Lines are kept in `localStorage` under `auravelle.cart.v1`, so a bag survives a
reload and works offline. It stores **only product choices** — never a name,
address or payment detail.

## Design

A marketplace-style storefront, built for buying rather than browsing: a launch
promo bar, a navy header with search and a bag, a nav strip, a trust strip, pack
cards, and a three-column product page — gallery and spec table, plus a sticky
buy box with **Add to bag**, **Buy now** and a PIN-code check. Pack prices show
a percentage off against MRP and follow the selected pack.

Colours: navy chrome, marketplace blue for links and focus, amber for the main
action and orange for Buy now. Auravelle's gold survives in the logo and the
brand name. Reveals are kept short and subtle, and stop under
`prefers-reduced-motion`.

## PWA

- `manifest.webmanifest` — standalone display, 192/512 icons plus a maskable
  variant with a safe zone.
- `sw.js` — shell files cached on install and served cache-first; pages are
  network-first with a cache fallback, then `offline.html`.
- An install bar appears when the browser offers `beforeinstallprompt`,
  dismissible for the session.
- **Bump `VERSION` at the top of `sw.js` whenever `styles.css` or `app.js`
  change.** The shell is served cache-first, so without a new version name
  returning visitors would keep the old design. A version bump makes the new
  worker delete the old caches — verified by upgrading a real v1 install to v2.

Verified: manifest parses, all icons load at their declared sizes, the worker
activates, 12 shell files cache, a visited page works fully offline with images,
and an unvisited page falls back to the offline page.

## Accessibility

Contrast was measured, not estimated. The brand's `--gold-700` reached only
3.39:1 on tinted cream against the 4.5 requirement, so small gold text uses
`--gold-ink` (`#8f5106`, the darkest gold in the Auravelle logo) at 5.0–6.2:1.
Decorative gold is unchanged.

Pack radios are visually hidden but remain focusable and arrow-key operable,
with a visible focus ring. The cart drawer traps Tab while open, closes on
Escape, and returns focus where it came from.

## Images

The product shots are crops of the supplied carton dieline and the packaging
mockup. The mockup is only 524 × 364, so the hero shot is soft at large sizes —
a higher-resolution render, or real product photography, would noticeably
improve the home and product pages.

## Standalone pages

`python3 build.py && python3 make_standalone.py` writes `standalone/`: the same
pages with the stylesheet, script and images embedded, so a page renders
correctly even as a lone file. Use these for sharing; serve the normal pages for
hosting. The manifest and service worker are omitted from them because the PWA
needs http(s).

## Not claimed on the site

The carton does not say anything about free delivery, cash on delivery, courier
coverage or stock, so the site says none of it. Delivery copy is limited to
"our team confirms delivery time and charges before dispatch". Add real policies
to `build.py` once you have decided them.
