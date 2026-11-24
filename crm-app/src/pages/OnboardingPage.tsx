import { useState, type FormEvent } from 'react';
import { Crown, ShieldCheck, ArrowRight } from 'lucide-react';
import { useStore } from '@/store';
import { Button, Input } from '@/ui';
import { RestoreBackupButton } from '@/components/BackupButtons';

export function OnboardingPage() {
  const setupWorkspace = useStore((s) => s.setupWorkspace);
  const [ownerName, setOwnerName] = useState('');
  const [ownerTitle, setOwnerTitle] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [companyName, setCompanyName] = useState('');

  const ready = ownerName.trim() && companyName.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setupWorkspace({ ownerName, ownerTitle, ownerEmail, companyName });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 safe-top safe-bottom">
      <div className="aurora-bg" aria-hidden="true" />
      <form onSubmit={submit} className="glass-panel glass-sheen relative z-10 w-full max-w-md rounded-[var(--radius-2xl)] p-6 sm:p-8 animate-[pop_.4s_var(--ease-spring)]">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold animate-[floatY_6s_ease-in-out_infinite]">
          <Crown className="size-6 text-navy-900" strokeWidth={2.4} fill="currentColor" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink-900 mt-5 tracking-tight">Welcome to Careva+ CRM</h1>
        <p className="text-sm text-ink-500 mt-1.5">Set up your company workspace — it takes 20 seconds.</p>

        <div className="space-y-4 mt-6">
          <Input label="Your name" required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="e.g. Priya Sharma" autoComplete="name" autoFocus />
          <Input label="Your role" value={ownerTitle} onChange={(e) => setOwnerTitle(e.target.value)} placeholder="e.g. Founder & CEO" autoComplete="organization-title" />
          <Input label="Your email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
          <Input label="Company name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Careva+" autoComplete="organization" />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full mt-6" disabled={!ready} iconRight={<ArrowRight className="size-4" />}>
          Create my workspace
        </Button>

        <div className="flex items-center gap-3 my-4 text-xs text-ink-400">
          <span className="h-px flex-1 bg-surface-200" /> or <span className="h-px flex-1 bg-surface-200" />
        </div>
        <RestoreBackupButton variant="secondary" className="w-full" />

        <p className="flex items-start gap-2 text-xs text-ink-500 mt-5">
          <ShieldCheck className="size-4 shrink-0 text-success-600" />
          Your data stays on this device. You start with an empty CRM and a ready-made sales pipeline.
        </p>
      </form>
    </div>
  );
}
