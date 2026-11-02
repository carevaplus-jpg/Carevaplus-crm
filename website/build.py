#!/usr/bin/env python3
"""
Careva+ website generator.

Every page shares one header, footer and set of contact details, so they are
defined once here and written into each page. Edit this file, then run:

    python3 build.py

...and all the .html files in this folder are rewritten.
"""

import pathlib

OUT = pathlib.Path(__file__).parent

# ─────────────────────────── business details ───────────────────────────
PHONE_DISPLAY = "+91 96555 08881"
PHONE_TEL     = "+919655508881"
WHATSAPP      = "https://wa.me/919655508881"
EMAIL         = "info@carevaplus.com"
ADDRESS_LINES = ["142/3-2 KMS Garden Road", "Alagapuram, Periyapudur", "Salem, Tamil Nadu"]
ADDRESS_ONE   = "142/3-2 KMS Garden Road, Alagapuram, Periyapudur, Salem"
MAPS_LINK     = ("https://www.google.com/maps/search/?api=1&query="
                 "142%2F3-2+KMS+Garden+Road%2C+Alagapuram%2C+Periyapudur%2C+Salem")

NAV = [
    ("index.html",        "Home"),
    ("services.html",     "Services"),
    ("about.html",        "About"),
    ("how-it-works.html", "How it works"),
    ("service-areas.html","Service areas"),
    ("faq.html",          "FAQ"),
    ("contact.html",      "Contact"),
]

# ─────────────────────────── shared chrome ───────────────────────────

def head(title, description, depth_note=""):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content="{description}" />
<meta name="theme-color" content="#06234f" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description}" />
<meta property="og:type" content="website" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="styles.css" />
<link rel="icon" type="image/png" href="assets/favicon.png" />
</head>
<body>

<div class="preloader" id="preloader">
  <div class="preloader-inner">
    <img src="assets/careva-logo.png" alt="Careva+ Home Health Care" />
    <div class="loader-track"><span class="loader-bar"></span></div>
  </div>
</div>

<div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>
<a class="skip-link" href="#main">Skip to content</a>
"""


def header(active):
    links = "\n".join(
        f'      <a href="{href}"{" class=\"active\"" if href == active else ""}>{label}</a>'
        for href, label in NAV
    )
    return f"""
<header class="site-header" id="siteHeader">
  <div class="container header-inner">
    <a href="index.html" class="brand" aria-label="Careva+ Home Health Care — home">
      <img class="brand-logo" src="assets/careva-logo.png" alt="Careva+ Home Health Care" width="1200" height="421" />
    </a>

    <nav class="nav" id="nav" aria-label="Main">
{links}
      <a href="tel:{PHONE_TEL}" class="btn btn-primary btn-sm nav-cta">Call {PHONE_DISPLAY}</a>
    </nav>

    <button class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="nav" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<main id="main">
"""


def page_hero(eyebrow, title, sub, current):
    return f"""
<section class="page-hero">
  <span class="orb orb-1" aria-hidden="true"></span>
  <span class="orb orb-2" aria-hidden="true"></span>
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="index.html">Home</a><span aria-hidden="true">›</span><span aria-current="page">{current}</span>
    </nav>
    <div class="page-hero-copy">
      <p class="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p class="lead">{sub}</p>
    </div>
  </div>
</section>
"""


CTA_BAND = f"""
<section class="cta-band">
  <div class="container cta-band-inner reveal">
    <div>
      <h2>Need care at home in Salem?</h2>
      <p>Speak to a Careva+ care advisor. We answer round the clock and the first assessment is free.</p>
    </div>
    <div class="cta-band-actions">
      <a href="tel:{PHONE_TEL}" class="btn btn-primary btn-lg">Call {PHONE_DISPLAY}</a>
      <a href="{WHATSAPP}" class="btn btn-whatsapp btn-lg" target="_blank" rel="noopener">Chat on WhatsApp</a>
    </div>
  </div>
</section>
"""


def footer():
    addr = "<br />".join(ADDRESS_LINES)
    return f"""
</main>

<footer class="site-footer">
  <div class="container footer-grid">
    <div>
      <a href="index.html" class="brand" aria-label="Careva+ home">
        <img class="footer-logo" src="assets/careva-logo-light.png" alt="Careva+ Home Health Care" />
      </a>
      <p class="footer-blurb">Compassionate, reliable and professional medical support at home across Salem — backed by a smart, AI-assisted care CRM.</p>
    </div>
    <div>
      <h4>Services</h4>
      <ul>
        <li><a href="services.html#nursing">Nursing at home</a></li>
        <li><a href="services.html#elderly">Elderly care</a></li>
        <li><a href="services.html#post-surgery">Post-surgery care</a></li>
        <li><a href="services.html#physiotherapy">Physiotherapy</a></li>
        <li><a href="services.html#equipment">Equipment rental</a></li>
      </ul>
    </div>
    <div>
      <h4>Company</h4>
      <ul>
        <li><a href="about.html">About Careva+</a></li>
        <li><a href="how-it-works.html">How it works</a></li>
        <li><a href="service-areas.html">Service areas</a></li>
        <li><a href="careers.html">Careers</a></li>
        <li><a href="faq.html">FAQ</a></li>
      </ul>
    </div>
    <div>
      <h4>Reach us</h4>
      <ul>
        <li><a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></li>
        <li><a href="{WHATSAPP}" target="_blank" rel="noopener">WhatsApp</a></li>
        <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
        <li class="footer-address">{addr}</li>
      </ul>
    </div>
  </div>
  <div class="container footer-bar">
    <p>© <span id="year">2026</span> Careva+ Home Health Care, Salem. All rights reserved.</p>
    <p class="footer-note">Careva+ provides nursing and caregiving support. It does not replace emergency medical services — in an emergency, call 108.</p>
  </div>
