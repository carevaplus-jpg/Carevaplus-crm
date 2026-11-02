#!/usr/bin/env python3
"""
Auravelle website generator — Kojiba launch.

Every page shares one header, footer and product definition, so they live here
once. Edit this file, then run:

    python3 build.py

All .html files in this folder are rewritten.
"""

import json
import pathlib

OUT = pathlib.Path(__file__).parent

# ═══════════════════════════════════════════════════════════════════
#  BUSINESS DETAILS  —  the placeholders marked TODO must be replaced
# ═══════════════════════════════════════════════════════════════════

BRAND        = "Auravelle"
BRAND_FULL   = "Auravelle Cosmetics"
PRODUCT      = "Kojiba"
PRODUCT_FULL = "Kojiba Brightening & Nourishing Soap"
TAGLINE      = "Beauty in every you"

# ── From the Kojiba carton artwork ────────────────────────────────────
EMAIL         = "auravellecosmetics@gmail.com"
PHONE_DISPLAY = "+91 96555 73574"
PHONE_TEL     = "+919655573574"
WHATSAPP      = "https://wa.me/919655573574"
INSTAGRAM     = ""            # TODO: add your Instagram URL
ADDRESS_LINES = ["Auravelle Cosmetics", "44/1, Govinda Kounder Thottam",
                 "Peramanur, Salem - 636007", "Tamil Nadu, India"]
PIN_CODE      = "636007"

SITE_URL = ""                 # TODO: set once you have a domain. Until then
                              # canonical / Open Graph / Twitter tags are omitted
                              # rather than emitted pointing nowhere.

CURRENCY  = "₹"

# ── The product ──────────────────────────────────────────────────────
WEIGHT   = "75 g"             # from the carton
MRP      = 149                # from the carton: MRP ₹149.00 incl. of all taxes
SUBTITLE = "Brightening & Nourishing Soap"
FORMULA  = "Formulated with Kojic Acid, Niacinamide, Jojoba Oil & Licorice Extract"

# The four actives, exactly as the carton presents them.
ACTIVES = [
    ("Kojic Acid",       "Brightens",  "A naturally derived active, long used in skincare for its effect on uneven tone."),
    ("Niacinamide",      "Evens tone", "A form of vitamin B3 that supports a smoother, more even-looking complexion."),
    ("Jojoba Oil",       "Nourishes",  "A light plant oil, close in structure to skin's own sebum, that conditions as you cleanse."),
    ("Licorice Extract", "Soothes",    "A botanical extract traditionally used to calm and comfort the skin."),
]

# Pack options. Only the single-bar MRP is confirmed from the carton; the
# multi-pack prices below are suggestions.
VARIANTS = [
    {"id": "single", "name": "Single bar", "qty": 1, "price": 149,  "mrp": 149,  "note": "Try it first"},
    {"id": "pack3",  "name": "Pack of 3",  "qty": 3, "price": 399,  "mrp": 447,  "note": "Most loved", "featured": True},   # TODO: confirm
    {"id": "pack6",  "name": "Pack of 6",  "qty": 6, "price": 749,  "mrp": 894,  "note": "Best value"},                     # TODO: confirm
]

# Printed on the carton.
DIRECTIONS = ("Wet skin, gently massage with Kojiba soap to create a rich lather. "
              "Rinse thoroughly with water.")
CAUTION    = ("For external use only. Avoid contact with eyes. If irritation occurs, "
              "stop use and consult a dermatologist.")
PACK_CLAIMS = ["Dermatologically tested", "Suitable for daily use", "Gentle on skin"]

# TODO: the carton still reads "[INGREDIENT LIST - CONFIRM WITH MANUFACTURER]".
# Add the full INCI list here once the manufacturer confirms it, and the
# ingredients panel on the product page will fill itself in.
INGREDIENTS = []

# TODO: also still marked CONFIRM on the carton — needed on the site for a
# cosmetic sold in India.
MFG_LICENCE = ""
MANUFACTURER = ""

NAV = [
    ("index.html",   "Home"),
    ("kojiba.html",  PRODUCT),
    ("about.html",   "About"),
    ("faq.html",     "FAQ"),
    ("contact.html", "Contact"),
]

PLACEHOLDER_NOTICE = (
    "Still to confirm before launch: the INCI ingredient list, the manufacturing "
    "licence number and manufacturer details, the multi-pack prices, and the "
    "Instagram URL. Everything else comes from the carton artwork."
)


# ═══════════════════════════════════════════════════════════════════
#  SHARED CHROME
# ═══════════════════════════════════════════════════════════════════

