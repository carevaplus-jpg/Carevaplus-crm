/**
 * Careva+ CRM data model.
 *
 * Every record carries `id`, `orgId`, `createdAt`, `updatedAt` for sync and
 * multi-tenant isolation. Enums are modeled as string-literal unions (not TS
 * `enum`) to stay compatible with `erasableSyntaxOnly`.
 */

export type Role = 'admin' | 'executive' | 'sales_rep';

export interface Profile {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: Role;
  title?: string;
  avatarHue: number;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

// ── Companies & Contacts ─────────────────────────────────────────────────

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';

export interface Company {
  id: string;
  orgId: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: CompanySize;
  phone?: string;
  city?: string;
  country?: string;
  website?: string;
  ownerId?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'churned';

export interface Contact {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  title?: string;
  companyId?: string;
  status: ContactStatus;
  source?: string;
  ownerId?: string;
  tags: string[];
  avatarHue: number;
  createdAt: string;
  updatedAt: string;
}

// ── Pipeline & Deals ──────────────────────────────────────────────────────

export interface PipelineStage {
  id: string;
  orgId: string;
  pipelineId: string;
  name: string;
  order: number;
  color: string;
  /** Probability (0-1) used for weighted-pipeline reporting. */
  probability: number;
  isWon?: boolean;
  isLost?: boolean;
}

export interface Pipeline {
  id: string;
  orgId: string;
  name: string;
  isDefault: boolean;
}

export interface Deal {
  id: string;
  orgId: string;
  name: string;
  pipelineId: string;
  stageId: string;
  amount: number;
  currency: 'INR' | 'USD';
  contactId?: string;
  companyId?: string;
  ownerId?: string;
  expectedCloseDate?: string;
  closedAt?: string;
  status: 'open' | 'won' | 'lost';
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Tasks & Activities ────────────────────────────────────────────────────

export type TaskType = 'call' | 'email' | 'meeting' | 'follow_up' | 'todo';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  orgId: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  dueAt: string;
  done: boolean;
  doneAt?: string;
  assigneeId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  notes?: string;
  createdAt: string;
}

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'task_done' | 'deal_created' | 'deal_won' | 'deal_lost';

export interface Activity {
  id: string;
  orgId: string;
  type: ActivityType;
  body: string;
  authorId?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  meta?: Record<string, string>;
  at: string;
}

// ── Products, Quotes, Invoices ───────────────────────────────────────────

export interface Product {
  id: string;
  orgId: string;
  name: string;
  sku?: string;
  price: number;
  unit?: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface LineItem {
  id: string;
  productId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';

export interface Quote {
  id: string;
  orgId: string;
  number: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  status: QuoteStatus;
  items: LineItem[];
  taxPct: number;
  notes?: string;
  validUntil?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export interface Invoice {
  id: string;
  orgId: string;
  number: string;
  quoteId?: string;
  contactId?: string;
  companyId?: string;
  status: InvoiceStatus;
  items: LineItem[];
  taxPct: number;
  dueDate: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Communication log (Email / WhatsApp / SMS) ───────────────────────────

export type MessageChannel = 'email' | 'whatsapp' | 'sms';

export interface MessageLogEntry {
  id: string;
  orgId: string;
  channel: MessageChannel;
  direction: 'outbound' | 'inbound';
  subject?: string;
  body: string;
  to: string;
  from?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  authorId?: string;
  at: string;
}

// ── Collections wrapper ──────────────────────────────────────────────────

export interface Collections {
  companies: Record<string, Company>;
  contacts: Record<string, Contact>;
  pipelines: Record<string, Pipeline>;
  stages: Record<string, PipelineStage>;
  deals: Record<string, Deal>;
  tasks: Record<string, Task>;
  activities: Record<string, Activity>;
  products: Record<string, Product>;
  quotes: Record<string, Quote>;
  invoices: Record<string, Invoice>;
  messageLog: Record<string, MessageLogEntry>;
  profiles: Record<string, Profile>;
}

export type CollectionName = keyof Collections;
export const COLLECTIONS: CollectionName[] = [
  'companies',
  'contacts',
  'pipelines',
  'stages',
  'deals',
  'tasks',
  'activities',
  'products',
  'quotes',
  'invoices',
  'messageLog',
  'profiles',
];
