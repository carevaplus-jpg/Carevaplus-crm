import type {
  Activity,
  ActivityType,
  Collections,
  Company,
  CompanySize,
  Contact,
  ContactStatus,
  Deal,
  Invoice,
  InvoiceStatus,
  LineItem,
  MessageChannel,
  MessageLogEntry,
  Pipeline,
  PipelineStage,
  Product,
  Profile,
  Quote,
  QuoteStatus,
  Role,
  Task,
  TaskPriority,
  TaskType,
} from '@/types';
import { uid } from './id';
import { intRange, mulberry32, pick, pickSome, range } from './rng';

export const DEMO_ORG_ID = 'org_demo';

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Ishaan', 'Kabir', 'Rohan', 'Karan', 'Dev',
  'Ananya', 'Diya', 'Ishita', 'Kavya', 'Meera', 'Nisha', 'Priya', 'Riya', 'Sanya', 'Tara',
  'Rahul', 'Sameer', 'Varun', 'Nikhil', 'Siddharth', 'Aisha', 'Neha', 'Pooja', 'Shreya', 'Zoya',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Kapoor', 'Mehta', 'Khanna', 'Reddy', 'Nair', 'Iyer', 'Patel',
  'Chopra', 'Malhotra', 'Rao', 'Pillai', 'Joshi', 'Desai', 'Bose', 'Menon', 'Agarwal', 'Bhatt',
];
const COMPANY_PREFIX = [
  'Lumen', 'Nimbus', 'Everest', 'Orion', 'Vertex', 'Solace', 'Crestline', 'Indus', 'Zenith', 'Maple',
  'Polaris', 'Granite', 'Sundial', 'Cobalt', 'Amber', 'Highline', 'Northgate', 'Beacon', 'Harbor', 'Silverline',
];
const COMPANY_SUFFIX = ['Retail', 'Wellness', 'Beauty Co.', 'Industries', 'Technologies', 'Hospitality Group', 'Pharma', 'Foods', 'Logistics', 'Studios', 'Labs', 'Ventures'];
const INDUSTRIES = ['Beauty & Wellness', 'Healthcare', 'Retail', 'FMCG', 'Technology', 'Hospitality', 'Education', 'Manufacturing', 'Finance'];
const CITIES = ['Mumbai', 'Bengaluru', 'Delhi NCR', 'Pune', 'Hyderabad', 'Chennai', 'Ahmedabad', 'Kolkata', 'Jaipur', 'Chandigarh'];
const SIZES: CompanySize[] = ['1-10', '11-50', '51-200', '201-1000', '1000+'];
const SOURCES = ['Website', 'Referral', 'Trade Show', 'Cold Outreach', 'LinkedIn', 'Inbound Call', 'Partner'];
const TAG_POOL = ['VIP', 'Enterprise', 'High Priority', 'Renewal Risk', 'Upsell', 'New Market', 'Key Account'];

function companyName(rand: () => number): string {
  return `${pick(rand, COMPANY_PREFIX)} ${pick(rand, COMPANY_SUFFIX)}`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9 + Math.floor(Math.random() * 7), [0, 15, 30, 45][Math.floor(Math.random() * 4)], 0, 0);
  return d.toISOString();
}

const STAGE_DEFS = [
  { name: 'New Lead', probability: 0.1, color: 'var(--color-stage-1)' },
  { name: 'Qualified', probability: 0.3, color: 'var(--color-stage-2)' },
  { name: 'Proposal Sent', probability: 0.5, color: 'var(--color-stage-4)' },
  { name: 'Negotiation', probability: 0.75, color: 'var(--color-stage-5)' },
  { name: 'Won', probability: 1, color: 'var(--color-stage-3)', isWon: true },
  { name: 'Lost', probability: 0, color: 'var(--color-stage-6)', isLost: true },
];