def seo(title, description, page):
    if not SITE_URL:
        return ("<!-- Set SITE_URL in build.py to emit canonical, Open Graph "
                "and Twitter tags. -->")
    base = SITE_URL.rstrip("/")
    url = base + "/" + ("" if page == "index.html" else page)
    img = base + "/assets/og-cover.jpg"
    return f"""<link rel="canonical" href="{url}" />
<meta property="og:url" content="{url}" />
<meta property="og:site_name" content="{BRAND}" />
<meta property="og:locale" content="en_IN" />
<meta property="og:image" content="{img}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{description}" />"""


def product_schema():
    offers = ",\n      ".join(
        json.dumps({
            "@type": "Offer",
            "name": v["name"],
            "price": str(v["price"]),
            "priceCurrency": "INR",
            "availability": "https://schema.org/PreOrder",
        })
        for v in VARIANTS
    )
    return f"""<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{PRODUCT} Soap",
  "brand": {{ "@type": "Brand", "name": "{BRAND}" }},
  "category": "Bath Soap",
  "weight": {{ "@type": "QuantitativeValue", "value": "{WEIGHT}" }},
  "offers": [
      {offers}
  ]
}}
</script>"""


def head(title, description, page, schema=""):
    return f"""<!DOCTYPE html>
<html lang="en-IN" data-whatsapp="{WHATSAPP}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>{title}</title>
<meta name="description" content="{description}" />
<meta name="theme-color" content="#2a211b" media="(prefers-color-scheme: dark)" />
<meta name="theme-color" content="#fbf7f0" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:type" content="website" />
{seo(title, description, page)}

<link rel="manifest" href="manifest.webmanifest" />
<link rel="apple-touch-icon" href="assets/icon-180.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="{BRAND}" />
<link rel="icon" type="image/png" sizes="192x192" href="assets/icon-192.png" />

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="styles.css" />
{schema}
</head>
<body>

<a class="skip-link" href="#main">Skip to content</a>
<div class="grain" aria-hidden="true"></div>
"""


def header(active):
    links = "\n".join(
        f'      <a href="{href}"{" class=\"active\"" if href == active else ""}>{label}</a>'
        for href, label in NAV
    )
    return f"""
<div class="promo-bar">
  <div class="shell"><span>New launch — <strong>{PRODUCT} {WEIGHT} at {money(MRP)}</strong> · Packs of 3 and 6 available</span></div>
</div>

<header class="site-header" id="siteHeader">
  <div class="shell header-inner">
    <a class="brand" href="index.html" aria-label="{BRAND} — home">
      <img class="brand-mark" src="assets/mark.png" width="191" height="160" alt="" aria-hidden="true" />
      <span class="brand-word">{BRAND}<span class="brand-sub">{BRAND_FULL.split()[-1]}</span></span>
    </a>

    <form class="search desktop" role="search" data-search>
      <label class="sr-only" for="q">Search products</label>
      <input id="q" type="text" name="q" placeholder="Search for soaps, ingredients, packs…" autocomplete="off" />
      <button type="submit" aria-label="Search">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      </button>
    </form>

    <div class="header-actions">
      <a class="header-link" href="contact.html">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
        <span>Help</span>
      </a>
      <button class="cart-button" id="cartButton" aria-label="Open bag" aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" width="21" height="21"><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9.5 7V5.5a2.5 2.5 0 0 1 5 0V7"/></svg>
        <span class="label">Bag</span>
        <span class="cart-count" data-cart-count hidden>0</span>
      </button>
      <button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="navStrip" aria-label="Open menu">
        <span></span><span></span>
      </button>
    </div>
  </div>

  <div class="nav-strip" id="navStrip">
    <nav class="shell nav" id="nav" aria-label="Main">
{links}
    </nav>
  </div>
</header>

<main id="main" tabindex="-1">
"""


def cart_drawer():
    return """
<div class="drawer-scrim" data-cart-scrim hidden></div>
<aside class="cart-drawer" id="cartDrawer" role="dialog" aria-modal="true"
       aria-labelledby="cartTitle" hidden>
  <header class="cart-head">
    <h2 id="cartTitle">Your bag</h2>
    <button class="icon-button" data-cart-close aria-label="Close bag">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
           stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
    </button>
  </header>
  <div class="cart-body" data-cart-items></div>
  <footer class="cart-foot" data-cart-foot hidden>
    <div class="cart-total"><span>Subtotal</span><strong data-cart-total></strong></div>
    <p class="cart-note">Shipping calculated at checkout.</p>
    <button class="btn btn-primary btn-block" data-checkout>Checkout</button>
    <p class="cart-legal" data-checkout-note></p>
  </footer>
</aside>
"""