</footer>

<div class="fab-stack">
  <a href="{WHATSAPP}" class="fab fab-wa" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" stroke="none"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.5 14.1c-.2.7-1.3 1.3-1.8 1.3-.5.1-1 .1-1.7-.1a12 12 0 0 1-5.4-4.7c-.4-.6-1-1.5-1-2.9 0-1.3.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.5l-.3.4c-.1.2-.3.3-.1.6.5.9 1 1.5 1.8 2.1.5.4.9.5 1.1.3l.6-.6c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.3.1.2.1.6 0 1.1Z"/></svg>
    <span>WhatsApp</span>
  </a>
  <a href="tel:{PHONE_TEL}" class="fab fab-call" aria-label="Call Careva+">
    <svg viewBox="0 0 24 24" width="20" height="20"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>
    <span>Call now</span>
  </a>
</div>

<script src="script.js"></script>
</body>
</html>
"""


def build(filename, title, description, body, active=None):
    html = head(title, description) + header(active or filename) + body + footer()
    (OUT / filename).write_text(html, encoding="utf-8")
    return filename


# ─────────────────────────── shared blocks ───────────────────────────

ENQUIRY_FORM = """
<form class="contact-form reveal" data-form="full">
  <h3>Request a callback</h3>
  <div class="field-row">
    <label>Your name<input type="text" name="name" required placeholder="Full name" autocomplete="name" /></label>
    <label>Phone<input type="tel" name="phone" required placeholder="Mobile number" pattern="[0-9+\\s\\-]{8,16}" autocomplete="tel" /></label>
  </div>
  <label>Email (optional)<input type="email" name="email" placeholder="you@example.com" autocomplete="email" /></label>
  <div class="field-row">
    <label>Service
      <select name="service">
        <option>Nursing care at home</option>
        <option>Elderly / attendant care</option>
        <option>Post-surgery recovery</option>
        <option>Physiotherapy</option>
        <option>Mother &amp; newborn care</option>
        <option>Palliative / critical care</option>
        <option>Medical equipment rental</option>
      </select>
    </label>
    <label>Duration
      <select name="duration">
        <option>12-hour shift</option>
        <option>24-hour live-in</option>
        <option>Hourly visits</option>
        <option>One-time procedure</option>
      </select>
    </label>
  </div>
  <label>Area in Salem<input type="text" name="area" placeholder="e.g. Alagapuram, Fairlands, Omalur" /></label>
  <label>Tell us about the patient<textarea name="message" rows="4" placeholder="Age, condition, mobility level, any doctor's instructions…"></textarea></label>
  <button class="btn btn-primary btn-block btn-lg" type="submit">Send request</button>
  <p class="form-note" data-note></p>
  <p class="form-disclaimer">This form is a front-end demo — connect it to your CRM or email service to receive live enquiries.</p>
