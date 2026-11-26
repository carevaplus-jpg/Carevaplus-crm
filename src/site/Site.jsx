import React, { useEffect, useState } from "react";
import {
  AREAS,
  CAREGIVERS,
  CONTACT,
  FAQS,
  REVIEWS,
  SERVICES,
  STATS,
  STEPS,
  waLink,
} from "./data";

const NAV = [
  { href: "#services", label: "Services" },
  { href: "#process", label: "How care starts" },
  { href: "#caregivers", label: "Caregivers" },
  { href: "#reviews", label: "Reviews" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

/* ---------- icons (inline, decorative) ---------- */
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      fill="currentColor"
      d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z"
    />
  </svg>
);
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"
    />
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className="check">
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m4.5 10.5 3.5 3.5 7.5-8"
    />
  </svg>
);

/* ---------- header ---------- */
function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <div className="topbar">
        <div className="wrap topbar-inner">
          <p>Home healthcare across Salem and nearby areas</p>
          <p className="topbar-right">
            <span className="live-dot" aria-hidden="true" />
            Nurse desk open 24/7
            <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a>
          </p>
        </div>
      </div>
      <header className={`header${scrolled ? " is-scrolled" : ""}`}>
        <div className="wrap header-inner">
          <a href="#top" className="brand" aria-label="Careva+ home">
            <img src="/images/logo.webp" alt="Careva+" width="160" height="56" />
          </a>
          <nav id="main-nav" className={`nav${open ? " is-open" : ""}`} aria-label="Main">
            <ul>
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} onClick={() => setOpen(false)}>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="nav-mobile-actions">
              <a className="btn btn-primary" href="#book" onClick={() => setOpen(false)}>
                Book care
              </a>
              <a className="btn btn-ghost" href={CONTACT.phoneHref}>
                <PhoneIcon /> Call {CONTACT.phoneDisplay}
              </a>
            </div>
          </nav>
          <div className="header-actions">
            <a className="header-call" href={CONTACT.phoneHref}>
              <PhoneIcon />
              <span>{CONTACT.phoneDisplay}</span>
            </a>
            <a className="btn btn-primary btn-sm" href="#book">
              Book care
            </a>
            <button
              className="menu-toggle"
              aria-expanded={open}
              aria-controls="main-nav"
              onClick={() => setOpen((o) => !o)}
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <span className="bars" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

