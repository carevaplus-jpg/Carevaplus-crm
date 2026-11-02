# Careva+ Home Health Care — website

A professional multi-page website for Careva+, Salem. Plain HTML, CSS and
JavaScript — no build step required to view it, no frameworks, no dependencies.

## Pages

Each nav item is its own page, so links open a separate page (not an anchor
scroll):

| File | Page |
|---|---|
| `index.html` | Home |
| `services.html` | All seven services, in detail |
| `about.html` | About, mission &amp; values, the team |
| `how-it-works.html` | Five-step process + what to keep ready |
| `service-areas.html` | Salem city areas, nearby towns, office address |
| `careers.html` | Open roles and how to apply |
| `faq.html` | Ten frequently asked questions |
| `contact.html` | Phone, WhatsApp, email, address, enquiry form |

## Business details

These live in one place — the top of `build.py`:

- **Phone:** +91 96555 08881
- **WhatsApp:** wa.me/919655508881
- **Email:** info@carevaplus.com
- **Office:** 142/3-2 KMS Garden Road, Alagapuram, Periyapudur, Salem

## Editing

The pages share one header, footer and contact block, so they are generated
rather than hand-edited. Change `build.py`, then run:

```bash
python3 build.py
```

Every `.html` file is rewritten. Editing a single `.html` by hand works too,
but the next `build.py` run will overwrite it.

## Run it

Open `index.html` in any browser, or serve the folder:

```bash
cd website && python3 -m http.server 4180
```

## Files

```
website/
├── build.py       page generator — edit content and details here
├── index.html …   8 generated pages
├── styles.css     design system, animations, responsive layout
├── script.js      preloader, nav, scroll reveals, counters, forms
└── assets/
    ├── careva-logo.png        full logo, transparent background
    ├── careva-logo-light.png  white wordmark, for dark backgrounds
    ├── careva-mark.png        icon only, square
    └── favicon.png            browser tab icon
```

## Brand

Colours are taken from the Careva+ logo and defined as CSS variables at the top
of `styles.css`: navy (`--navy-*`) for headings, blue (`--blue-*`) for accents,
green (`--green-*`) for calls to action, and red (`--red-500`) sparingly.

## Animations

Logo preloader with curtain lift · gradient scroll-progress bar · staggered hero
entrance · drifting colour orbs · cascading reveal-on-scroll · counting
statistics · nav underline with active-page highlight · button sheen · card
accent bars and icon tilts.

All motion is disabled under `prefers-reduced-motion`, and the preloader has a
4-second hard fallback so the page can never stay hidden.

## Still to do before launch

1. **The forms don't send anything.** Both the home-page and contact-page forms
   save to `localStorage` under `carevaEnquiries` and show a confirmation.
   Replace `saveEnquiry()` in `script.js` with a `fetch()` to your backend, the
   Careva+ CRM, or a form service to receive real enquiries.
2. **Check the headline statistics** on the home page — "30 min average response
   time", "7 days from enquiry to placement" and so on are claims visitors will
   hold you to. Edit them in `build.py` if they don't match reality.
3. **Check the service-area lists** in `build.py` and remove anywhere you don't
   actually cover.

## Notes

- No stock photography; all icons are inline SVG and all visuals are CSS.
- There are no customer testimonials. Add them only once you have real,
  permitted quotes from real clients.
- Responsive from 360px up, keyboard accessible, with a skip link and visible
  focus rings.