</form>
"""

SERVICES = [
    ("nursing", "Nursing care at home",
     "Injections, IV therapy, catheter &amp; Ryle's tube care, wound dressing and vitals monitoring by qualified GNM/ANM nurses.",
     ["12 &amp; 24-hour shifts", "Doctor-prescribed procedures", "Daily vitals charting"],
     '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="4"/>'),
    ("elderly", "Elderly &amp; attendant care",
     "Compassionate day-to-day support — bathing, grooming, mobility, feeding, medication reminders and companionship.",
     ["Live-in or hourly", "Dementia-aware caregivers", "Male &amp; female attendants"],
     '<path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/>'),
    ("post-surgery", "Post-surgery recovery",
     "Structured recovery at home after orthopaedic, cardiac or abdominal surgery, with infection control and progress tracking.",
     ["Discharge-to-home transition", "Daily progress reports", "Dressing &amp; suture care"],
     '<path d="M3 12h4l2 6 4-14 2 8h6"/>'),
    ("physiotherapy", "Physiotherapy",
     "Goal-based rehabilitation for stroke, joint replacement, back pain and neuro conditions — equipment brought to you.",
     ["Session-wise or monthly", "Measurable mobility goals", "Home exercise plans"],
     '<path d="M4 20v-6M9 20V9M14 20V4M19 20v-9"/>'),
    ("mother-baby", "Mother &amp; newborn care",
     "Trained Japa maids and postnatal nurses supporting feeding, baby hygiene, massage and maternal recovery.",
     ["Night-shift support", "Lactation guidance", "Newborn bathing &amp; massage"],
     '<path d="M20.8 8.6a5 5 0 0 0-8.8-3 5 5 0 0 0-8.8 3c0 5.4 8.8 10.4 8.8 10.4s8.8-5 8.8-10.4Z"/>'),
    ("palliative", "Palliative &amp; critical care",
     "Dignified, pain-managed care for advanced illness, including ventilator and tracheostomy-trained critical care nurses.",
     ["ICU setup at home", "Family counselling", "Pain &amp; symptom management"],
     '<path d="M12 2 3 7v6c0 5 3.8 8.6 9 9 5.2-.4 9-4 9-9V7Z"/><path d="m9 12 2 2 4-4"/>'),
    ("equipment", "Medical equipment rental",
     "Hospital beds, oxygen concentrators, suction machines, monitors, wheelchairs and ventilators — delivered, installed and tested.",
     ["Monthly rental", "Delivery &amp; setup in Salem", "Maintenance included"],
     '<path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"/><path d="M3 18h18M7 10V6h10v4"/>'),
]


def service_cards(limit=None, link_more=True):
    items = SERVICES[:limit] if limit else SERVICES
    out = []
    for slug, name, desc, ticks, icon in items:
        tick_html = "".join(f"<li>{t}</li>" for t in ticks)
        out.append(f"""      <article class="card reveal">
        <span class="card-ico"><svg viewBox="0 0 24 24">{icon}</svg></span>
        <h3>{name}</h3>
        <p>{desc}</p>
        <ul class="tick-list">{tick_html}</ul>
        {'<a class="card-link" href="services.html#' + slug + '">Read more <span aria-hidden="true">→</span></a>' if link_more else ''}
      </article>""")
    return "\n".join(out)


# ─────────────────────────── pages ───────────────────────────

def home():
    return f"""
<section class="hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <span class="orb orb-1" aria-hidden="true"></span>
  <span class="orb orb-2" aria-hidden="true"></span>
  <span class="orb orb-3" aria-hidden="true"></span>
  <div class="container hero-inner">
    <div class="hero-copy hero-anim">
      <p class="eyebrow"><span class="pulse-dot" aria-hidden="true"></span> Serving Salem &amp; nearby · Available 24 / 7</p>
      <h1>Hospital-quality care,<br /><em>in the comfort of home.</em></h1>
      <p class="lead">
        Careva+ brings trained nurses, caretakers and physiotherapists to your doorstep
        across Salem — with personalised care plans, transparent pricing and a care
        manager you can actually reach.
      </p>
      <div class="hero-actions">
        <a href="tel:{PHONE_TEL}" class="btn btn-primary btn-lg">Call {PHONE_DISPLAY}</a>
        <a href="services.html" class="btn btn-navy btn-lg">Explore services</a>
      </div>
      <ul class="hero-trust">
        <li><svg class="ico" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg> Background-verified caregivers</li>
        <li><svg class="ico" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg> Replacement guarantee</li>
        <li><svg class="ico" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg> No hidden charges</li>
      </ul>
    </div>

    <aside class="hero-card" aria-label="Quick enquiry">
      <h2 class="hero-card-title">Talk to a care advisor</h2>
      <p class="hero-card-sub">Tell us what you need. We respond within 30 minutes.</p>
      <form class="quick-form" data-form="quick">
        <label>Full name<input type="text" name="name" required placeholder="e.g. Anita Sharma" autocomplete="name" /></label>
        <label>Phone number<input type="tel" name="phone" required placeholder="10-digit mobile number" pattern="[0-9+\\s\\-]{{8,16}}" autocomplete="tel" /></label>
        <label>Care needed
          <select name="service">
            <option>Nursing care at home</option>
            <option>Elderly / attendant care</option>
            <option>Post-surgery recovery</option>
            <option>Physiotherapy</option>
            <option>Mother &amp; newborn care</option>
            <option>Not sure — please advise</option>
          </select>
        </label>
        <button class="btn btn-primary btn-block" type="submit">Get a callback</button>
        <p class="form-note" data-note></p>
      </form>
    </aside>
  </div>

  <div class="stats-strip">
    <div class="container stats-grid">
      <div class="stat reveal"><span class="stat-num" data-count="24">0</span><span class="stat-suffix">/7</span><p>Care availability</p></div>
      <div class="stat reveal"><span class="stat-num" data-count="30">0</span><span class="stat-suffix">min</span><p>Average response time</p></div>
      <div class="stat reveal"><span class="stat-num" data-count="100">0</span><span class="stat-suffix">%</span><p>Verified caregivers</p></div>
      <div class="stat reveal"><span class="stat-num" data-count="7">0</span><span class="stat-suffix">days</span><p>From enquiry to placement</p></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <header class="section-head reveal">
      <p class="eyebrow">What we do</p>
      <h2>Complete home health care, under one roof</h2>
      <p class="section-sub">Every plan is built around the patient — their condition, their routine and their family.</p>
    </header>
    <div class="cards">
{service_cards(limit=6)}
    </div>
    <p class="section-more reveal"><a href="services.html" class="btn btn-ghost">See all services <span aria-hidden="true">→</span></a></p>
  </div>
