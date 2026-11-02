import React, { useEffect, useRef, useState } from "react";

/*
 * Careva+ Stream — an original streaming-style video library for Careva+
 * (care tutorials, wellness, patient stories). Posters are generated
 * gradients so no third-party artwork is used.
 */

const gradients = [
  ["#7c3aed", "#db2777"],
  ["#0ea5e9", "#22c55e"],
  ["#f59e0b", "#ef4444"],
  ["#14b8a6", "#6366f1"],
  ["#e11d48", "#7c2d12"],
  ["#8b5cf6", "#06b6d4"],
  ["#84cc16", "#0f766e"],
  ["#f97316", "#a21caf"],
];

let nextId = 1;
const make = (title, genre, minutes, desc) => ({
  id: nextId++,
  title,
  genre,
  minutes,
  desc,
  match: 80 + Math.floor(Math.random() * 20),
  colors: gradients[nextId % gradients.length],
});

const rows = [
  {
    name: "Trending at Careva+",
    items: [
      make("Safe Patient Transfers", "Caregiving", 18, "Step-by-step techniques for moving patients from bed to chair without strain or injury."),
      make("Wound Care Basics", "Nursing", 22, "Cleaning, dressing and monitoring wounds at home, explained by our senior nurses."),
      make("Medication Made Simple", "Nursing", 15, "Organising pill boxes, schedules and reminders for elderly patients."),
      make("Healthy Heart Kitchen", "Wellness", 26, "Low-salt, heart-friendly recipes you can prepare in under 30 minutes."),
      make("Diabetes at Home", "Nursing", 31, "Glucose checks, insulin storage and warning signs every family should know."),
      make("Gentle Morning Stretch", "Fitness", 12, "A seated routine to improve mobility for seniors and post-surgery patients."),
    ],
  },
  {
    name: "Caregiver Academy",
    items: [
      make("First Aid Essentials", "Training", 40, "CPR, choking response and emergency first steps before help arrives."),
      make("Dementia Care with Dignity", "Training", 35, "Communication strategies and daily routines that reduce confusion and stress."),
      make("Fall Prevention", "Training", 20, "Simple home changes that dramatically reduce the risk of falls."),
      make("Bedsore Prevention", "Training", 17, "Positioning schedules and skin checks for bed-bound patients."),
      make("Feeding & Nutrition", "Training", 24, "Safe feeding techniques, including for patients with swallowing difficulties."),
      make("Caregiver Self-Care", "Training", 19, "Avoiding burnout while caring for a loved one full-time."),
    ],
  },
  {
    name: "Stories of Recovery",
    items: [
      make("Back on My Feet", "Documentary", 48, "A knee-replacement patient's eight-week journey back to walking independently."),
      make("Home Again", "Documentary", 52, "How home nursing helped a family bring their grandfather home from the ICU."),
      make("The Night Shift", "Documentary", 44, "A night with Careva+ nurses responding to calls across the city."),
      make("Small Wins", "Documentary", 39, "Physiotherapy milestones of a young stroke survivor."),
      make("Together", "Documentary", 41, "Families and caregivers share what compassionate care means to them."),
    ],
  },
  {
    name: "Wellness & Mind",
    items: [
      make("Breathe Easy", "Wellness", 10, "Breathing exercises for anxiety, COPD and better sleep."),
      make("Sleep Better Tonight", "Wellness", 16, "Evening habits for restful sleep at any age."),
      make("Chair Yoga", "Fitness", 25, "Low-impact yoga anyone can do from a chair."),
      make("Mindful Minutes", "Wellness", 8, "Short guided meditations for patients and caregivers."),
      make("Walking for Health", "Fitness", 14, "Building a safe daily walking habit after illness."),
    ],
  },
];

const allItems = rows.flatMap((r) => r.items);
const featured = allItems[0];

