import { useNavigate } from 'react-router-dom';
import { Search, Plus, Menu as MenuIcon, UserPlus, Building2, KanbanSquare, CheckSquare, FileText } from 'lucide-react';
import { useStore } from '@/store';
import { useCurrentProfile, useTeam } from '@/store/selectors';
import { useUi, type QuickAddKind } from '@/store/ui';
import { Avatar, Badge, Menu } from '@/ui';
import { cloudEnabled } from '@/lib/supabase';

const CREATE_ROUTES: Record<QuickAddKind, string> = {
  contact: '/contacts',
  company: '/companies',
  deal: '/deals',
  task: '/tasks',
  quote: '/quotes',
};

export function Topbar({ onOpenCommand, onOpenMobileNav }: { onOpenCommand: () => void; onOpenMobileNav: () => void }) {
  const profile = useCurrentProfile();
  const team = useTeam();
  const setProfile = useStore((s) => s.setCurrentProfile);
  const setRequestNew = useUi((s) => s.setRequestNew);
  const navigate = useNavigate();

  const quickAdd = (kind: QuickAddKind) => {
    navigate(CREATE_ROUTES[kind]);
    setRequestNew(kind);
  };

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 bg-surface-0/85 backdrop-blur border-b border-surface-200 flex items-center gap-3 px-4 lg:px-6">
      <button onClick={onOpenMobileNav} aria-label="Open navigation menu" className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-surface-100 text-ink-600">
        <MenuIcon className="size-5" />
      </button>

      <button
        onClick={onOpenCommand}
        className="flex items-center gap-2.5 px-3 rounded-lg bg-surface-100 text-ink-500 text-sm w-full max-w-sm hover:bg-surface-200/70 transition-colors"
        style={{ height: 38 }}
      >
        <Search className="size-4" />
        <span className="flex-1 text-left truncate">Search contacts, companies, deals…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-ink-400 bg-white ring-1 ring-surface-300 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>

      <div className="flex-1" />

      {!cloudEnabled && (
        <Badge tone="gold" className="hidden md:inline-flex">
          Demo mode
        </Badge>
      )}

      <Menu
        trigger={
          <button className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-card">
            <Plus className="size-4" /> Create
          </button>
        }
        items={[
          { label: 'Contact', icon: <UserPlus className="size-4" />, onClick: () => quickAdd('contact') },
          { label: 'Company', icon: <Building2 className="size-4" />, onClick: () => quickAdd('company') },
          { label: 'Deal', icon: <KanbanSquare className="size-4" />, onClick: () => quickAdd('deal') },
          { label: 'Task', icon: <CheckSquare className="size-4" />, onClick: () => quickAdd('task') },
          { label: 'Quote', icon: <FileText className="size-4" />, onClick: () => quickAdd('quote') },
        ]}
      />

      {profile && (
        <Menu
          trigger={
            <button className="flex items-center gap-2 pl-1 pr-1">
              <Avatar name={profile.name} hue={profile.avatarHue} size={34} />
            </button>
          }
          items={[
            ...team
              .filter((p) => p.id !== profile.id)
              .map((p) => ({ label: `Switch to ${p.name.split(' ')[0]}`, onClick: () => setProfile(p.id) })),
            { label: 'Settings & Team', onClick: () => navigate('/settings') },
          ]}
        />
      )}
    </header>
  );
}