def footer():
    social = ""
    if INSTAGRAM:
        social = f'<li><a href="{INSTAGRAM}" target="_blank" rel="noopener">Instagram</a></li>'
    phone = f'<li><a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>' if PHONE_TEL else ""
    addr = ("<li class='foot-address'>" + "<br />".join(ADDRESS_LINES) + "</li>") if ADDRESS_LINES else ""
    return f"""
</main>

<footer class="site-footer">
  <div class="shell foot-grid">
    <div class="foot-brand">
      <span class="brand-word big">{BRAND}</span>
      <p>{TAGLINE}</p>
    </div>
    <div>
      <h3>Shop</h3>
      <ul>
        <li><a href="kojiba.html">{PRODUCT} soap</a></li>
        <li><a href="kojiba.html#variants">Packs &amp; sizes</a></li>
        <li><a href="kojiba.html#ingredients">Ingredients</a></li>
      </ul>
    </div>
    <div>
      <h3>Auravelle</h3>
      <ul>
        <li><a href="about.html">Our story</a></li>
        <li><a href="faq.html">FAQ</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </div>
    <div>
      <h3>Reach us</h3>
      <ul>
        <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
        {phone}
        {social}
        {addr}
      </ul>
    </div>
  </div>
  <div class="shell foot-bar">
    <p>© <span data-year>2026</span> {BRAND}. All rights reserved.</p>
    <p class="foot-fine">Cosmetic product for external use only. Patch test before first use.</p>
  </div>
</footer>

{cart_drawer()}

<div class="toast" data-toast hidden></div>

<script src="app.js"></script>
</body>
</html>
"""


def build(filename, title, description, body, schema=""):
    html = head(title, description, filename, schema) + header(filename) + body + footer()
    (OUT / filename).write_text(html, encoding="utf-8")
    return filename


# ═══════════════════════════════════════════════════════════════════
#  SHARED FRAGMENTS
# ═══════════════════════════════════════════════════════════════════

def money(n):
    return f"{CURRENCY}{n:,}"


def pack_shot(w=800, cls="", loading="lazy"):
    return (f'<picture class="{cls}">'
            f'<source type="image/webp" srcset="assets/kojiba-pack-480.webp 480w, assets/kojiba-pack-800.webp 800w" '
            f'sizes="(max-width: 820px) 86vw, 420px" />'
            f'<img src="assets/kojiba-pack-800.jpg" width="625" height="676" loading="{loading}" decoding="async" '
            f'alt="Kojiba Brightening &amp; Nourishing Soap carton, 75 g" '
            f'srcset="assets/kojiba-pack-480.jpg 480w, assets/kojiba-pack-800.jpg 800w" '
            f'sizes="(max-width: 820px) 86vw, 420px" /></picture>')


def scene_shot(cls="", loading="lazy"):
    return (f'<picture class="{cls}">'
            f'<source type="image/webp" srcset="assets/kojiba-scene-400.webp 400w, assets/kojiba-scene-640.webp 640w" '
            f'sizes="(max-width: 820px) 90vw, 560px" />'
            f'<img src="assets/kojiba-scene-640.jpg" width="310" height="280" loading="{loading}" decoding="async" '
            f'alt="Kojiba soap bar beside its carton on marble with jasmine flowers" '
            f'srcset="assets/kojiba-scene-400.jpg 400w, assets/kojiba-scene-640.jpg 640w" '
            f'sizes="(max-width: 820px) 90vw, 560px" /></picture>')


def actives_grid():
    cards = []
    for i, (name, verb, blurb) in enumerate(ACTIVES, 1):
        cards.append(f"""      <article class="active-card" data-reveal data-depth="{0.04 + i * 0.012:.3f}">
        <span class="active-index">0{i}</span>
        <h3>{name}</h3>
        <p class="active-verb">{verb}</p>
        <p>{blurb}</p>
      </article>""")
    return "\n".join(cards)