const DEAL_NAME_TEMPLATES = [
  '{company} — Annual Contract', '{company} — Pilot Program', '{company} — Expansion Deal',
  '{company} — Renewal', '{company} — New Store Rollout', '{company} — Platform Upgrade',
  '{company} — Bulk Order', '{company} — Enterprise Plan', '{company} — Partnership Agreement',
];

const PRODUCT_DEFS: { name: string; price: number; unit: string; description: string }[] = [
  { name: 'Executive CRM — Starter Seat', price: 1499, unit: '/seat/mo', description: 'Core CRM access for a single team member.' },
  { name: 'Executive CRM — Growth Seat', price: 3499, unit: '/seat/mo', description: 'Adds pipeline automation and reporting.' },
  { name: 'Executive CRM — Enterprise Seat', price: 6999, unit: '/seat/mo', description: 'Full feature set with priority support and SSO.' },
  { name: 'Onboarding & Data Migration', price: 45000, unit: 'one-time', description: 'White-glove setup, data import and team training.' },
  { name: 'Custom Integration — ERP', price: 85000, unit: 'one-time', description: 'Two-way sync with existing ERP / billing systems.' },
  { name: 'Dedicated Success Manager', price: 25000, unit: '/mo', description: 'A named success manager for quarterly business reviews.' },
  { name: 'Premium Support (24x7)', price: 12000, unit: '/mo', description: 'Round-the-clock priority support with 1-hour SLA.' },
  { name: 'Advanced Analytics Add-on', price: 8500, unit: '/mo', description: 'Custom dashboards, cohort analysis and forecasting.' },
  { name: 'Marketing Automation Add-on', price: 9500, unit: '/mo', description: 'Email sequences, lead scoring and campaign tracking.' },
  { name: 'API Access & Webhooks', price: 5000, unit: '/mo', description: 'Programmatic access for custom workflows.' },
  { name: 'On-site Training (per day)', price: 18000, unit: '/day', description: 'In-person team training session.' },
  { name: 'Additional Storage — 100GB', price: 2200, unit: '/mo', description: 'Extra document and attachment storage.' },
];

interface SeedResult {
  collections: Collections;
  teamProfiles: Profile[];
}

