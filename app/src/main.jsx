import LOGO from "./assets/logo.webp";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import { boot, useStore, isOffice } from "./lib/store";
import { Toaster } from "./components/ui";
import { Banners } from "./components/alerts";
import Login from "./roles/Login";
import Office from "./roles/Office";
import Staff from "./roles/Staff";
import Patient from "./roles/Patient";

// Local UI tests only: `VITE_TEST_FIXTURES=1` builds can load sample data with ?test. Real builds never include it.
const TEST = import.meta.env.VITE_TEST_FIXTURES === "1" && new URLSearchParams(location.search).has("test");

function App() {
  const { ready, profile } = useStore((s) => s);
  useEffect(() => {
    (TEST ? import("../test/fixtures.js").then((m) => boot(m.createDemoBackend())) : boot()).catch((e) => console.error(e));
  }, []);
  // a new screen (sign-in → app, or sign-out) always starts at the top
  useEffect(() => { window.scrollTo(0, 0); }, [profile?.id]);
  if (!ready) return <div style={{ height: "100%", display: "grid", placeItems: "center" }}><img src={LOGO} alt="Careva+" style={{ width: 200 }} /></div>;
  let view;
  if (!profile) view = <Login test={TEST} />;
  else if (isOffice(profile)) view = <Office />;
  else if (profile.role === "staff") view = <Staff />;
  else if (profile.role === "patient") view = <Patient />;
  else view = <Login test={TEST} />;
  return <>{view}<Banners /><Toaster /></>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