def variant_picker(context="page"):
    rows = []
    for v in VARIANTS:
        save = v["mrp"] - v["price"]
        badge = f'<span class="variant-badge">{v["note"]}</span>' if v.get("note") else ""
        saving = f'<span class="variant-save">Save {money(save)}</span>' if save > 0 else ""
        checked = ' checked' if v.get("featured") else ''
        rows.append(f"""        <label class="variant{' is-featured' if v.get('featured') else ''}">
          <input type="radio" name="variant-{context}" value="{v['id']}"{checked}
                 data-variant data-price="{v['price']}" data-mrp="{v['mrp']}" data-name="{v['name']}" data-qty="{v['qty']}" />
          <span class="variant-body">
            <span class="variant-top"><strong>{v['name']}</strong>{badge}</span>
            <span class="variant-meta">{v['qty']} × {WEIGHT}</span>
            <span class="variant-price">{money(v['price'])}
              {'<s>' + money(v['mrp']) + '</s>' if save > 0 else ''}{saving}</span>
          </span>
        </label>""")
    return "\n".join(rows)


def claim_row():
    icons = {
        "Dermatologically tested": '<path d="M12 3 4 6v6c0 4.4 3.4 7.6 8 9 4.6-1.4 8-4.6 8-9V6Z"/><path d="m9 12 2 2 4-4"/>',
        "Suitable for daily use":  '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
        "Gentle on skin":          '<path d="M12 21s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.7-7 10-7 10Z"/>',
    }
    out = []
    for c in PACK_CLAIMS:
        out.append(f"""      <li><svg viewBox="0 0 24 24" aria-hidden="true">{icons.get(c, '')}</svg>{c}</li>""")
    return "\n".join(out)


FAQS = [
    ("What is Kojiba?",
     f"Kojiba is {BRAND_FULL}' brightening and nourishing soap — a {WEIGHT} bar formulated with "
     "kojic acid, niacinamide, jojoba oil and licorice extract."),
    ("How do I use it?",
     DIRECTIONS + " Use it in place of your usual cleansing bar, on the face or body."),
    ("Can I use it every day?",
     "The carton states that Kojiba is suitable for daily use. As with any new cosmetic, patch "
     "test on a small area first and see how your skin responds before using it more widely."),
    ("Is it suitable for sensitive skin?",
     "Kojiba is formulated to be gentle, and the carton states it is dermatologically tested. "
     "If your skin is reactive or you are treating a specific condition, check with a "
     "dermatologist before adding any new product."),
    ("What does kojic acid do?",
     "Kojic acid is a naturally derived ingredient widely used in skincare for its effect on "
     "uneven tone. Results vary between people, and sun protection matters alongside any "
     "tone-focused routine."),
    ("What size is the bar, and what does it cost?",
     f"Each bar is {WEIGHT}. A single bar is {money(MRP)} (MRP, inclusive of all taxes); packs of "
     "three and six are offered at a lower price per bar."),
    ("How is my order delivered?",
     "Place your order on the site and our team confirms it with you directly, including delivery "
     "time and charges for your area, before dispatch."),
    ("Where is Auravelle based?",
     "Auravelle Cosmetics is based in Peramanur, Salem, Tamil Nadu. Our full address is on the "
     "contact page and on every Kojiba carton."),
]


def faq_items(limit=None):
    items = FAQS[:limit] if limit else FAQS
    return "\n".join(
        f"""      <details class="faq" data-reveal>
        <summary>{q}</summary>
        <div class="faq-body"><p>{a}</p></div>
      </details>"""
        for q, a in items)


TRUST = [
    ("Dermatologically tested", '<path d="M12 3 4 6v6c0 4.4 3.4 7.6 8 9 4.6-1.4 8-4.6 8-9V6Z"/><path d="m9 12 2 2 4-4"/>'),
    ("Suitable for daily use", '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'),
    ("Gentle on skin", '<path d="M12 21s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.7-7 10-7 10Z"/>'),
    ("Order confirmed by our team", '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="m9 12 2 2 4-4"/>'),
]


def trust_strip():
    items = "\n".join(
        f'      <li><svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>{label}</li>'
        for label, icon in TRUST)
    return f"""
<section class="trust-strip">
  <ul class="shell">
{items}
  </ul>
</section>
"""


def pack_cards():
    out = []
    for v in VARIANTS:
        save = v["mrp"] - v["price"]
        pct = round(save / v["mrp"] * 100) if v["mrp"] else 0
        tag = f'<span class="pack-tag">{v["note"]}</span>' if v.get("note") else ""
        off = f'<span class="off">{pct}% off</span>' if pct else ""
        strike = f"<s>{money(v['mrp'])}</s>" if save > 0 else ""
        out.append(f"""      <article class="pack-card" data-reveal>
        {tag}
        <img src="assets/kojiba-pack-480.jpg" width="625" height="676" loading="lazy" decoding="async"
             alt="{PRODUCT} {v['name']} — {v['qty']} × {WEIGHT}" />
        <h3>{v['name']}</h3>
        <p class="pack-meta">{v['qty']} × {WEIGHT} bar{'s' if v['qty'] > 1 else ''}</p>
        <p class="pack-price"><b>{money(v['price'])}</b> {strike} {off}</p>
        <a class="btn btn-primary btn-block" href="kojiba.html#buy">Select pack</a>
      </article>""")
    return "\n".join(out)


