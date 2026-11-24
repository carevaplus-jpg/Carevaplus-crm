import { useNavigate } from 'react-router-dom';
import { Search, Plus, Menu as MenuIcon, UserPlus, Building2, KanbanSquare, CheckSquare, FileText, Settings } from 'lucide-react';
import { useCurrentProfile } from '@/store/selectors';
import { useUi, type QuickAddKind } from '@/store/ui';
import { Avatar, Menu } from '@/ui';

const CREATE_ROUTES: Record<QuickAddKind, string> = {
  contact: '/contacts',
  company: '/companies',
  deal: '/deals',
  task: '/tasks',
  quote: '/quotes',
};

export function Topbar({ onOpenCommand, onOpenMobileNav }: { onOpenCommand: () => void; onOpenMobileNav: () => void }) {
  const profile = useCurrentProfile();
  const setRequestNew = useUi((s) => s.setRequestNew);
  const navigate = useNavigate();

  const quickAdd = (kind: QuickAddKind) => {
    navigate(CREATE_ROUTES[kind]);
    setRequestNew(kind);
  };

  return (
    <header className="glass-bar safe-top safe-x sticky top-0 z-30 shrink-0 border-b border-white/40 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 lg:px-6" style={{ paddingBottom: 0, minHeight: 64 }}>
      <button onClick={onOpenMobileNav} aria-label="Open navigation menu" className="lg:hidden h-9 w-9 shrink-0 flex items-center justify-center rounded-lg hover:bg-surface-100 text-ink-600 press-scale">
        <MenuIcon className="size-5" />
      </button>

      <button
        onClick={onOpenCommand}
        className="flex flex-1 min-w-0 max-w-sm items-center gap-2.5 px-3 rounded-full bg-white/60 ring-1 ring-white/70 text-ink-500 text-sm hover:bg-white/80 transition-colors press-scale"
        style={{ height: 38 }}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 min-w-0 text-left truncate">Search contacts, deals…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-ink-400 bg-white ring-1 ring-surface-300 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>

      <div className="hidden sm:block flex-1" />

      <Menu
        trigger={
          <button aria-label="Create" className="inline-flex shrink-0 items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3.5 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-all shadow-card press-scale hover-lift">
            <Plus className="size-4" /> <span className="hidden sm:inline">Create</span>
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
            <button aria-label="Account menu" className="flex shrink-0 items-center">
              <Avatar name={profile.name} hue={profile.avatarHue} size={34} />
            </button>
          }
          items={[{ label: 'Settings & Team', icon: <Settings className="size-4" />, onClick: () => navigate('/settings') }]}
        />
      )}
    </header>
  );
}
