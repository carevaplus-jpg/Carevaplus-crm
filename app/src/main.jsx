import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./styles.css";
import { boot, useStore, isOffice } from "./lib/store";
import { Toaster } from "./components/ui";
import Login from "./roles/Login";
import Office from "./roles/Office";
import Staff from "./roles/Staff";
import Patient from "./roles/Patient";

const DEMO = new URLSearchParams(location.search).has("demo");

function App() {
  const { ready, profile } = useStore((s) => s);
  useEffect(() => { boot(DEMO).catch((e) => console.error(e)); }, []);
  if (!ready) return <div style={{ height: "100%", display: "grid", placeItems: "center" }}><img src="/logo.png" alt="Careva+" style={{ width: 200 }} /></div>;
  let view;
  if (!profile) view = <Login demo={DEMO} />;
  else if (isOffice(profile)) view = <Office />;
  else if (profile.role === "staff") view = <Staff />;
  else if (profile.role === "patient") view = <Patient />;
  else view = <Login demo={DEMO} />;
  return <>{DEMO && profile && <div className="demo-ribbon">Demo · sample data</div>}{view}<Toaster /></>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