function Poster({ item, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={() => onOpen(item)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: "0 0 auto",
        width: 240,
        height: 135,
        borderRadius: 8,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})`,
        transform: hover ? "scale(1.08)" : "scale(1)",
        transition: "transform .25s ease, box-shadow .25s ease",
        boxShadow: hover ? "0 12px 30px rgba(0,0,0,.6)" : "none",
        zIndex: hover ? 2 : 1,
      }}
    >
      <div style={{ position: "absolute", top: 10, left: 12, fontWeight: 900, fontSize: 13, color: "#fde68a", letterSpacing: 1 }}>C+</div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 12,
          background: "linear-gradient(to top, rgba(0,0,0,.75), transparent 65%)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16 }}>{item.title}</div>
        {hover && (
          <div style={{ fontSize: 12, marginTop: 4, color: "#d1d5db" }}>
            <span style={{ color: "#4ade80", fontWeight: 700 }}>{item.match}% match</span> · {item.minutes}m · {item.genre}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ name, items, onOpen }) {
  const ref = useRef(null);
  const scroll = (dir) => ref.current && ref.current.scrollBy({ left: dir * 600, behavior: "smooth" });
  const arrow = (side) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    [side]: 0,
    width: 44,
    border: "none",
    color: "white",
    fontSize: 28,
    cursor: "pointer",
    background: "rgba(0,0,0,.45)",
    zIndex: 3,
  });
  if (!items.length) return null;
  return (
    <section style={{ margin: "28px 0" }}>
      <h2 style={{ fontSize: 20, margin: "0 0 10px 48px" }}>{name}</h2>
      <div style={{ position: "relative" }}>
        <button aria-label="Scroll left" style={arrow("left")} onClick={() => scroll(-1)}>‹</button>
        <div ref={ref} className="cs-row" style={{ display: "flex", gap: 10, overflowX: "auto", padding: "16px 48px", scrollbarWidth: "none" }}>
          {items.map((it) => (
            <Poster key={it.id} item={it} onOpen={onOpen} />
          ))}
        </div>
        <button aria-label="Scroll right" style={arrow("right")} onClick={() => scroll(1)}>›</button>
      </div>
    </section>
  );
}

function DetailModal({ item, onClose, inList, toggleList }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setProgress((p) => (p >= 100 ? 100 : p + 1)), 120);
    return () => clearInterval(t);
  }, [playing]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(820px, 100%)", background: "#181818", borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.8)" }}>
        <div style={{ height: 380, position: "relative", background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})` }}>
          <button onClick={onClose} aria-label="Close" style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: "50%", border: "none", background: "#181818", color: "white", fontSize: 18, cursor: "pointer" }}>✕</button>
          {playing ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>▶ Now playing: {item.title}</div>
              <div style={{ fontSize: 13, color: "#d1d5db", marginTop: 6 }}>Connect your own video files to stream real content.</div>
              <div style={{ width: "70%", height: 6, background: "#4b5563", borderRadius: 3, marginTop: 20 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "#f472b6", borderRadius: 3, transition: "width .1s" }} />
              </div>
              <button onClick={() => setPlaying(false)} style={{ ...btn("#fff", "#000"), marginTop: 20 }}>❚❚ Pause</button>
            </div>
          ) : (
            <div style={{ position: "absolute", left: 36, bottom: 32, right: 36 }}>
              <h2 style={{ fontSize: 40, margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,.5)" }}>{item.title}</h2>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setPlaying(true)} style={btn("#fff", "#000")}>▶ Play</button>
                <button onClick={() => toggleList(item.id)} style={btn("rgba(109,109,110,.7)", "#fff")}>{inList ? "✓ In My List" : "+ My List"}</button>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "24px 36px 32px" }}>
          <div style={{ fontSize: 14, marginBottom: 12 }}>
            <span style={{ color: "#4ade80", fontWeight: 700 }}>{item.match}% match</span>
            <span style={{ marginLeft: 12, border: "1px solid #6b7280", padding: "0 6px", borderRadius: 3 }}>All ages</span>
            <span style={{ marginLeft: 12 }}>{item.minutes} min</span>
            <span style={{ marginLeft: 12, color: "#9ca3af" }}>{item.genre}</span>
          </div>
          <p style={{ lineHeight: 1.6, color: "#e5e7eb", margin: 0 }}>{item.desc}</p>
        </div>
      </div>
    </div>
  );
}

const btn = (bg, color) => ({
  background: bg,
  color,
  border: "none",
  borderRadius: 6,
  padding: "10px 26px",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
});