</section>

<section class="section section-alt">
  <div class="container why-grid">
    <div class="reveal">
      <p class="eyebrow">Why families choose us</p>
      <h2>Care you can verify, not just trust</h2>
      <p class="section-sub">Home care goes wrong when it is unsupervised. Careva+ is built so you always know who is in your home, what was done, and who to call.</p>
      <div class="why-list">
        <div class="why-item"><span class="why-num">01</span><div><h3>Verified, trained professionals</h3><p>Police verification, certificate checks and a practical skills assessment before anyone is assigned to a family.</p></div></div>
        <div class="why-item"><span class="why-num">02</span><div><h3>A dedicated care manager</h3><p>One named point of contact who knows your case — not a new voice on every call.</p></div></div>
        <div class="why-item"><span class="why-num">03</span><div><h3>Documented daily reporting</h3><p>Vitals, medication and activity logged every shift, so the family and the doctor see the same record.</p></div></div>
        <div class="why-item"><span class="why-num">04</span><div><h3>Fast, guaranteed replacement</h3><p>If a caregiver is unwell or isn't the right fit, we replace them — without restarting your billing cycle.</p></div></div>
      </div>
      <p class="section-more"><a href="about.html" class="btn btn-ghost">More about Careva+ <span aria-hidden="true">→</span></a></p>
    </div>

    <aside class="pledge-card reveal">
      <h3>Our care standards</h3>
      <p class="pledge-intro">Every Careva+ engagement is held to the same written commitments:</p>
      <ul class="pledge-list">
        <li><strong>Consent first.</strong> No procedure without the patient's or family's informed approval.</li>
        <li><strong>Dignity always.</strong> Privacy, modesty and personal preference are non-negotiable.</li>
        <li><strong>Clinical boundaries.</strong> Our staff follow the treating doctor's plan and never prescribe.</li>
        <li><strong>Transparent billing.</strong> Rates agreed in writing before service begins.</li>
        <li><strong>Escalation path.</strong> A supervisor reachable within 15 minutes, any hour.</li>
      </ul>
      <a href="contact.html" class="btn btn-primary btn-block">Discuss your requirement</a>
    </aside>
  </div>
</section>

<section class="section">
  <div class="container">
    <header class="section-head reveal">
      <p class="eyebrow">How it works</p>
      <h2>Care arranged in four clear steps</h2>
    </header>
    <ol class="steps">
      <li class="step reveal"><span class="step-num">1</span><h3>Share the need</h3><p>Call us or submit the form. We listen to the diagnosis, routine and family situation.</p></li>
      <li class="step reveal"><span class="step-num">2</span><h3>Free assessment</h3><p>A nurse supervisor assesses the patient — at home or over video — and drafts a care plan.</p></li>
      <li class="step reveal"><span class="step-num">3</span><h3>Matched caregiver</h3><p>We assign a professional matched to the condition, language and shift you need.</p></li>
      <li class="step reveal"><span class="step-num">4</span><h3>Ongoing supervision</h3><p>Scheduled supervisor visits, daily digital reports and a care manager on call.</p></li>
    </ol>
    <p class="section-more reveal"><a href="how-it-works.html" class="btn btn-ghost">See the full process <span aria-hidden="true">→</span></a></p>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <header class="section-head reveal">
      <p class="eyebrow">Where we work</p>
      <h2>Home care across Salem</h2>
      <p class="section-sub">Our team operates from Alagapuram and reaches homes across Salem city and the surrounding towns.</p>
    </header>
    <div class="chips reveal">
      <span class="chip">Alagapuram</span><span class="chip">Fairlands</span><span class="chip">Hasthampatti</span>
      <span class="chip">Ammapet</span><span class="chip">Suramangalam</span><span class="chip">Shevapet</span>
      <span class="chip">Gugai</span><span class="chip">Kondalampatti</span><span class="chip">Omalur</span>
      <span class="chip">Attur</span><span class="chip">Mettur</span><span class="chip">Yercaud</span>
    </div>
    <p class="section-more reveal"><a href="service-areas.html" class="btn btn-ghost">Check your area <span aria-hidden="true">→</span></a></p>
  </div>
</section>
{CTA_BAND}
"""


def services_page():
    blocks = []
    for i, (slug, name, desc, ticks, icon) in enumerate(SERVICES):
        tick_html = "".join(f"<li>{t}</li>" for t in ticks)
        blocks.append(f"""  <article class="detail-row reveal{' detail-alt' if i % 2 else ''}" id="{slug}">
    <div class="detail-visual" aria-hidden="true">
      <span class="detail-ico"><svg viewBox="0 0 24 24">{icon}</svg></span>
      <span class="detail-index">{i + 1:02d}</span>
    </div>
    <div class="detail-body">
      <h2>{name}</h2>
      <p>{desc}</p>
      <ul class="tick-list">{tick_html}</ul>
      <div class="detail-actions">
        <a href="tel:{PHONE_TEL}" class="btn btn-primary btn-sm">Enquire about this</a>
        <a href="contact.html" class="btn btn-ghost btn-sm">Request a callback</a>
      </div>
    </div>
  </article>""")
    return (page_hero("Our services", "Everything we provide, in detail",
                      "From a one-time injection at home to round-the-clock critical care — "
                      "each service is delivered by trained staff and supervised by a nurse manager.",
                      "Services")
            + '\n<section class="section"><div class="container detail-list">\n'
            + "\n".join(blocks) + "\n</div></section>\n" + CTA_BAND)


def about_page():
    return page_hero("About us", "Care that treats the family as part of the plan",
                     "Careva+ is a Salem-based home health care service. We place trained nurses and "
                     "caregivers in homes, supervise them properly, and keep families informed.",
                     "About") + f"""
