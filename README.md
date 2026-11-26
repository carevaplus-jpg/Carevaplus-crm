# Careva+ website and CRM

Careva+ is a home healthcare service in Salem, Tamil Nadu: nurses, elderly care, physiotherapy,
post-surgery and ICU care at home.

This repository holds two apps, both built with React and Vite:

| Page | Entry | Source |
| --- | --- | --- |
| Public website | `index.html` | `src/site/` |
| Internal CRM prototype | `crm.html` | `src/main.jsx`, `src/CarevaPlusRoyalAI.jsx` |

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173 (website), /crm.html (CRM)
npm run build    # static output in dist/
```

## Editing website content

Services, caregivers, reviews, areas, FAQs and contact details all live in `src/site/data.js`.
Images are in `public/images/`.

Booking and call-back forms open WhatsApp with the details pre-filled, addressed to the
Careva+ number, so they work without a backend.
