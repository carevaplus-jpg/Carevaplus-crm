export const CONTACT = {
  phoneDisplay: "+91 96555 08881",
  phoneHref: "tel:+919655508881",
  whatsapp: "919655508881",
  email: "carevaplus@gmail.com",
  address: "142/3-2 KMS Garden Road, Alagapuram Periya Pudur, Salem 636016, Tamil Nadu",
  mapsHref:
    "https://www.google.com/maps/search/142%2F3-2+KMS+Garden+Road+Alagapuram+Periya+Pudur+Salem+636016",
  reviewsHref: "https://www.google.com/search?q=Careva+Home+Health+Care+Salem",
};

export const waLink = (text) =>
  `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;

export const SERVICES = [
  {
    id: "elderly",
    name: "Elderly care",
    image: "/images/elderly.webp",
    summary:
      "Day-to-day care for parents and grandparents who want to stay in their own home.",
    includes: [
      "Help with bathing, meals and mobility",
      "Medication reminders and vitals checks",
      "Fall prevention and companionship",
      "Day, night or round-the-clock shifts",
    ],
  },
  {
    id: "nursing",
    name: "Nursing care",
    image: "/images/nursing.webp",
    summary:
      "Registered nurses for clinical work at home, from injections to catheter and wound care.",
    includes: [
      "Injections, IV and drip administration",
      "Catheter, tube and wound management",
      "Medication charting for your doctor",
      "Short visits or full-time nurse",
    ],
  },
  {
    id: "physio",
    name: "Physiotherapy",
    image: "/images/physio.webp",
    summary:
      "Physiotherapists who come to you for rehabilitation, mobility and pain management.",
    includes: [
      "Stroke and paralysis rehabilitation",
      "Knee and hip replacement recovery",
      "Back, neck and joint pain programs",
      "Exercise plans the family can continue",
    ],
  },
  {
    id: "postsurgery",
    name: "Post-surgery care",
    image: "/images/postsurgery.webp",
    summary:
      "A safe recovery at home after discharge, with a nurse who follows your surgeon's plan.",
    includes: [
      "Dressing changes and suture care",
      "Pain and medication management",
      "Early mobility and physiotherapy",
      "Updates to your treating doctor",
    ],
  },
  {
    id: "icu",
    name: "ICU setup at home",
    summary:
      "Hospital-grade critical care equipment installed at home, with trained staff around the clock.",
    includes: [
      "Ventilator, monitor and oxygen setup",
      "ICU-trained nurses on 12 or 24-hour shifts",
      "Suction, feeding pumps and hospital bed",
      "Coordination with the treating hospital",
    ],
  },
  {
    id: "doctor",
    name: "Doctor visit",
    summary:
      "Scheduled doctor consultations at home for assessments, reviews and prescriptions.",
    includes: [
      "General physician home consultations",
      "Review of reports and ongoing treatment",
      "Prescription updates",
      "Referral to specialists when needed",
    ],
  },
  {
    id: "lab",
    name: "Lab tests at home",
    summary:
      "Blood and urine samples collected at home by trained staff, so the patient doesn't have to travel.",
    includes: [
      "Routine blood work and health packages",
      "Diabetes, thyroid and kidney panels",
      "Sample collection by trained staff",
      "Tests ordered by your doctor",
    ],
  },
  {
    id: "mother",
    name: "Mother & baby care",
    summary:
      "Support for new mothers and newborns in the first weeks at home.",
    includes: [
      "Newborn bathing, feeding and hygiene",
      "Breastfeeding support",
      "Post-delivery care for the mother",
      "Night support so parents can rest",
    ],
  },
  {
    id: "dementia",
    name: "Dementia care",
    summary:
      "Patient, consistent caregivers for people living with dementia or Alzheimer's.",
    includes: [
      "A familiar caregiver and daily routine",
      "Supervision to prevent wandering and falls",
      "Gentle help with eating and hygiene",
      "Guidance for family members",
    ],
  },
  {
    id: "palliative",
    name: "Palliative care",
    summary:
      "Comfort-focused care for serious illness, so your loved one can be at home with family.",
    includes: [
      "Pain and symptom relief",
      "Nursing for bedbound patients",
      "Emotional support for the family",
      "Coordination with the doctor",
    ],
  },
];

export const STATS = [
  { value: "500+", label: "families cared for in Salem" },
  { value: "100+", label: "verified nurses and caregivers" },
  { value: "24/7", label: "nurse desk and emergency line" },
  { value: "5+ years", label: "of home healthcare" },
];

export const STEPS = [
  {
    title: "You call or book online",
    text: "Tell us about the patient and what kind of help you need.",
  },
  {
    title: "We assess the patient",
    text: "A senior nurse reviews the medical history, reports and home setup.",
  },
  {
    title: "We write a care plan",
    text: "Duties, shift timings and checkpoints, agreed with you and the doctor.",
  },
  {
    title: "We assign a caregiver",
    text: "A verified nurse or caregiver matched by skill and language.",
  },
  {
    title: "Care begins at home",
    text: "Usually within hours of booking, and the same day in emergencies.",
  },
  {
    title: "We keep monitoring",
    text: "Supervisor check-ins and updates to the family, and we adjust the plan as recovery goes on.",
  },
];

export const CAREGIVERS = [
  {
    name: "Prema R.",
    role: "Senior elderly care specialist",
    years: 12,
    languages: ["Tamil", "English", "Kannada"],
    rating: "4.9",
    image: "/images/prema.webp",
  },
  {
    name: "Anitha S.",
    role: "Registered nurse",
    years: 8,
    languages: ["Tamil", "English", "Telugu"],
    rating: "5.0",
    image: "/images/anitha.webp",
  },
  {
    name: "Karthik M.",
    role: "Physiotherapist",
    years: 10,
    languages: ["English", "Kannada", "Hindi"],
    rating: "4.8",
    image: "/images/karthik.webp",
  },
  {
    name: "Divya L.",
    role: "Mother & baby care specialist",
    years: 9,
    languages: ["Tamil", "English", "Malayalam"],
    rating: "4.9",
    image: "/images/divya.webp",
  },
];

export const REVIEWS = [
  {
    quote:
      "Careva+ provided excellent elderly care for my mother. Their staff was kind, professional, and truly compassionate.",
    name: "Rajesh Kumar",
    context: "Elderly care",
  },
  {
    quote:
      "Quick response and professional nursing support. The team is highly trained and very attentive to patient needs.",
    name: "Priya Sharma",
    context: "Post-surgery care",
  },
  {
    quote:
      "Reliable healthcare service with exceptional care quality. They treated us like family throughout the journey.",
    name: "Anita Patel",
    context: "Home nursing",
  },
];

export const AREAS = [
  "Fairlands",
  "Swarnapuri",
  "Hasthampatti",
  "Alagapuram",
  "Meyyanur",
  "Gorimedu",
  "Kannankurichi",
  "Four Roads",
  "Ammapet",
  "Suramangalam",
];

export const FAQS = [
  {
    q: "How quickly can a nurse reach us?",
    a: "Our nurse desk answers 24 hours a day. For bookings we call you back within 15 minutes, and in emergencies we send a nurse as fast as possible anywhere in Salem and nearby areas. Call +91 96555 08881 directly if it is urgent.",
  },
  {
    q: "Are your nurses and caregivers verified?",
    a: "Yes. Everyone goes through background verification, checks of their qualifications, and training before they are assigned to a patient. A supervisor checks in on every placement.",
  },
  {
    q: "How much does home nursing cost?",
    a: "Pricing depends on the service, the hours and the level of care. We offer hourly visits, 12-hour shifts and 24-hour care. Call or WhatsApp us and we will give you a clear quote before care starts.",
  },
  {
    q: "Can you care for patients with chronic conditions?",
    a: "Yes. We regularly care for patients with diabetes, hypertension, heart disease, arthritis, stroke and dementia, with monitoring and medication routines agreed with their doctor.",
  },
  {
    q: "Do you create a care plan for each patient?",
    a: "Every patient gets a written plan based on their medical history, the doctor's advice and the family's routine. We review it as the patient's needs change.",
  },
  {
    q: "Which areas do you serve?",
    a: "We serve Salem city and nearby areas, including Fairlands, Swarnapuri, Hasthampatti, Alagapuram, Ammapet and Suramangalam. If you are unsure, call us with your location.",
  },
];