<section class="section">
  <div class="container split">
    <div class="reveal">
      <h2>Who we are</h2>
      <p>Careva+ was built around a simple observation: most families in Salem do not struggle to find a caregiver — they struggle to know whether that caregiver is trained, supervised and doing what the doctor asked.</p>
      <p>We operate from Alagapuram and serve Salem city and the surrounding towns. Our staff are recruited for clinical skill and for temperament, because both matter at a bedside. Every placement is backed by a nurse supervisor, written care standards and a named care manager the family can call.</p>
      <p>Behind the scenes we run an AI-assisted care CRM, so enquiries are answered quickly, follow-ups are not forgotten and every shift is documented.</p>
    </div>
    <aside class="info-card reveal">
      <h3>At a glance</h3>
      <dl class="facts">
        <div><dt>Based in</dt><dd>Alagapuram, Salem</dd></div>
        <div><dt>Serving</dt><dd>Salem city &amp; nearby towns</dd></div>
        <div><dt>Availability</dt><dd>24 / 7, including holidays</dd></div>
        <div><dt>Staff</dt><dd>Nurses, attendants, physiotherapists</dd></div>
        <div><dt>Helpline</dt><dd><a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a></dd></div>
      </dl>
    </aside>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <header class="section-head reveal">
      <p class="eyebrow">What drives us</p>
      <h2>Our mission and values</h2>
    </header>
    <div class="value-grid">
      <article class="value-card reveal"><h3>Our mission</h3><p>To make professional, supervised medical care at home the normal choice for families in Salem — not a last resort.</p></article>
      <article class="value-card reveal"><h3>Our promise</h3><p>Every caregiver we send is verified, trained and accountable to a supervisor. If that ever fails, we fix it at our cost.</p></article>
      <article class="value-card reveal"><h3>Dignity</h3><p>Patients are people first. Privacy, modesty and personal preference guide every shift, not just the clinical tasks.</p></article>
      <article class="value-card reveal"><h3>Transparency</h3><p>Written rates before service begins, documented daily reporting, and a care manager who answers the phone.</p></article>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <header class="section-head reveal">
      <p class="eyebrow">Our people</p>
      <h2>The team behind every care plan</h2>
      <p class="section-sub">Careva+ staff are recruited for clinical skill and for temperament — because both matter at a bedside.</p>
    </header>
    <div class="team-grid">
      <article class="team-card reveal"><span class="team-ico">RN</span><h3>Registered nurses</h3><p>GNM and B.Sc. qualified, trained in home-setting protocols and emergency response.</p></article>
      <article class="team-card reveal"><span class="team-ico">PT</span><h3>Physiotherapists</h3><p>Licensed therapists specialising in neuro, ortho and geriatric rehabilitation.</p></article>
      <article class="team-card reveal"><span class="team-ico">CA</span><h3>Care attendants</h3><p>Certified caregivers for daily living support, mobility and companionship.</p></article>
      <article class="team-card reveal"><span class="team-ico">CM</span><h3>Care managers</h3><p>Your single point of contact, coordinating staff, doctors and family updates.</p></article>
    </div>
    <p class="section-more reveal"><a href="careers.html" class="btn btn-ghost">Work with us <span aria-hidden="true">→</span></a></p>
  </div>
</section>
{CTA_BAND}
"""


def how_page():
    return page_hero("How it works", "From your first call to ongoing care",
                     "A clear, supervised process — so you always know what happens next, who is "
                     "coming and what it costs.",
                     "How it works") + f"""
