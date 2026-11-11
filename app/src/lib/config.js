// Careva+ app configuration.
// The Supabase publishable key is safe in client code: every table is protected by row-level security.
export const SUPABASE_URL = "https://prjedhzcrrboyhewvcar.supabase.co";
export const SUPABASE_KEY = "sb_publishable_GSX6LQ_mVVtDaEaagS_fig_Dpa-FE2I";

// Google Maps JavaScript API key. Put it in app/.env as VITE_GOOGLE_MAPS_KEY=... (restrict it to your domain
// in Google Cloud Console). Without a key the app falls back to keyless Google Maps embeds + directions links.
export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

// Public download link for the Android app (Supabase Storage, public "downloads" bucket)
export const APK_URL = `${SUPABASE_URL}/storage/v1/object/public/downloads/Careva-Plus.apk`;

export const STAFF_DOMAIN = "staff.carevaplus.com";
export const PATIENT_DOMAIN = "patient.carevaplus.com";

export const SERVICES = {
  nursing: { label: "Nursing Care", color: "#2B6DE8" },
  elder: { label: "Elder Care", color: "#3FA34D" },
  wound: { label: "Wound Care", color: "#E5484D" },
  physio: { label: "Physiotherapy", color: "#8E4EC6" },
  postop: { label: "Post-op Care", color: "#E5862B" },
  palliative: { label: "Palliative Care", color: "#0E9AA7" },
};

export const TASKS = {
  nursing: ["Check vitals — BP, pulse, SpO₂, temperature", "Blood sugar check", "Administer medicines / insulin as charted", "Review medicine adherence", "Skin & pressure-area check", "Patient & family education"],
  elder: ["Check vitals — BP, pulse, SpO₂, temperature", "Assist bathing & personal hygiene", "Mobility walk / fall-risk check", "Meals & hydration support", "Medicine reminder & adherence", "Mood & memory check-in"],
  wound: ["Check vitals — BP, pulse, SpO₂, temperature", "Assess wound — size, exudate, signs of infection", "Clean & dress wound (aseptic)", "Photograph wound for record", "Pain score", "Educate on dressing care"],
  physio: ["Pain & range-of-motion assessment", "Therapeutic exercises", "Gait / balance training", "Home exercise plan review", "Progress note"],
  postop: ["Check vitals — BP, pulse, SpO₂, temperature", "Surgical site inspection", "Drain / catheter care", "Pain management review", "Mobility & breathing exercises", "Discharge-instruction adherence"],
  palliative: ["Check vitals — BP, pulse, SpO₂, temperature", "Pain & symptom assessment", "Comfort care & positioning", "Medicine as charted", "Family support & counselling"],
};

export const STATUS = {
  scheduled: { label: "Scheduled", tone: "blue" },
  enroute: { label: "On the way", tone: "amber" },
  inprogress: { label: "In progress", tone: "violet" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "grey" },
};
