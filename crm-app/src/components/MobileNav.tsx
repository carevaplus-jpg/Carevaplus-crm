import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { X, Crown } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Building2,
  KanbanSquare,
  CheckSquare,
  CalendarDays,
  Package,
  FileText,
  Receipt,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/deals', label: 'Deals', icon: KanbanSquare },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/quotes', label: 'Quotes', icon: FileText },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings & Team', icon: Settings },
];

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[65] lg:hidden">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="glass-navy relative h-full w-[260px] text-white/90 flex flex-col animate-[slideIn_.26s_var(--ease-spring)]">
        <div className="flex items-center justify-between px-4 h-16 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <Crown className="size-4 text-navy-900" fill="currentColor" />
            </div>
            <span className="font-display font-bold">Careva+</span>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10">
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => cn('flex items-center gap-2.5 px-3 rounded-xl text-sm font-medium transition-colors', isActive ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/90')}
              style={{ height: 42 }}
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(-100%) } to { transform: translateX(0) } }`}</style>
    </div>,
    document.body,
  );
}