<section class="section">
  <div class="container">
    <ol class="timeline">
      <li class="tl-item reveal"><span class="tl-dot">1</span><div><h3>Share the need</h3><p>Call {PHONE_DISPLAY}, message us on WhatsApp or submit the enquiry form. A care advisor listens to the diagnosis, the daily routine and the family's situation — no obligation.</p><p class="tl-meta">Takes 10 minutes · Any hour</p></div></li>
      <li class="tl-item reveal"><span class="tl-dot">2</span><div><h3>Free assessment</h3><p>A nurse supervisor assesses the patient at home, or over a video call if you prefer. We check mobility, medication, wounds, feeding and risk of falls, then draft a written care plan.</p><p class="tl-meta">Free · Usually within 24 hours</p></div></li>
      <li class="tl-item reveal"><span class="tl-dot">3</span><div><h3>Written quotation</h3><p>You receive the care plan and the rate in writing before anything begins — shift length, duties, duration and cost. No hidden charges and no surprise add-ons.</p><p class="tl-meta">Agreed before service starts</p></div></li>
      <li class="tl-item reveal"><span class="tl-dot">4</span><div><h3>Matched caregiver</h3><p>We assign a professional matched to the condition, the language spoken at home and the shift you need. You are told who is coming, with their qualification and verification status.</p><p class="tl-meta">Most placements within 24–48 hours</p></div></li>
      <li class="tl-item reveal"><span class="tl-dot">5</span><div><h3>Ongoing supervision</h3><p>Scheduled supervisor visits, daily digital reports of vitals and activity, and a named care manager on call. If a caregiver is unwell or isn't the right fit, we replace them without restarting your billing cycle.</p><p class="tl-meta">For as long as care continues</p></div></li>
    </ol>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <header class="section-head reveal">
      <p class="eyebrow">Be prepared</p>
      <h2>What to keep ready for the assessment</h2>
      <p class="section-sub">None of this is mandatory — it simply makes the first visit faster and more accurate.</p>
    </header>
    <div class="cards">
      <article class="card reveal"><h3>Discharge summary</h3><p>If the patient has recently been in hospital, the discharge summary tells our nurse exactly what care was prescribed.</p></article>
      <article class="card reveal"><h3>Current prescriptions</h3><p>A list or photo of ongoing medicines, doses and timings, so medication support starts correctly from day one.</p></article>
      <article class="card reveal"><h3>Daily routine</h3><p>Waking, meals, bathing, physiotherapy and sleep times — we build the shift around the patient's existing rhythm.</p></article>
      <article class="card reveal"><h3>Language preference</h3><p>Tamil, English or another language at home. We match caregivers so the patient can communicate comfortably.</p></article>
      <article class="card reveal"><h3>Home access</h3><p>Stairs, lift, room layout and bathroom access, which decide equipment needs and fall-prevention steps.</p></article>
      <article class="card reveal"><h3>Family contact</h3><p>One person we should report to daily, plus an emergency contact if they are unreachable.</p></article>
    </div>
  </div>
</section>
{CTA_BAND}
"""


def areas_page():
    city = ["Alagapuram", "Periyapudur", "Fairlands", "Hasthampatti", "Ammapet", "Suramangalam",
            "Shevapet", "Gugai", "Kondalampatti", "Narasothipatti", "Seelanaickenpatti",
            "Astampatti", "Maravaneri", "New Fairlands", "Four Roads", "Junction"]
    towns = ["Omalur", "Attur", "Mettur", "Edappadi", "Sankagiri", "Valapady", "Yercaud",
             "Tharamangalam", "Ayothiyapattinam", "Vazhapadi", "Panamarathupatti", "Veerapandi"]
    chip = lambda xs: "".join(f'<span class="chip">{x}</span>' for x in xs)
    return page_hero("Service areas", "Home care across Salem and nearby towns",
                     "Our office is in Alagapuram, Salem. Our nurses and attendants travel across "
                     "the city and to the surrounding towns every day.",
                     "Service areas") + f"""
<section class="section">
  <div class="container">
    <div class="area-block reveal">
      <h2>Salem city</h2>
      <p class="section-sub">Same-day visits are usually possible anywhere in the city.</p>
      <div class="chips">{chip(city)}</div>
    </div>
    <div class="area-block reveal">
      <h2>Nearby towns</h2>
      <p class="section-sub">Covered daily, with travel time factored into the shift plan.</p>
      <div class="chips">{chip(towns)}</div>
    </div>
    <div class="note-card reveal">
      <h3>Don't see your area?</h3>
      <p>This list is not exhaustive. If you are anywhere in or around Salem district, call us on <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> — we will tell you honestly whether we can staff your location, and how soon.</p>
      <a href="{WHATSAPP}" class="btn btn-whatsapp" target="_blank" rel="noopener">Ask on WhatsApp</a>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container split">
    <div class="reveal">
      <h2>Visit our office</h2>
      <p>You are welcome to come and meet the team before deciding. Our coordinators can walk you through care plans, rates and the verification process in person.</p>
      <address class="address-block">
        {"<br />".join(ADDRESS_LINES)}
      </address>
      <div class="detail-actions">
        <a href="{MAPS_LINK}" class="btn btn-primary" target="_blank" rel="noopener">Get directions</a>
        <a href="tel:{PHONE_TEL}" class="btn btn-ghost">Call before visiting</a>
      </div>
    </div>
    <aside class="info-card reveal">
      <h3>Coverage at a glance</h3>
      <dl class="facts">
        <div><dt>Base</dt><dd>Alagapuram, Salem</dd></div>
        <div><dt>City visits</dt><dd>Usually same day</dd></div>
        <div><dt>Nearby towns</dt><dd>Daily coverage</dd></div>
        <div><dt>Live-in staff</dt><dd>Anywhere we serve</dd></div>
        <div><dt>Emergency</dt><dd>Call 108 first, then us</dd></div>
      </dl>
    </aside>
  </div>
</section>
{CTA_BAND}
"""


def careers_page():
    return page_hero("Careers", "Join the Careva+ care team in Salem",
                     "We are regularly hiring nurses, care attendants and physiotherapists who want "
                     "steady work, fair pay and proper supervision.",
                     "Careers") + f"""