def cta_band():
    return f"""
<section class="band" data-parallax-root>
  <span class="band-glow" data-depth="0.10" aria-hidden="true"></span>
  <div class="shell band-inner" data-reveal>
    <p class="eyebrow">Ready when you are</p>
    <h2>Bring {PRODUCT} home</h2>
    <p class="band-lead">{WEIGHT} of brightening, nourishing care — {money(MRP)} a bar, or less in a pack.</p>
    <div class="band-actions">
      <a class="btn btn-primary btn-lg" href="kojiba.html">Shop {PRODUCT}</a>
      <a class="btn btn-ghost btn-lg" href="faq.html">Read the FAQ</a>
    </div>
  </div>
</section>
"""


# ═══════════════════════════════════════════════════════════════════
#  PAGES
# ═══════════════════════════════════════════════════════════════════

def home():
    best = max(VARIANTS, key=lambda v: (v["mrp"] - v["price"]) / v["mrp"] if v["mrp"] else 0)
    best_pct = round((best["mrp"] - best["price"]) / best["mrp"] * 100) if best["mrp"] else 0
    return f"""
<section class="hero">
  <div class="shell hero-inner">
    <div class="hero-copy">
      <p class="eyebrow" data-rise="1" style="color:var(--amber-500)">{BRAND_FULL}</p>
      <h1 data-rise="2"><span class="script">{PRODUCT}</span><span class="h1-sub">{SUBTITLE}</span></h1>
      <div class="price-flash" data-rise="3">
        <b>{money(MRP)}</b><s>{money(MRP)} MRP</s><em>75 g bar</em>
      </div>
      <p class="lead" data-rise="4">{FORMULA}. Save up to {best_pct}% when you buy a multi-pack.</p>
      <div class="hero-actions" data-rise="5">
        <a class="btn btn-buy btn-lg" href="kojiba.html#buy">Buy now</a>
        <a class="btn btn-ghost btn-lg" href="#packs">View packs</a>
      </div>
    </div>
    <div class="hero-art">
      {scene_shot('hero-shot', loading='eager')}
    </div>
  </div>
</section>
{trust_strip()}

<section class="section" id="packs">
  <div class="shell">
    <header class="section-head" data-reveal>
      <h2>Choose your pack</h2>
      <p class="section-lead">The more bars you take, the lower the price per bar.</p>
    </header>
    <div class="pack-grid">
{pack_cards()}
    </div>
  </div>
</section>

<section class="section">
  <div class="shell">
    <header class="section-head" data-reveal>
      <h2>What's inside</h2>
      <p class="section-lead">The four actives printed on every {PRODUCT} carton.</p>
    </header>
    <div class="actives">
{actives_grid()}
    </div>
  </div>
</section>

<section class="section">
  <div class="shell split-prose">
    <div class="panel" data-reveal>
      <h2>How to use it</h2>
      <ol class="steps">
        <li><span>1</span><div><h3>Wet</h3><p>Warm water, face or body.</p></div></li>
        <li><span>2</span><div><h3>Lather</h3><p>Massage the bar until it works into a rich lather.</p></div></li>
        <li><span>3</span><div><h3>Rinse</h3><p>Rinse thoroughly, then moisturise while skin is damp.</p></div></li>
      </ol>
      <p class="caution-line">{CAUTION}</p>
    </div>
    <div class="prose-art" data-reveal>
      {pack_shot(cls='pack-float')}
    </div>
  </div>
</section>

<section class="section">
  <div class="shell split-prose">
    <div class="panel" data-reveal>
      <h2>About {BRAND_FULL}</h2>
      <p>{BRAND_FULL} is a cosmetics house in Salem, Tamil Nadu. {PRODUCT} is our first bar — built
        around four well-understood ingredients, with nothing added for the sake of a longer label.</p>
      <p class="sig">{TAGLINE}</p>
      <p class="more-link"><a href="about.html">Read our story <span aria-hidden="true">&rarr;</span></a></p>
    </div>
    <div class="panel faq-wrap" data-reveal>
      <h2>Common questions</h2>
      <div class="faq-list">
{faq_items(limit=3)}
      </div>
      <p class="more-link"><a href="faq.html">All questions <span aria-hidden="true">&rarr;</span></a></p>
    </div>
  </div>
</section>
{cta_band()}
"""


