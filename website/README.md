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

**Keep every file in this folder together.** `index.html` loads `styles.css`,
`script.js` and `assets/` from alongside it — open the HTML on its own and you
get unstyled text with broken images.

Open `index.html` in any browser, or serve the folder:

```bash
cd website && python3 -m http.server 4180
```

### Standalone copies — for sharing

`standalone/` holds a copy of every page with the stylesheet, script and logos
embedded inside each file. Those render correctly even as a lone file, so they
are the ones to email or copy to a USB stick. Regenerate them after any change:

```bash
python3 build.py && python3 make_standalone.py
```

Serve the normal pages for real hosting — they share one cached stylesheet and
logo instead of repeating them in every page.

## Files

```
website/
├── build.py       page generator — edit content and details here
├── make_standalone.py  builds standalone/ (self-contained copies)
├── index.html …   8 generated pages
├── standalone/    the same 8 pages, each self-contained
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

## Enquiry forms

Both forms (home page and contact page) POST to **FormSubmit**, which forwards
each enquiry as an email to `info@carevaplus.com`. The endpoint is set by
`FORM_ENDPOINT` at the top of `build.py`.

### One-time activation — required

FormSubmit will not deliver anything until the address is confirmed:

1. Put the site online (the forms cannot reach FormSubmit from a `file://` page).
2. Submit the form once.
3. FormSubmit emails `info@carevaplus.com` a confirmation link. Click it.
4. From then on every enquiry arrives in that inbox.

Until step 3 is done, visitors see FormSubmit's "confirm your email" message
followed by a prompt to call the helpline instead — so no enquiry is silently
lost.

### Optional: hide the address

After activating, FormSubmit gives you a random string that works in place of
the email address. Swapping it into `FORM_ENDPOINT` keeps `info@carevaplus.com`
out of the page source, where spam crawlers can read it.

### How it behaves

- Sends name, phone, email, service, duration, area, message, plus the page it
  came from and a timestamp.
- The submit button disables and reads "Sending…", so a slow connection cannot
  produce duplicate enquiries.
- If sending fails, the message tells the visitor to call +91 96555 08881 and
  **keeps what they typed** so they do not have to retype it.
- Every enquiry is also saved in the visitor's browser (`localStorage`, key
  `carevaEnquiries`) as a backup.
- A hidden honeypot field blocks bot submissions before any request is made.

### Switching to your own CRM

Replace `FORM_ENDPOINT` in `build.py` with your own URL and re-run `build.py`.
The handler in `script.js` posts standard `FormData` and treats a JSON response
containing `success: "true"` as delivered.

## Still to do before launch

1. **Check the headline statistics** on the home page — "30 min average response
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