<section class="section">
  <div class="container">
    <header class="section-head reveal">
      <p class="eyebrow">Open roles</p>
      <h2>Who we are looking for</h2>
    </header>
    <div class="cards">
      <article class="card reveal"><h3>Registered nurses (GNM / B.Sc.)</h3><p>For home nursing shifts across Salem — injections, wound care, catheter and Ryle's tube care, vitals monitoring.</p><ul class="tick-list"><li>Valid qualification certificate</li><li>12 or 24-hour shifts</li></ul></article>
      <article class="card reveal"><h3>Care attendants</h3><p>Daily living support for elderly and bed-bound patients: bathing, feeding, mobility and companionship.</p><ul class="tick-list"><li>Experience preferred, training given</li><li>Male &amp; female roles</li></ul></article>
      <article class="card reveal"><h3>Physiotherapists</h3><p>Home visits for stroke, orthopaedic and geriatric rehabilitation, with session-wise or monthly schedules.</p><ul class="tick-list"><li>BPT qualified</li><li>Flexible visit hours</li></ul></article>
      <article class="card reveal"><h3>Japa maids &amp; postnatal carers</h3><p>Supporting new mothers and newborns with feeding, hygiene, massage and night care.</p><ul class="tick-list"><li>Experience with newborns</li><li>Live-in and day shifts</li></ul></article>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container split">
    <div class="reveal">
      <h2>What we offer</h2>
      <ul class="tick-list big">
        <li>Steady placements, not one-off gigs</li>
        <li>Pay agreed in writing before a placement begins</li>
        <li>A supervisor you can call during any shift</li>
        <li>Training in home-setting protocols and emergency response</li>
        <li>Work close to home, across Salem and nearby towns</li>
      </ul>
      <h2 class="mt">How to apply</h2>
      <p>Call or send a WhatsApp message with your name, qualification and the area you live in. Our coordinator will arrange a short interview and a practical skills check.</p>
      <div class="detail-actions">
        <a href="tel:{PHONE_TEL}" class="btn btn-primary">Call {PHONE_DISPLAY}</a>
        <a href="{WHATSAPP}" class="btn btn-whatsapp" target="_blank" rel="noopener">Apply on WhatsApp</a>
      </div>
    </div>
    <aside class="info-card reveal">
      <h3>Before you apply</h3>
      <p class="pledge-intro">Please keep these ready — it speeds up the process considerably.</p>
      <ul class="tick-list">
        <li>Qualification certificate</li>
        <li>Aadhaar / ID proof</li>
        <li>Address proof</li>
        <li>Two references, if available</li>
        <li>Details of previous experience</li>
      </ul>
      <p class="form-disclaimer">Every Careva+ caregiver goes through identity verification and a practical skills assessment before their first placement.</p>
    </aside>
  </div>
</section>
{CTA_BAND}
"""


FAQS = [
    ("How quickly can a caregiver start?",
     "For most attendant and nursing requests we can place a professional within 24 to 48 hours of the assessment. Specialised critical-care placements may take a little longer."),
    ("Are your caregivers background verified?",
     "Yes. Every caregiver goes through identity and address verification, certificate validation, a reference check and a practical skills assessment before assignment."),
    ("Can we change the caregiver if it isn't working out?",
     "Absolutely. Tell your care manager and we arrange a replacement — your billing cycle continues uninterrupted rather than restarting."),
    ("Do you provide medical equipment at home?",
     "We arrange hospital beds, oxygen concentrators, suction machines, monitors, wheelchairs and ventilator support on rental, delivered, set up and tested by our team."),
    ("How is pricing decided?",
     "Pricing depends on the level of care, shift length and duration. You receive a written quotation after the free assessment — there are no hidden charges or surprise add-ons."),
    ("Do you coordinate with our existing doctor?",
     "Yes. Our nurses follow the treating doctor's prescription and share daily reports so your doctor can adjust the plan with real data."),
    ("Which areas around Salem do you cover?",
     "Salem city and the surrounding towns including Omalur, Attur, Mettur, Edappadi, Sankagiri, Valapady and Yercaud. If you are unsure, call us and we will tell you honestly whether we can staff your location."),
    ("Is the first assessment really free?",
     "Yes. A nurse supervisor assesses the patient at home or over video and drafts a care plan at no cost, with no obligation to proceed."),
    ("Can you arrange care at short notice or at night?",
     "We operate 24/7 and take calls at any hour. Night shifts and urgent placements are common — call the helpline and we will tell you what is realistically possible."),
    ("What happens in a medical emergency?",
     "Call 108 immediately for an ambulance. Our caregivers are trained in first response and will stabilise and assist until help arrives, then inform the family and the supervisor."),
]


def faq_page():
    items = "\n".join(
        f'      <details class="faq reveal"><summary>{q}</summary><div class="faq-body"><p>{a}</p></div></details>'
        for q, a in FAQS)
    return page_hero("FAQ", "Frequently asked questions",
                     "The things families ask us most often, answered plainly. If your question "
                     "isn't here, just call — we would rather tell you honestly.",
                     "FAQ") + f"""