export default function CarevaStream({ onExit }) {
  const [scrolled, setScrolled] = useState(false);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [myList, setMyList] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("carevaStreamList")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("carevaStreamList", JSON.stringify(myList));
  }, [myList]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleList = (id) => setMyList((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const q = query.trim().toLowerCase();
  const searchResults = q ? allItems.filter((i) => (i.title + " " + i.genre + " " + i.desc).toLowerCase().includes(q)) : null;
  const listItems = allItems.filter((i) => myList.includes(i.id));

  return (
    <div style={{ background: "#141414", color: "white", minHeight: "100vh", fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif" }}>
      <style>{`.cs-row::-webkit-scrollbar{display:none} body{margin:0;background:#141414}`}</style>

      {/* Top navigation */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 28,
          padding: "14px 48px",
          background: scrolled ? "#141414" : "linear-gradient(to bottom, rgba(0,0,0,.8), transparent)",
          transition: "background .3s",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, color: "#fbbf24", letterSpacing: 1 }}>
          CAREVA<span style={{ color: "#f472b6" }}>+</span> <span style={{ fontWeight: 400, fontSize: 18, color: "#fff" }}>Stream</span>
        </div>
        <nav style={{ display: "flex", gap: 18, fontSize: 14, color: "#e5e7eb" }}>
          {rows.map((r) => (
            <span key={r.name} style={{ cursor: "pointer" }} onClick={() => setQuery(r.items[0].genre)}>
              {r.items[0].genre}
            </span>
          ))}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search titles, genres"
            style={{ background: "rgba(0,0,0,.6)", border: "1px solid #6b7280", color: "white", padding: "8px 12px", borderRadius: 4, width: 220 }}
          />
          {onExit && (
            <button onClick={onExit} style={{ ...btn("#fbbf24", "#111"), padding: "8px 16px", fontSize: 14 }}>
              Back to CRM
            </button>
          )}
        </div>
      </header>

      {searchResults ? (
        <div style={{ padding: "110px 48px 48px" }}>
          <h2 style={{ marginTop: 0 }}>
            Results for “{query}” <span style={{ color: "#9ca3af", fontSize: 16 }}>({searchResults.length})</span>
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {searchResults.map((it) => (
              <Poster key={it.id} item={it} onOpen={setSelected} />
            ))}
          </div>
          {!searchResults.length && <p style={{ color: "#9ca3af" }}>No titles match your search.</p>}
        </div>
      ) : (
        <>
          {/* Hero banner */}
          <section
            style={{
              height: "80vh",
              minHeight: 480,
              position: "relative",
              background: `radial-gradient(circle at 75% 40%, ${featured.colors[1]}aa, transparent 55%), linear-gradient(135deg, ${featured.colors[0]}, #141414 75%)`,
            }}
          >
            <div style={{ position: "absolute", left: 48, bottom: "22%", maxWidth: 560 }}>
              <div style={{ fontSize: 14, letterSpacing: 3, color: "#fbbf24", fontWeight: 700 }}>C+ ORIGINAL SERIES</div>
              <h1 style={{ fontSize: 64, margin: "10px 0", lineHeight: 1 }}>{featured.title}</h1>
              <p style={{ fontSize: 18, lineHeight: 1.5, color: "#e5e7eb" }}>{featured.desc}</p>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button onClick={() => setSelected(featured)} style={btn("#fff", "#000")}>▶ Play</button>
                <button onClick={() => setSelected(featured)} style={btn("rgba(109,109,110,.7)", "#fff")}>ⓘ More Info</button>
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140, background: "linear-gradient(to top, #141414, transparent)" }} />
          </section>

          <div style={{ marginTop: -80, position: "relative", paddingBottom: 60 }}>
            <Row name="My List" items={listItems} onOpen={setSelected} />
            {rows.map((r) => (
              <Row key={r.name} name={r.name} items={r.items} onOpen={setSelected} />
            ))}
          </div>
        </>
      )}

      <footer style={{ padding: "30px 48px", color: "#6b7280", fontSize: 13, borderTop: "1px solid #262626" }}>
        © Careva+ Home Health Care · Educational care videos for patients and families
      </footer>

      {selected && (
        <DetailModal
          key={selected.id}
          item={selected}
          onClose={() => setSelected(null)}
          inList={myList.includes(selected.id)}
          toggleList={toggleList}
        />
      )}
    </div>
  );
}