export function buildDemoSeed(): SeedResult {
  const rand = mulberry32(20261123);
  const orgId = DEMO_ORG_ID;

  // ── Team ──
  const roles: Role[] = ['admin', 'executive', 'sales_rep', 'sales_rep', 'sales_rep'];
  const teamNames = ['Priya Sharma', 'Rahul Mehta', 'Ananya Iyer', 'Dev Kapoor', 'Nisha Rao'];
  const teamProfiles: Profile[] = teamNames.map((name, i) => ({
    id: `profile_demo_${i}`,
    orgId,
    email: `${slug(name)}@carevaplus.example`,
    name,
    role: roles[i],
    title: roles[i] === 'admin' ? 'Founder & CEO' : roles[i] === 'executive' ? 'VP of Sales' : 'Account Executive',
    avatarHue: intRange(rand, 0, 359),
    createdAt: daysFromNow(-intRange(rand, 180, 400)),
  }));
  const ownerIds = teamProfiles.filter((p) => p.role !== 'admin').map((p) => p.id);
  const ownerOf = () => pick(rand, ownerIds);

  // ── Companies ──
  const companies: Record<string, Company> = {};
  const companyIds: string[] = [];
  for (let i = 0; i < 22; i++) {
    const name = companyName(rand);
    const id = uid('cmp_');
    companyIds.push(id);
    companies[id] = {
      id,
      orgId,
      name,
      domain: `${slug(name)}.com`,
      industry: pick(rand, INDUSTRIES),
      size: pick(rand, SIZES),
      phone: `+91 ${intRange(rand, 70000, 99999)}${intRange(rand, 10000, 99999)}`,
      city: pick(rand, CITIES),
      country: 'India',
      website: `https://${slug(name)}.com`,
      ownerId: ownerOf(),
      tags: pickSome(rand, TAG_POOL, 0, 2),
      createdAt: daysFromNow(-intRange(rand, 10, 300)),
      updatedAt: daysFromNow(-intRange(rand, 0, 20)),
    };
  }

  // ── Contacts ──
  const contacts: Record<string, Contact> = {};
  const contactIds: string[] = [];
  const statusWeights: ContactStatus[] = ['lead', 'lead', 'lead', 'prospect', 'prospect', 'customer', 'customer', 'customer', 'churned'];
  const usedEmails = new Set<string>();
  for (const companyId of companyIds) {
    const n = intRange(rand, 1, 3);
    for (let i = 0; i < n; i++) {
      const first = pick(rand, FIRST_NAMES);
      const last = pick(rand, LAST_NAMES);
      const id = uid('con_');
      let email = `${slug(first)}.${slug(last)}@${companies[companyId].domain}`;
      if (usedEmails.has(email)) email = `${slug(first)}.${slug(last)}${intRange(rand, 2, 99)}@${companies[companyId].domain}`;
      usedEmails.add(email);
      contactIds.push(id);
      contacts[id] = {
        id,
        orgId,
        firstName: first,
        lastName: last,
        email,
        phone: `+91 ${intRange(rand, 70000, 99999)}${intRange(rand, 10000, 99999)}`,
        title: pick(rand, ['Procurement Manager', 'Operations Head', 'CEO', 'Marketing Director', 'CFO', 'Store Manager', 'VP Operations', 'Founder']),
        companyId,
        status: pick(rand, statusWeights),
        source: pick(rand, SOURCES),
        ownerId: ownerOf(),
        tags: pickSome(rand, TAG_POOL, 0, 1),
        avatarHue: intRange(rand, 0, 359),
        createdAt: daysFromNow(-intRange(rand, 5, 280)),
        updatedAt: daysFromNow(-intRange(rand, 0, 15)),
      };
    }
  }
  // A handful of standalone contacts with no company
  for (let i = 0; i < 5; i++) {
    const first = pick(rand, FIRST_NAMES);
    const last = pick(rand, LAST_NAMES);
    const id = uid('con_');
    contactIds.push(id);
    contacts[id] = {
      id,
      orgId,
      firstName: first,
      lastName: last,
      email: `${slug(first)}.${slug(last)}@gmail.com`,
      phone: `+91 ${intRange(rand, 70000, 99999)}${intRange(rand, 10000, 99999)}`,
      status: 'lead',
      source: pick(rand, SOURCES),
      ownerId: ownerOf(),
      tags: [],
      avatarHue: intRange(rand, 0, 359),
      createdAt: daysFromNow(-intRange(rand, 1, 60)),
      updatedAt: daysFromNow(-intRange(rand, 0, 10)),
    };
  }

  // ── Pipeline & stages ──
  const pipelineId = uid('pipe_');
  const pipelines: Record<string, Pipeline> = {
    [pipelineId]: { id: pipelineId, orgId, name: 'Sales Pipeline', isDefault: true },
  };
  const stages: Record<string, PipelineStage> = {};
  const stageIds: string[] = [];
  STAGE_DEFS.forEach((s, i) => {
    const id = uid('stg_');
    stageIds.push(id);
    stages[id] = { id, orgId, pipelineId, name: s.name, order: i, color: s.color, probability: s.probability, isWon: s.isWon, isLost: s.isLost };
  });
  const openStageIds = stageIds.slice(0, 4);
  const wonStageId = stageIds[4];
  const lostStageId = stageIds[5];

  // ── Deals ──
  const deals: Record<string, Deal> = {};
  const dealIds: string[] = [];
  const activities: Record<string, Activity> = {};
  function pushActivity(a: Omit<Activity, 'id' | 'orgId'>) {
    const id = uid('act_');
    activities[id] = { id, orgId, ...a };
    return id;
  }

  for (let i = 0; i < 52; i++) {
    const companyId = pick(rand, companyIds);
    const companyContacts = contactIds.filter((cid) => contacts[cid].companyId === companyId);
    const contactId = companyContacts.length ? pick(rand, companyContacts) : undefined;
    const outcome = rand();
    const id = uid('deal_');
    dealIds.push(id);
    const amount = Math.round(range(rand, 45000, 2200000) / 1000) * 1000;
    const ownerId = ownerOf();
    const createdAt = daysFromNow(-intRange(rand, 3, 150));

    let stageId: string;
    let status: Deal['status'];
    let closedAt: string | undefined;
    let expectedCloseDate: string | undefined = daysFromNow(intRange(rand, -10, 60));
    let lostReason: string | undefined;

    if (outcome < 0.28) {
      stageId = wonStageId;
      status = 'won';
      closedAt = daysFromNow(-intRange(rand, 1, 90));
      expectedCloseDate = closedAt;
    } else if (outcome < 0.42) {
      stageId = lostStageId;
      status = 'lost';
      closedAt = daysFromNow(-intRange(rand, 1, 90));
      expectedCloseDate = closedAt;
      lostReason = pick(rand, ['Budget constraints', 'Chose a competitor', 'Project postponed', 'No longer a fit', 'Lost contact']);
    } else {
      stageId = pick(rand, openStageIds);
      status = 'open';
    }

    deals[id] = {
      id,
      orgId,
      name: pick(rand, DEAL_NAME_TEMPLATES).replace('{company}', companies[companyId].name),
      pipelineId,
      stageId,
      amount,
      currency: 'INR',
      contactId,
      companyId,
      ownerId,
      expectedCloseDate,
      closedAt,
      status,
      lostReason,
      createdAt,
      updatedAt: closedAt ?? daysFromNow(-intRange(rand, 0, 10)),
    };

    pushActivity({ type: 'deal_created', body: `Deal created: ${deals[id].name}`, authorId: ownerId, dealId: id, companyId, contactId, at: createdAt });
    if (status === 'won') pushActivity({ type: 'deal_won', body: `Deal won — ₹${amount.toLocaleString('en-IN')}`, authorId: ownerId, dealId: id, companyId, contactId, at: closedAt! });
    if (status === 'lost') pushActivity({ type: 'deal_lost', body: `Deal lost — ${lostReason}`, authorId: ownerId, dealId: id, companyId, contactId, at: closedAt! });
    if (status === 'open' && rand() > 0.5) {
      pushActivity({ type: 'stage_change', body: `Moved to ${stages[stageId].name}`, authorId: ownerId, dealId: id, companyId, contactId, at: daysFromNow(-intRange(rand, 0, 20)) });
    }
  }

  // ── Extra activity texture on contacts/companies ──
  const NOTE_TEMPLATES = [
    'Had a great call — they are keen to move forward next quarter.',
    'Sent over the updated proposal with revised pricing.',
    'Following up after the trade show — strong interest.',
    'Discussed rollout timeline with their operations team.',
    'They asked for references from similar-sized customers.',
    'Pricing approved internally; waiting on procurement sign-off.',
    'Rescheduled the demo to next week per their request.',
    'Introduced to their regional manager for a wider rollout.',
  ];
  const ACTIVITY_TYPES: ActivityType[] = ['note', 'call', 'email', 'meeting'];
  for (let i = 0; i < 70; i++) {
    const contactId = pick(rand, contactIds);
    const contact = contacts[contactId];
    pushActivity({
      type: pick(rand, ACTIVITY_TYPES),
      body: pick(rand, NOTE_TEMPLATES),
      authorId: contact.ownerId ?? ownerOf(),
      contactId,
      companyId: contact.companyId,
      at: daysFromNow(-intRange(rand, 0, 60)),
    });
  }

  // ── Tasks ──
  const tasks: Record<string, Task> = {};
  const TASK_TITLES: Record<TaskType, string[]> = {
    call: ['Call to discuss proposal', 'Follow-up call on pricing', 'Check-in call', 'Discovery call'],
    email: ['Send revised quote', 'Email case study', 'Send contract for signature', 'Follow-up email'],
    meeting: ['Demo meeting', 'Quarterly business review', 'Onboarding kickoff', 'Negotiation meeting'],
    follow_up: ['Follow up on last conversation', 'Check if proposal was reviewed', 'Nudge about renewal'],
    todo: ['Prepare proposal deck', 'Update CRM records', 'Research account background', 'Draft contract'],
  };
  const TASK_TYPES: TaskType[] = ['call', 'email', 'meeting', 'follow_up', 'todo'];
  const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
  for (let i = 0; i < 46; i++) {
    const type = pick(rand, TASK_TYPES);
    const id = uid('task_');
    const linkRoll = rand();
    const dealId = linkRoll < 0.5 ? pick(rand, dealIds) : undefined;
    const contactId = dealId ? deals[dealId].contactId : rand() < 0.6 ? pick(rand, contactIds) : undefined;
    const dueOffset = intRange(rand, -8, 18);
    const done = dueOffset < -1 ? rand() < 0.75 : dueOffset < 0 ? rand() < 0.3 : false;
    tasks[id] = {
      id,
      orgId,
      title: pick(rand, TASK_TITLES[type]),
      type,
      priority: pick(rand, PRIORITIES),
      dueAt: daysFromNow(dueOffset),
      done,
      doneAt: done ? daysFromNow(dueOffset - intRange(rand, 0, 2)) : undefined,
      assigneeId: ownerOf(),
      contactId,
      companyId: contactId ? contacts[contactId].companyId : undefined,
      dealId,
      createdAt: daysFromNow(dueOffset - intRange(rand, 2, 10)),
    };
  }

  // ── Products ──
  const products: Record<string, Product> = {};
  const productIds: string[] = [];
  for (const def of PRODUCT_DEFS) {
    const id = uid('prod_');
    productIds.push(id);
    products[id] = { id, orgId, name: def.name, sku: `SKU-${intRange(rand, 1000, 9999)}`, price: def.price, unit: def.unit, description: def.description, active: true, createdAt: daysFromNow(-intRange(rand, 60, 300)) };
  }

  function makeLineItems(): LineItem[] {
    const chosen = pickSome(rand, productIds, 1, 4);
    return chosen.map((pid) => ({
      id: uid('li_'),
      productId: pid,
      name: products[pid].name,
      qty: intRange(rand, 1, 12),
      unitPrice: products[pid].price,
      discountPct: pick(rand, [0, 0, 0, 5, 10]),
    }));
  }

  // ── Quotes ──
  const quotes: Record<string, Quote> = {};
  const quoteIds: string[] = [];
  const QUOTE_STATUSES: QuoteStatus[] = ['draft', 'sent', 'sent', 'accepted', 'declined', 'expired'];
  for (let i = 0; i < 10; i++) {
    const dealId = pick(rand, dealIds);
    const deal = deals[dealId];
    const id = uid('quo_');
    quoteIds.push(id);
    quotes[id] = {
      id,
      orgId,
      number: `Q-${2600 + i}`,
      contactId: deal.contactId,
      companyId: deal.companyId,
      dealId,
      status: pick(rand, QUOTE_STATUSES),
      items: makeLineItems(),
      taxPct: 18,
      validUntil: daysFromNow(intRange(rand, 5, 30)),
      ownerId: deal.ownerId,
      createdAt: daysFromNow(-intRange(rand, 1, 60)),
      updatedAt: daysFromNow(-intRange(rand, 0, 10)),
    };
  }

  // ── Invoices ──
  const invoices: Record<string, Invoice> = {};
  const INVOICE_STATUSES: InvoiceStatus[] = ['sent', 'paid', 'paid', 'overdue', 'draft'];
  const acceptedQuotes = quoteIds.filter((qid) => quotes[qid].status === 'accepted');
  const invoiceSourceQuotes = acceptedQuotes.length ? acceptedQuotes : quoteIds.slice(0, 6);
  for (let i = 0; i < Math.min(7, invoiceSourceQuotes.length); i++) {
    const quote = quotes[invoiceSourceQuotes[i]];
    const id = uid('inv_');
    const status = pick(rand, INVOICE_STATUSES);
    invoices[id] = {
      id,
      orgId,
      number: `INV-${3100 + i}`,
      quoteId: quote.id,
      contactId: quote.contactId,
      companyId: quote.companyId,
      status,
      items: quote.items,
      taxPct: quote.taxPct,
      dueDate: daysFromNow(intRange(rand, -15, 20)),
      paidAt: status === 'paid' ? daysFromNow(-intRange(rand, 1, 30)) : undefined,
      createdAt: daysFromNow(-intRange(rand, 5, 45)),
      updatedAt: daysFromNow(-intRange(rand, 0, 10)),
    };
  }

  // ── Message log (Email / WhatsApp / SMS) ──
  const messageLog: Record<string, MessageLogEntry> = {};
  const EMAIL_SUBJECTS = ['Following up on our call', 'Proposal attached', 'Quick question about rollout', 'Re: Pricing discussion', 'Introduction & next steps', 'Contract for review'];
  const WHATSAPP_BODIES = [
    'Hi! Just following up on the proposal we sent over — any questions?',
    'Thanks for the call today, sharing the pricing sheet here shortly 👍',
    'Quick reminder: demo is scheduled for tomorrow at 11am.',
    'Appreciate the quick turnaround on the paperwork!',
    'Sending the updated quote on email as well — let me know if it works.',
  ];
  const SMS_BODIES = [
    'Reminder: your renewal is due this week. Reply CALL ME for a callback.',
    'Your invoice has been sent to your email. Thank you for your business!',
    'Hi, this is Careva+ CRM — could we reschedule our call to 3pm?',
    'Quick check-in: did the contract reach you okay?',
  ];
  const MESSAGE_CHANNEL_WEIGHTS: MessageChannel[] = ['email', 'email', 'email', 'whatsapp', 'whatsapp', 'sms'];
  for (let i = 0; i < 36; i++) {
    const contactId = pick(rand, contactIds);
    const contact = contacts[contactId];
    const author = contact.ownerId ?? ownerOf();
    const authorEmail = teamProfiles.find((p) => p.id === author)?.email ?? 'team@carevaplus.example';
    const id = uid('msg_');
    const channel = pick(rand, MESSAGE_CHANNEL_WEIGHTS);
    const direction = rand() < 0.65 ? 'outbound' : 'inbound';
    const base = {
      id,
      orgId,
      channel,
      direction,
      contactId,
      authorId: author,
      at: daysFromNow(-intRange(rand, 0, 50)),
    } as const;
    if (channel === 'email') {
      messageLog[id] = {
        ...base,
        subject: pick(rand, EMAIL_SUBJECTS),
        body: pick(rand, NOTE_TEMPLATES),
        to: contact.email ?? `${slug(contact.firstName)}@example.com`,
        from: authorEmail,
      };
    } else if (channel === 'whatsapp') {
      messageLog[id] = {
        ...base,
        body: pick(rand, WHATSAPP_BODIES),
        to: contact.phone ?? '+91 90000 00000',
      };
    } else {
      messageLog[id] = {
        ...base,
        body: pick(rand, SMS_BODIES),
        to: contact.phone ?? '+91 90000 00000',
      };
    }
  }

  const collections: Collections = {
    companies,
    contacts,
    pipelines,
    stages,
    deals,
    tasks,
    activities,
    products,
    quotes,
    invoices,
    messageLog,
    profiles: Object.fromEntries(teamProfiles.map((p) => [p.id, p])),
  };

  return { collections, teamProfiles };
}
