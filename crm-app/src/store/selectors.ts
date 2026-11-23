import { useMemo } from 'react';
import { useStore } from './index';
import type { Activity, Company, Contact, Deal, Invoice, PipelineStage, Product, Profile, Quote, Task } from '@/types';

export const values = <T,>(r: Record<string, T>): T[] => Object.values(r);

export function useOrgId(): string {
  return useStore((s) => s.orgId);
}

export function useCurrentProfile(): Profile | null {
  const id = useStore((s) => s.currentProfileId);
  const profiles = useStore((s) => s.data.profiles);
  return id ? (profiles[id] ?? null) : null;
}

export function useTeam(): Profile[] {
  const profiles = useStore((s) => s.data.profiles);
  return useMemo(() => values(profiles).sort((a, b) => a.name.localeCompare(b.name)), [profiles]);
}

export function useCompanies(): Company[] {
  const companies = useStore((s) => s.data.companies);
  return useMemo(() => values(companies).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [companies]);
}

export function useCompany(id?: string): Company | undefined {
  return useStore((s) => (id ? s.data.companies[id] : undefined));
}

export function useContacts(): Contact[] {
  const contacts = useStore((s) => s.data.contacts);
  return useMemo(() => values(contacts).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [contacts]);
}

export function useContact(id?: string): Contact | undefined {
  return useStore((s) => (id ? s.data.contacts[id] : undefined));
}

export function useContactsForCompany(companyId?: string): Contact[] {
  const contacts = useStore((s) => s.data.contacts);
  return useMemo(() => (companyId ? values(contacts).filter((c) => c.companyId === companyId) : []), [contacts, companyId]);
}

export function useStages(pipelineId?: string): PipelineStage[] {
  const stages = useStore((s) => s.data.stages);
  return useMemo(() => {
    const list = values(stages).filter((s) => !pipelineId || s.pipelineId === pipelineId);
    return list.sort((a, b) => a.order - b.order);
  }, [stages, pipelineId]);
}

export function useDefaultPipelineId(): string | undefined {
  const pipelines = useStore((s) => s.data.pipelines);
  return useMemo(() => values(pipelines).find((p) => p.isDefault)?.id ?? values(pipelines)[0]?.id, [pipelines]);
}

export function useDeals(): Deal[] {
  const deals = useStore((s) => s.data.deals);
  return useMemo(() => values(deals).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [deals]);
}

export function useDeal(id?: string): Deal | undefined {
  return useStore((s) => (id ? s.data.deals[id] : undefined));
}

export function useDealsForCompany(companyId?: string): Deal[] {
  const deals = useStore((s) => s.data.deals);
  return useMemo(() => (companyId ? values(deals).filter((d) => d.companyId === companyId) : []), [deals, companyId]);
}

export function useDealsForContact(contactId?: string): Deal[] {
  const deals = useStore((s) => s.data.deals);
  return useMemo(() => (contactId ? values(deals).filter((d) => d.contactId === contactId) : []), [deals, contactId]);
}

export function useTasks(): Task[] {
  const tasks = useStore((s) => s.data.tasks);
  return useMemo(() => values(tasks).sort((a, b) => a.dueAt.localeCompare(b.dueAt)), [tasks]);
}

export function useTasksFor(filter: { contactId?: string; companyId?: string; dealId?: string }): Task[] {
  const tasks = useStore((s) => s.data.tasks);
  return useMemo(
    () =>
      values(tasks)
        .filter((t) => (filter.contactId ? t.contactId === filter.contactId : true))
        .filter((t) => (filter.companyId ? t.companyId === filter.companyId : true))
        .filter((t) => (filter.dealId ? t.dealId === filter.dealId : true))
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [tasks, filter.contactId, filter.companyId, filter.dealId],
  );
}

export function useActivitiesFor(filter: { contactId?: string; companyId?: string; dealId?: string }): Activity[] {
  const activities = useStore((s) => s.data.activities);
  return useMemo(
    () =>
      values(activities)
        .filter((a) => (filter.contactId ? a.contactId === filter.contactId : true))
        .filter((a) => (filter.companyId ? a.companyId === filter.companyId : true))
        .filter((a) => (filter.dealId ? a.dealId === filter.dealId : true))
        .sort((a, b) => b.at.localeCompare(a.at)),
    [activities, filter.contactId, filter.companyId, filter.dealId],
  );
}

export function useProducts(): Product[] {
  const products = useStore((s) => s.data.products);
  return useMemo(() => values(products).sort((a, b) => a.name.localeCompare(b.name)), [products]);
}

export function useQuotes(): Quote[] {
  const quotes = useStore((s) => s.data.quotes);
  return useMemo(() => values(quotes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [quotes]);
}

export function useQuote(id?: string): Quote | undefined {
  return useStore((s) => (id ? s.data.quotes[id] : undefined));
}

export function useInvoices(): Invoice[] {
  const invoices = useStore((s) => s.data.invoices);
  return useMemo(() => values(invoices).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [invoices]);
}

export function lineItemsTotal(items: { qty: number; unitPrice: number; discountPct: number }[], taxPct: number) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice * (1 - i.discountPct / 100), 0);
  const tax = subtotal * (taxPct / 100);
  return { subtotal, tax, total: subtotal + tax };
}