<section class="section">
  <div class="container faq-wrap">
    <div class="faq-list">
{items}
    </div>
    <div class="note-card reveal">
      <h3>Still have a question?</h3>
      <p>Call <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> any time, or send us a message and a care advisor will get back to you.</p>
      <a href="contact.html" class="btn btn-primary">Contact us</a>
    </div>
  </div>
</section>
{CTA_BAND}
"""


def contact_page():
    addr = "<br />".join(ADDRESS_LINES)
    return page_hero("Contact", "Let's build the right care plan",
                     "Call us, message us on WhatsApp, or send the form below and a care advisor "
                     "will call you back. We answer round the clock.",
                     "Contact") + f"""
<section class="section">
  <div class="container">
    <div class="contact-cards">
      <a class="contact-card reveal" href="tel:{PHONE_TEL}">
        <span class="contact-ico"><svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg></span>
        <h3>Care helpline</h3><strong>{PHONE_DISPLAY}</strong><small>Available 24 / 7</small>
      </a>
      <a class="contact-card reveal" href="{WHATSAPP}" target="_blank" rel="noopener">
        <span class="contact-ico wa"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.5 14.1c-.2.7-1.3 1.3-1.8 1.3-.5.1-1 .1-1.7-.1a12 12 0 0 1-5.4-4.7c-.4-.6-1-1.5-1-2.9 0-1.3.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2 0 .4-.1.5l-.3.4c-.1.2-.3.3-.1.6.5.9 1 1.5 1.8 2.1.5.4.9.5 1.1.3l.6-.6c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.3.1.2.1.6 0 1.1Z"/></svg></span>
        <h3>WhatsApp</h3><strong>Message us</strong><small>Quickest for photos &amp; reports</small>
      </a>
      <a class="contact-card reveal" href="mailto:{EMAIL}">
        <span class="contact-ico"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg></span>
        <h3>Email</h3><strong>{EMAIL}</strong><small>For documents &amp; enquiries</small>
      </a>
      <a class="contact-card reveal" href="{MAPS_LINK}" target="_blank" rel="noopener">
        <span class="contact-ico"><svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
        <h3>Office</h3><strong>Alagapuram, Salem</strong><small>Get directions</small>
      </a>
    </div>
  </div>
</section>

<section class="section section-contact">
  <div class="container contact-grid">
    <div class="reveal">
      <p class="eyebrow light">Visit or write to us</p>
      <h2>Careva+ Home Health Care</h2>
      <address class="address-block light">{addr}</address>
      <ul class="contact-points">
        <li><span class="contact-ico"><svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg></span><div><strong>Helpline</strong><a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a><small>24 hours, every day</small></div></li>
        <li><span class="contact-ico"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg></span><div><strong>Email</strong><a href="mailto:{EMAIL}">{EMAIL}</a></div></li>
        <li><span class="contact-ico"><svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span><div><strong>Service area</strong><span>Salem city &amp; nearby towns</span><small><a href="service-areas.html">See the full list</a></small></div></li>
      </ul>
      <a href="{MAPS_LINK}" class="btn btn-primary" target="_blank" rel="noopener">Open in Google Maps</a>
    </div>
{ENQUIRY_FORM}
  </div>
</section>
"""


# ─────────────────────────── write ───────────────────────────
if __name__ == "__main__":
    S = "Careva+ Home Health Care, Salem"
    pages = [
        build("index.html", f"{S} | Nursing &amp; Caregiving at Home",
              "Careva+ provides trained nurses, care attendants and physiotherapists at home across Salem. 24/7 helpline, verified staff, free assessment.", home()),
        build("services.html", f"Services | {S}",
              "Home nursing, elderly care, post-surgery recovery, physiotherapy, newborn care, palliative care and medical equipment rental across Salem.", services_page()),
        build("about.html", f"About Us | {S}",
              "Careva+ is a Salem-based home health care service placing verified, supervised nurses and caregivers in homes across the district.", about_page()),
        build("how-it-works.html", f"How It Works | {S}",
              "From your first call to ongoing supervised care — the Careva+ process, including the free home assessment and written quotation.", how_page()),
        build("service-areas.html", f"Service Areas | {S}",
              "Careva+ serves Salem city and nearby towns including Omalur, Attur, Mettur, Edappadi, Sankagiri, Valapady and Yercaud.", areas_page()),
        build("careers.html", f"Careers | {S}",
              "Careva+ is hiring nurses, care attendants, physiotherapists and postnatal carers in Salem. Steady placements, fair pay, proper supervision.", careers_page(), active="careers.html"),
        build("faq.html", f"FAQ | {S}",
              "Answers to common questions about home nursing in Salem — pricing, verification, equipment, timelines and emergencies.", faq_page()),
        build("contact.html", f"Contact | {S}",
              f"Call {PHONE_DISPLAY} or visit Careva+ at {ADDRESS_ONE}. Available 24/7 for home nursing enquiries across Salem.", contact_page()),
    ]
    for p in pages:
        print("wrote", p)