def product():
    ing = ('<p class="ingredients-pending">The full ingredient list is being confirmed with our '
           'manufacturer and will be published here exactly as it appears on the carton.</p>'
           if not INGREDIENTS else
           '<p class="ingredients-list">' + ", ".join(INGREDIENTS) + "</p>")
    hi = "\n".join(f"        <li>{name} — {verb.lower()}</li>" for name, verb, _ in ACTIVES)
    return f"""
<div class="shell">
  <nav class="crumb">
    <a href="index.html">Home</a><span aria-hidden="true">&rsaquo;</span>
    <a href="index.html#packs">Soap</a><span aria-hidden="true">&rsaquo;</span>
    <span aria-current="page">{PRODUCT}</span>
  </nav>
</div>

<section class="product" id="buy">
  <div class="shell product-grid">
    <div class="product-media">
      <div class="media-main">{scene_shot('', loading='eager')}</div>
      <div class="media-thumbs">
        <span class="thumb is-active">{scene_shot()}</span>
        <span class="thumb">{pack_shot(cls='')}</span>
      </div>
    </div>

    <div class="product-info">
      <p class="brand-line">{BRAND_FULL}</p>
      <h1>{PRODUCT} — {SUBTITLE}<span class="h1-sub">Net quantity {WEIGHT}</span></h1>
      <div class="rating-row">
        <span class="rating-pill">New launch</span>
        <span>No ratings yet</span>
      </div>

      <div class="price-block">
        <div class="price-row">
          <strong data-price-display>{money(MRP)}</strong>
          <span class="off" data-off hidden></span>
        </div>
        <p class="price-meta">Inclusive of all taxes</p>
      </div>

      <p class="product-formula">{FORMULA}</p>

      <ul class="highlights">
{hi}
        <li>Suitable for daily use on face and body</li>
        <li>Dermatologically tested</li>
      </ul>

      <table class="spec-table">
        <tbody>
          <tr><th>Brand</th><td>{BRAND_FULL}</td></tr>
          <tr><th>Product</th><td>{PRODUCT_FULL}</td></tr>
          <tr><th>Net quantity</th><td>{WEIGHT} per bar</td></tr>
          <tr><th>Key actives</th><td>Kojic acid, niacinamide, jojoba oil, licorice extract</td></tr>
          <tr><th>Form</th><td>Bathing bar</td></tr>
          <tr><th>Marketed by</th><td>{BRAND_FULL}, Salem, Tamil Nadu</td></tr>
          <tr><th>Country of origin</th><td>India</td></tr>
        </tbody>
      </table>
    </div>

    <aside class="buy-box">
      <div class="buy-price">
        <strong data-price-display>{money(MRP)}</strong>
        <span class="off" data-off hidden></span>
      </div>
      <p class="in-stock">Available to order</p>

      <form class="variants" data-add-form>
        <fieldset>
          <legend>Select pack</legend>
{variant_picker()}
        </fieldset>

        <div class="qty-row">
          <label for="qty">Qty</label>
          <div class="qty">
            <button type="button" data-qty-down aria-label="Decrease quantity">&minus;</button>
            <input id="qty" type="number" value="1" min="1" max="20" data-qty-input inputmode="numeric" />
            <button type="button" data-qty-up aria-label="Increase quantity">+</button>
          </div>
        </div>

        <button class="btn btn-primary btn-block btn-lg" type="submit">Add to bag</button>
        <button class="btn btn-buy btn-block btn-lg" type="button" data-buy-now>Buy now</button>
      </form>

      <div class="delivery-box">
        <h3>Delivery</h3>
        <div class="pin-row">
          <input type="text" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit PIN code"
                 data-pin aria-label="PIN code" />
          <button type="button" data-pin-check>Check</button>
        </div>
        <p class="pin-note" data-pin-note></p>
      </div>

      <ul class="offer-list">
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
            Order confirmed by our team before dispatch</li>
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
            Delivery time and charges told to you upfront</li>
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
            Questions? Call {PHONE_DISPLAY}</li>
      </ul>

      <div class="secure-row">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
        Your details stay with Auravelle
      </div>
      <p class="buy-note" data-checkout-note></p>
    </aside>
  </div>
</section>

<section class="section" id="ingredients">
  <div class="shell">
    <header class="section-head" data-reveal><h2>Product details</h2></header>
    <div class="actives">
{actives_grid()}
    </div>
    <div class="panel-grid">
      <div class="panel" data-reveal><h3>Directions for use</h3><p>{DIRECTIONS}</p></div>
      <div class="panel" data-reveal><h3>Caution</h3><p>{CAUTION}</p></div>
      <div class="panel" data-reveal><h3>Full ingredient list</h3>{ing}</div>
      <div class="panel" data-reveal>
        <h3>Net quantity &amp; price</h3>
        <p>{WEIGHT} per bar. MRP {money(MRP)} inclusive of all taxes.</p>
        <p class="panel-fine">Marketed by {BRAND_FULL}, Salem, Tamil Nadu. Manufacturer details are
          printed on every carton.</p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="shell">
    <header class="section-head" data-reveal><h2>Ratings &amp; reviews</h2></header>
    <div class="reviews-empty" data-reveal>
      <h3>No reviews yet</h3>
      <p>{PRODUCT} has just launched. Once customers have used it, their reviews will appear here —
        we will not publish anything we have not actually received.</p>
    </div>
  </div>
</section>

<section class="section">
  <div class="shell faq-wrap">
    <header class="section-head" data-reveal><h2>Questions about {PRODUCT}</h2></header>
    <div class="faq-list">
{faq_items(limit=5)}
    </div>
    <p class="more-link" data-reveal><a href="faq.html">All questions <span aria-hidden="true">&rarr;</span></a></p>
  </div>
</section>
"""