/* ---------- hero ---------- */
function CallbackCard() {
  const [form, setForm] = useState({ name: "", phone: "", service: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Enter the name we should ask for.");
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10)))
      return setError("Enter a 10-digit mobile number.");
    setError("");
    const msg = `Hello Careva+, please call me back.\nName: ${form.name}\nPhone: ${form.phone}\nService: ${
      form.service || "Not sure yet"
    }`;
    window.open(waLink(msg), "_blank", "noopener");
    setSent(true);
  };

  if (sent) {
    return (
      <div className="callback" role="status">
        <h2 className="callback-title">Request sent</h2>
        <p className="callback-note">
          Our nurse desk will call {form.name.split(" ")[0]} back on {form.phone} within 15 minutes.
        </p>
        <button className="link-btn" onClick={() => setSent(false)}>
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form className="callback" onSubmit={submit} noValidate>
      <h2 className="callback-title">Get a call back in 15 minutes</h2>
      <p className="callback-note">A senior nurse will help you choose the right care.</p>
      <label className="field">
        <span>Your name</span>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          autoComplete="name"
        />
      </label>
      <label className="field">
        <span>Mobile number</span>
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          inputMode="tel"
          autoComplete="tel"
          placeholder="98xxx xxxxx"
        />
      </label>
      <label className="field">
        <span>Care needed</span>
        <select
          value={form.service}
          onChange={(e) => setForm({ ...form, service: e.target.value })}
        >
          <option value="">Not sure yet</option>
          {SERVICES.map((s) => (
            <option key={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-block" type="submit">
        Request a call back
      </button>
      <p className="callback-alt">
        Urgent? <a href={CONTACT.phoneHref}>Call {CONTACT.phoneDisplay}</a>
      </p>
    </form>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="hero-tamil" lang="ta">
            வீட்டிலேயே மருத்துவப் பராமரிப்பு
          </p>
          <h1 className="hero-title">Hospital-grade care, in the home you know.</h1>
          <p className="hero-lede">
            Verified nurses, caregivers and physiotherapists for families across Salem. You book
            in minutes, care starts within hours, and our nurse desk answers day and night.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary btn-lg" href="#book">
              Book care at home
            </a>
            <a className="btn btn-ghost btn-lg" href={waLink("Hello Careva+, I need home healthcare. Please guide me.")} target="_blank" rel="noopener">
              <WhatsAppIcon /> Chat on WhatsApp
            </a>
          </div>
          <ul className="hero-proof">
            <li>
              <strong>5.0</strong> on Google
            </li>
            <li>
              <strong>500+</strong> Salem families
            </li>
            <li>
              <strong>100+</strong> verified staff
            </li>
          </ul>
        </div>
        <div className="hero-media">
          <img
            src="/images/hero.webp"
            alt="A Careva+ nurse holding hands with an elderly patient at home"
            width="1200"
            height="1160"
            fetchpriority="high"
          />
          <CallbackCard />
        </div>
      </div>
    </section>
  );
}

/* ---------- stats ---------- */
function Stats() {
  return (
    <section className="stats" aria-label="Careva+ in numbers">
      <div className="wrap">
        <dl className="stats-row">
          {STATS.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ---------- services index ---------- */
function Services() {
  const [active, setActive] = useState(SERVICES[0].id);
  const s = SERVICES.find((x) => x.id === active);

  return (
    <section className="section services" id="services">
      <div className="wrap">
        <div className="section-head">
          <h2 className="h2">Care for every stage of recovery and age</h2>
          <p className="lede">
            Ten home healthcare services, each run by staff trained for that kind of care. Choose
            one to see what's included.
          </p>
        </div>

        <div className="svc">
          <div className="svc-list" role="tablist" aria-label="Services" aria-orientation="vertical">
            {SERVICES.map((x) => (
              <button
                key={x.id}
                role="tab"
                id={`tab-${x.id}`}
                aria-selected={x.id === active}
                aria-controls="svc-panel"
                className="svc-tab"
                onClick={() => setActive(x.id)}
              >
                {x.name}
              </button>
            ))}
          </div>

          <div
            className="svc-panel"
            id="svc-panel"
            role="tabpanel"
            aria-labelledby={`tab-${s.id}`}
            key={s.id}
          >
            {s.image ? (
              <img className="svc-img" src={s.image} alt="" width="900" height="620" loading="lazy" />
            ) : (
              <div className="svc-img svc-img-blank" aria-hidden="true">
                <span>{s.name}</span>
              </div>
            )}
            <div className="svc-body">
              <h3 className="h3">{s.name}</h3>
              <p>{s.summary}</p>
              <ul className="ticks">
                {s.includes.map((i) => (
                  <li key={i}>
                    <Check />
                    {i}
                  </li>
                ))}
              </ul>
              <div className="svc-actions">
                <a
                  className="btn btn-primary"
                  href="#book"
                  onClick={() => window.dispatchEvent(new CustomEvent("cv:service", { detail: s.name }))}
                >
                  Book {s.name.toLowerCase()}
                </a>
                <a
                  className="link"
                  href={waLink(`Hello Careva+, I'd like to know more about ${s.name}.`)}
                  target="_blank"
                  rel="noopener"
                >
                  Ask about pricing on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- standard of care ---------- */
function Standard() {
  const points = [
    {
      t: "Verified before every placement",
      d: "Background checks, qualification checks and training for every nurse and caregiver.",
    },
    {
      t: "Supervised by senior nurses",
      d: "Each patient has a supervisor who reviews the care plan and checks in with the family.",
    },
    {
      t: "Matched by skill and language",
      d: "Tamil, English, Kannada, Telugu, Malayalam and Hindi-speaking staff.",
    },
    {
      t: "Clear pricing before care starts",
      d: "Hourly, daily and round-the-clock packages, quoted before care begins.",
    },
  ];
  return (
    <section className="section standard">
      <div className="wrap standard-grid">
        <div>
          <h2 className="h2">The standard we hold ourselves to</h2>
          <p className="lede">
            Bringing care home should never mean lowering the standard. We run every placement the
            way a good hospital ward is run: trained staff, a written plan, and someone senior
            accountable for it.
          </p>
        </div>
        <ul className="standard-list">
          {points.map((p) => (
            <li key={p.t}>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- process ---------- */
function Process() {
  return (
    <section className="section process" id="process">
      <div className="wrap">
        <div className="section-head">
          <h2 className="h2">From first call to care at home</h2>
          <p className="lede">Most families have a caregiver at home within hours of calling us.</p>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-n">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- caregivers ---------- */
function Caregivers() {
  return (
    <section className="section caregivers" id="caregivers">
      <div className="wrap">
        <div className="section-head">
          <h2 className="h2">Some of the people who may care for your family</h2>
          <p className="lede">
            Every Careva+ nurse and caregiver is verified, trained and supervised.
          </p>
        </div>
        <ul className="people">
          {CAREGIVERS.map((c) => (
            <li key={c.name} className="person">
              <img src={c.image} alt={`Portrait of ${c.name}`} width="600" height="680" loading="lazy" />
              <div className="person-body">
                <h3>{c.name}</h3>
                <p className="person-role">{c.role}</p>
                <dl className="person-meta">
                  <div>
                    <dt>Experience</dt>
                    <dd>{c.years} years</dd>
                  </div>
                  <div>
                    <dt>Rating</dt>
                    <dd>{c.rating} / 5</dd>
                  </div>
                  <div className="span2">
                    <dt>Speaks</dt>
                    <dd>{c.languages.join(", ")}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- reviews ---------- */
function Reviews() {
  const [lead, ...rest] = REVIEWS;
  return (
    <section className="section reviews" id="reviews">
      <div className="wrap reviews-grid">
        <figure className="review-lead">
          <blockquote>
            <p>{lead.quote}</p>
          </blockquote>
          <figcaption>
            <strong>{lead.name}</strong>
            <span>{lead.context}</span>
          </figcaption>
        </figure>
        <div className="reviews-side">
          <div className="rating">
            <p className="rating-value">5.0</p>
            <div>
              <p className="stars" aria-label="5 out of 5 stars">
                ★★★★★
              </p>
              <p>Rated by families on Google</p>
              <a className="link" href={CONTACT.reviewsHref} target="_blank" rel="noopener">
                Read our Google reviews
              </a>
            </div>
          </div>
          {rest.map((r) => (
            <figure className="review" key={r.name}>
              <blockquote>
                <p>{r.quote}</p>
              </blockquote>
              <figcaption>
                <strong>{r.name}</strong>
                <span>{r.context}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- areas ---------- */
function Areas() {
  return (
    <section className="section areas">
      <div className="wrap areas-grid">
        <div>
          <h2 className="h2">Across Salem, and nearby</h2>
          <p className="lede">
            We cover most residential areas of Salem. Not on the list? Call us with your location
            and we'll confirm straight away.
          </p>
        </div>
        <ul className="area-list">
          {AREAS.map((a) => (
            <li key={a}>{a}</li>
          ))}
          <li className="area-more">and nearby areas</li>
        </ul>
      </div>
    </section>
  );
}

/* ---------- faq ---------- */
function Faq() {
  return (
    <section className="section faq" id="faq">
      <div className="wrap faq-grid">
        <div>
          <h2 className="h2">Questions families ask us</h2>
          <p className="lede">
            Anything else? Our nurse desk is on{" "}
            <a className="link" href={CONTACT.phoneHref}>
              {CONTACT.phoneDisplay}
            </a>
            , day and night.
          </p>
        </div>
        <div className="faq-list">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- emergency ---------- */
function Emergency() {
  return (
    <section className="emergency" aria-labelledby="emergency-title">
      <div className="wrap emergency-inner">
        <div>
          <h2 id="emergency-title">Need a nurse urgently?</h2>
          <p>
            Our emergency team covers Salem and nearby areas, any time of day or night. Call and a
            nurse will speak to you straight away.
          </p>
        </div>
        <div className="emergency-actions">
          <a className="btn btn-urgent btn-lg" href={CONTACT.phoneHref}>
            <PhoneIcon /> Call {CONTACT.phoneDisplay}
          </a>
          <a
            className="btn btn-urgent-ghost btn-lg"
            href={waLink("URGENT: Hello Careva+, I need an emergency nurse.")}
            target="_blank"
            rel="noopener"
          >
            <WhatsAppIcon /> Emergency WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- booking ---------- */
const EMPTY = {
  name: "",
  phone: "",
  age: "",
  gender: "",
  service: "",
  date: "",
  urgency: "Normal",
  address: "",
  notes: "",
};

function Booking() {
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const onPick = (e) => {
      setF((x) => ({ ...x, service: e.detail }));
      setDone(false);
    };
    window.addEventListener("cv:service", onPick);
    return () => window.removeEventListener("cv:service", onPick);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = "Enter the patient's name.";
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, "").slice(-10)))
      er.phone = "Enter a 10-digit mobile number.";
    if (!f.service) er.service = "Choose the care you need.";
    if (!f.address.trim()) er.address = "Enter the address where care is needed.";
    setErrors(er);
    if (Object.keys(er).length) return;

    const msg = [
      "Hello Careva+, I'd like to book home healthcare.",
      `Patient: ${f.name}${f.age ? `, ${f.age} yrs` : ""}${f.gender ? `, ${f.gender}` : ""}`,
      `Phone: ${f.phone}`,
      `Service: ${f.service}`,
      `Urgency: ${f.urgency}`,
      f.date && `Start date: ${f.date}`,
      `Address: ${f.address}`,
      f.notes && `Notes: ${f.notes}`,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(waLink(msg), "_blank", "noopener");
    setDone(true);
  };

  const err = (k) =>
    errors[k] ? (
      <span className="field-error" id={`${k}-err`}>
        {errors[k]}
      </span>
    ) : null;

  return (
    <section className="section book" id="book">
      <div className="wrap book-grid">
        <div className="book-intro">
          <h2 className="h2">Book care at home</h2>
          <p className="lede">
            Tell us about the patient. Your booking opens in WhatsApp so you can send it to our
            nurse desk, and we call you back within 15 minutes to plan care.
          </p>
          <ul className="ticks">
            <li>
              <Check /> Free consultation with a senior nurse
            </li>
            <li>
              <Check /> Clear quote before care begins
            </li>
            <li>
              <Check /> Same-day start for urgent cases
            </li>
          </ul>
          <div className="book-contact">
            <p>Prefer to talk?</p>
            <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </div>
        </div>

        {done ? (
          <div className="book-form book-done" role="status">
            <h3 className="h3">Booking ready to send</h3>
            <p>
              We've opened WhatsApp with your booking details. Press send there, and our nurse desk
              will call {f.phone} within 15 minutes.
            </p>
            <p>WhatsApp didn't open? Call us on {CONTACT.phoneDisplay}.</p>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setF(EMPTY);
                setDone(false);
              }}
            >
              Book for someone else
            </button>
          </div>
        ) : (
          <form className="book-form" onSubmit={submit} noValidate>
            <div className="grid-2">
              <label className="field">
                <span>Patient name</span>
                <input value={f.name} onChange={set("name")} aria-invalid={!!errors.name} aria-describedby="name-err" />
                {err("name")}
              </label>
              <label className="field">
                <span>Mobile number</span>
                <input
                  value={f.phone}
                  onChange={set("phone")}
                  inputMode="tel"
                  autoComplete="tel"
                  aria-invalid={!!errors.phone}
                  aria-describedby="phone-err"
                />
                {err("phone")}
              </label>
              <label className="field">
                <span>
                  Patient age <em>optional</em>
                </span>
                <input value={f.age} onChange={set("age")} inputMode="numeric" />
              </label>
              <label className="field">
                <span>
                  Gender <em>optional</em>
                </span>
                <select value={f.gender} onChange={set("gender")}>
                  <option value="">Prefer not to say</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="field">
                <span>Care needed</span>
                <select
                  value={f.service}
                  onChange={set("service")}
                  aria-invalid={!!errors.service}
                  aria-describedby="service-err"
                >
                  <option value="">Choose a service</option>
                  {SERVICES.map((s) => (
                    <option key={s.id}>{s.name}</option>
                  ))}
                </select>
                {err("service")}
              </label>
              <label className="field">
                <span>
                  Preferred start date <em>optional</em>
                </span>
                <input type="date" value={f.date} onChange={set("date")} />
              </label>
            </div>

            <fieldset className="urgency">
              <legend>How soon do you need care?</legend>
              {["Normal", "Urgent", "Emergency"].map((u) => (
                <label key={u} className={`chip${u === "Emergency" ? " chip-urgent" : ""}`}>
                  <input
                    type="radio"
                    name="urgency"
                    value={u}
                    checked={f.urgency === u}
                    onChange={set("urgency")}
                  />
                  <span>{u === "Normal" ? "In the next few days" : u === "Urgent" ? "Today" : "Emergency, right now"}</span>
                </label>
              ))}
            </fieldset>
            {f.urgency === "Emergency" && (
              <p className="urgent-note" role="alert">
                For emergencies, calling is fastest:{" "}
                <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a>
              </p>
            )}

            <label className="field">
              <span>Address where care is needed</span>
              <textarea
                rows="2"
                value={f.address}
                onChange={set("address")}
                aria-invalid={!!errors.address}
                aria-describedby="address-err"
              />
              {err("address")}
            </label>
            <label className="field">
              <span>
                Notes for the care team <em>optional</em>
              </span>
              <textarea
                rows="3"
                value={f.notes}
                onChange={set("notes")}
                placeholder="Diagnosis, mobility, shift timings, anything we should know"
              />
            </label>
            <button className="btn btn-primary btn-lg btn-block" type="submit">
              <WhatsAppIcon /> Send booking on WhatsApp
            </button>
            <p className="fine">
              By booking you agree to be contacted by our care team at the number you provide.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

/* ---------- footer ---------- */
function Footer() {
  return (
    <footer className="footer" id="contact">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <img src="/images/logo.webp" alt="Careva+" width="160" height="56" loading="lazy" />
          <p>
            Careva+ Home Health Care provides nursing, elderly care, physiotherapy and critical
            care at home for families in Salem, Tamil Nadu.
          </p>
        </div>
        <div>
          <h2 className="footer-h">Contact</h2>
          <ul>
            <li>
              <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a>
            </li>
            <li>
              <a href={waLink("Hello Careva+")} target="_blank" rel="noopener">
                WhatsApp
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="footer-h">Visit</h2>
          <address>
            <a href={CONTACT.mapsHref} target="_blank" rel="noopener">
              142/3-2 KMS Garden Road,
              <br />
              Alagapuram Periya Pudur,
              <br />
              Salem 636016, Tamil Nadu
            </a>
          </address>
        </div>
        <div>
          <h2 className="footer-h">Services</h2>
          <ul>
            {SERVICES.slice(0, 6).map((s) => (
              <li key={s.id}>
                <a href="#services">{s.name}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="wrap footer-base">
        <p>© {new Date().getFullYear()} Careva+ Home Health Care, Salem</p>
        <p>Nurse desk open 24 hours, every day</p>
      </div>
    </footer>
  );
}

/* ---------- mobile action bar ---------- */
function MobileBar() {
  return (
    <div className="mobile-bar">
      <a className="btn btn-ghost" href={CONTACT.phoneHref}>
        <PhoneIcon /> Call
      </a>
      <a className="btn btn-primary" href="#book">
        Book care
      </a>
    </div>
  );
}

export default function Site() {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Stats />
        <Services />
        <Standard />
        <Process />
        <Caregivers />
        <Reviews />
        <Areas />
        <Faq />
        <Emergency />
        <Booking />
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}
