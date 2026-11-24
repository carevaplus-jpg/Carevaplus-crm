import type { BadgeTone } from '@/ui/Badge';
import type { ContactStatus, InvoiceStatus, QuoteStatus, TaskPriority } from '@/types';

export const CONTACT_STATUS: Record<ContactStatus, { label: string; tone: BadgeTone }> = {
  lead: { label: 'Lead', tone: 'neutral' },
  prospect: { label: 'Prospect', tone: 'brand' },
  customer: { label: 'Customer', tone: 'success' },
  churned: { label: 'Churned', tone: 'danger' },
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'brand' },
  accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
  expired: { label: 'Expired', tone: 'warning' },
};

export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'brand' },
  paid: { label: 'Paid', tone: 'success' },
  overdue: { label: 'Overdue', tone: 'danger' },
  void: { label: 'Void', tone: 'neutral' },
};

export const TASK_PRIORITY: Record<TaskPriority, { label: string; tone: BadgeTone }> = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'warning' },
  high: { label: 'High', tone: 'danger' },
};
