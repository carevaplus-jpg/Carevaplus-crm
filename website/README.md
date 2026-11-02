# Careva+ Home Health Care — website

A professional marketing website for Careva+. Plain HTML, CSS and JavaScript —
no build step, no frameworks, no dependencies.

```
website/
├── index.html   all page content
├── styles.css   design system + animations + responsive layout
├── script.js    preloader, nav, scroll reveals, counters, forms
└── assets/
    ├── careva-logo.png        full logo, transparent background
    ├── careva-logo-light.png  white wordmark, for dark backgrounds
    ├── careva-mark.png        icon only, square
    └── favicon.png            browser tab icon
```

## Brand

Colours are taken from the Careva+ logo and defined as CSS variables at the top
of `styles.css`: navy (`--navy-*`) for headings, blue (`--blue-*`) for accents,
green (`--green-*`) for calls to action, and red (`--red-500`) used sparingly.

All four logo files were generated from the supplied artwork, with the white
background flood-filled to transparency. Regenerate them if the logo changes.

## Animations

| Effect | Where |
|---|---|
| Logo preloader with sweeping bar, then curtain lift | page load |
| Gradient scroll-progress bar | top of viewport |
| Staggered hero entrance, floating card | hero |
| Drifting blurred colour orbs | hero, contact, pledge card |
| Cascading reveal-on-scroll | every section |
| Counting statistics | stats strip |
| Underline slide + active-section highlight | nav |
| Sheen sweep + lift | buttons |
| Accent bar, icon tilt, lift | service cards |

Every animation is disabled under `prefers-reduced-motion`, and the preloader
has a 4-second hard fallback so the page can never stay hidden.

## Run it

Open `index.html` in any browser, or serve the folder:

```bash
cd website && python3 -m http.server 4180
```

## Sections

Hero with enquiry form · stats strip · six services · why Careva+ and care
standards · four-step process · team · FAQ · contact form · footer.

## Before going live — replace these placeholders

| Where | Placeholder |
|---|---|
| Contact section + footer | `+91 00000 00000` |
| Contact section + footer | `hello@carevaplus.com` |
| Contact section | "Your city & surrounding districts" |
| Stats strip | `24/7`, `30 min`, `100%`, `7 days` — confirm these match your real service levels |

The small grey "Replace with your…" hints under the contact details are markers
for you; delete them once the real details are in.

## Connecting the forms

Both forms currently save enquiries to `localStorage` under `carevaEnquiries`
and show a confirmation. Nothing is emailed or sent anywhere. To receive real
enquiries, replace `saveEnquiry()` in `script.js` with a `fetch()` to your
backend, the Careva+ CRM, or a form service.

## Notes

- No stock photography is used; all icons are inline SVG and all visuals are CSS.
- There are no customer testimonials on the page. Add them only once you have
  real, permitted quotes from real clients.
- Responsive from 360px up, keyboard accessible, with a skip link, visible focus
  rings and `prefers-reduced-motion` support.
