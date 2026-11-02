import React, { useState } from "react";
import CarevaPlusRoyalAI from "./CarevaPlusRoyalAI";
import CarevaStream from "./CarevaStream";

export default function App() {
  const [view, setView] = useState("stream");

  if (view === "stream") return <CarevaStream onExit={() => setView("crm")} />;

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1>👑 Careva+ AI CRM</h1>
        <button onClick={() => setView("stream")} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#e11d48", color: "white", fontWeight: 700, cursor: "pointer" }}>
          ▶ Careva+ Stream
        </button>
      </div>
      <CarevaPlusRoyalAI />
    </div>
  );
}