def about():
    addr = "<br />".join(ADDRESS_LINES)
    return f"""
<section class="page-head" data-parallax-root>
  <span class="leaf leaf-c" data-depth="0.14" aria-hidden="true"></span>
  <div class="shell" data-reveal>
    <nav class="crumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><span aria-current="page">About</span></nav>
    <p class="eyebrow">About us</p>
    <h1>{BRAND_FULL}</h1>
    <p class="lead">{TAGLINE} — a small cosmetics house in Salem, Tamil Nadu, building a short
      line of considered everyday skincare.</p>
  </div>
</section>

<section class="section" data-parallax-root>
  <div class="shell split-prose">
    <div data-reveal>
      <h2>Our story</h2>
      <p>{BRAND_FULL} was founded on the idea that good skincare does not need to be loud. Most
        people do not want a ten-step routine. They want two or three things that work, feel
        pleasant to use, and are honest about what is inside.</p>
      <p>{PRODUCT} is where we started: a brightening and nourishing bar built around kojic acid,
        niacinamide, jojoba oil and licorice extract. We chose a soap deliberately — it is the one
        step almost everyone already takes.</p>
      <h2 class="mt">How we work</h2>
      <p>We design and market Kojiba from Salem and have it produced by a third-party
        manufacturer, which is standard practice for cosmetics of this kind. Every carton carries
        the manufacturer's details, the batch number and the licence number, so you can always see
        who made what you are using.</p>
    </div>
    <aside class="fact-card" data-reveal>
      <h3>At a glance</h3>
      <dl>
        <div><dt>Brand</dt><dd>{BRAND_FULL}</dd></div>
        <div><dt>First product</dt><dd>{PRODUCT} — {SUBTITLE}</dd></div>
        <div><dt>Net quantity</dt><dd>{WEIGHT} per bar</dd></div>
        <div><dt>MRP</dt><dd>{money(MRP)} incl. taxes</dd></div>
        <div><dt>Based in</dt><dd>Peramanur, Salem</dd></div>
        <div><dt>Consumer care</dt><dd><a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></dd></div>
      </dl>
      <address>{addr}</address>
    </aside>
  </div>
</section>
{cta_band()}
"""


def faq_page():
    return f"""
<section class="page-head" data-parallax-root>
  <span class="leaf leaf-a" data-depth="0.12" aria-hidden="true"></span>
  <div class="shell" data-reveal>
    <nav class="crumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><span aria-current="page">FAQ</span></nav>
    <p class="eyebrow">Questions</p>
    <h1>Frequently asked</h1>
    <p class="lead">Everything we are asked most often about {PRODUCT} and {BRAND}. If your
      question is not here, write to us — we would rather answer it properly.</p>
  </div>
</section>

<section class="section" data-parallax-root>
  <div class="shell faq-wrap">
    <div class="faq-list">
{faq_items()}
    </div>
    <div class="note-card" data-reveal>
      <h3>Still wondering something?</h3>
      <p>Email <a href="mailto:{EMAIL}">{EMAIL}</a> or message us on WhatsApp and a real person
        will reply.</p>
      <a class="btn btn-primary" href="contact.html">Contact us</a>
    </div>
  </div>
</section>
"""


