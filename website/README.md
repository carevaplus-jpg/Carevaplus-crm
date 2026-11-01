# Careva+ Home Health Care — website

A professional marketing website for Careva+. Plain HTML, CSS and JavaScript —
no build step, no frameworks, no dependencies.

```
website/
├── index.html   all page content
├── styles.css   design system + responsive layout
└── script.js    nav, scroll reveals, counters, forms
```

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