def contact():
    addr = "<br />".join(ADDRESS_LINES)
    wa = (f'<a class="contact-card" href="{WHATSAPP}" target="_blank" rel="noopener" data-reveal>'
          f'<h3>WhatsApp</h3><strong>Message us</strong><small>Quickest reply</small></a>') if WHATSAPP else ""
    return f"""
<section class="page-head" data-parallax-root>
  <span class="leaf leaf-b" data-depth="0.12" aria-hidden="true"></span>
  <div class="shell" data-reveal>
    <nav class="crumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><span aria-current="page">Contact</span></nav>
    <p class="eyebrow">Get in touch</p>
    <h1>We would love to hear from you</h1>
    <p class="lead">Questions about {PRODUCT}, an order, or stocking us in your store — this all
      reaches the same small team.</p>
  </div>
</section>

<section class="section" data-parallax-root>
  <div class="shell">
    <div class="contact-cards">
      <a class="contact-card" href="tel:{PHONE_TEL}" data-reveal>
        <h3>Consumer care</h3><strong>{PHONE_DISPLAY}</strong><small>As printed on the carton</small>
      </a>
      {wa}
      <a class="contact-card" href="mailto:{EMAIL}" data-reveal>
        <h3>Email</h3><strong>{EMAIL}</strong><small>For orders and enquiries</small>
      </a>
    </div>

    <div class="split-prose mt-xl">
      <div data-reveal>
        <h2>Write to us</h2>
        <form class="enquiry" data-form>
          <div class="field-row">
            <label>Your name<input type="text" name="name" required placeholder="Full name" autocomplete="name" /></label>
            <label>Phone<input type="tel" name="phone" required placeholder="Mobile number" pattern="[0-9+\\s\\-]{{8,16}}" autocomplete="tel" /></label>
          </div>
          <label>Email (optional)<input type="email" name="email" placeholder="you@example.com" autocomplete="email" /></label>
          <label>Message<textarea name="message" rows="4" placeholder="How can we help?"></textarea></label>
          <button class="btn btn-primary btn-block" type="submit">Send</button>
          <p class="form-note" data-note></p>
        </form>
      </div>
      <aside class="fact-card" data-reveal>
        <h3>Auravelle Cosmetics</h3>
        <address>{addr}</address>
        <p class="panel-fine">Marketer of {PRODUCT}. Manufacturer details are printed on every carton.</p>
      </aside>
    </div>
  </div>
</section>
"""


def offline():
    return f"""
<section class="page-head offline-page">
  <div class="shell">
    <p class="eyebrow">No connection</p>
    <h1>You're offline</h1>
    <p class="lead">This page hasn't been saved to your device yet. Anything you've already
      visited will still open, and your bag is kept safely on this device.</p>
    <div class="hero-actions">
      <a class="btn btn-primary btn-lg" href="index.html">Back to home</a>
      <button class="btn btn-ghost btn-lg" type="button" onclick="location.reload()">Try again</button>
    </div>
  </div>
</section>
"""


# ═══════════════════════════════════════════════════════════════════
#  WRITE
# ═══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    pages = [
        build("index.html", f"{BRAND} — {PRODUCT} {SUBTITLE}",
              f"{PRODUCT} by {BRAND_FULL}: a {WEIGHT} brightening and nourishing soap with kojic acid, "
              f"niacinamide, jojoba oil and licorice extract. {money(MRP)} a bar.", home()),
        build("kojiba.html", f"{PRODUCT} {SUBTITLE} — {WEIGHT} | {BRAND}",
              f"Buy {PRODUCT}, a {WEIGHT} brightening and nourishing soap formulated with kojic acid, "
              f"niacinamide, jojoba oil and licorice extract. Single bars and packs.",
              product(), schema=product_schema()),
        build("about.html", f"About {BRAND_FULL} | Salem, Tamil Nadu",
              f"{BRAND_FULL} is a cosmetics house in Salem, Tamil Nadu. {PRODUCT} is our first product.",
              about()),
        build("faq.html", f"FAQ | {PRODUCT} by {BRAND}",
              f"Common questions about {PRODUCT} — how to use it, what is inside, sizes, pricing and delivery.",
              faq_page()),
        build("contact.html", f"Contact {BRAND_FULL}",
              f"Reach {BRAND_FULL} in Salem by phone, WhatsApp or email about {PRODUCT}.",
              contact()),
        build("offline.html", f"Offline | {BRAND}", "You are offline.", offline()),
    ]
    for p in pages:
        print("wrote", p)
    print("\nNOTE:", PLACEHOLDER_NOTICE)
