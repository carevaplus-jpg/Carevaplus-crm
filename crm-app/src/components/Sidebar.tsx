import { NavLink } from 'react-router-dom';
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
  Crown,
} from 'lucide-react';
import { cn } from '@/ui';
import { useTasks } from '@/store/selectors';

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
];

export function Sidebar() {
  const tasks = useTasks();
  const dueToday = tasks.filter((t) => !t.done && new Date(t.dueAt) <= new Date()).length;

  return (
    <aside className="relative z-10 hidden lg:flex w-[248px] shrink-0 flex-col h-screen sticky top-0 p-3">
      <div className="glass-navy glass-sheen flex flex-col h-full rounded-[var(--radius-2xl)] text-white/90 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 h-16 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold animate-[floatY_6s_ease-in-out_infinite]">
            <Crown className="size-4 text-navy-900" strokeWidth={2.4} fill="currentColor" />
          </div>
          <div className="leading-tight">
            <p className="font-display font-bold text-white text-[15px] tracking-tight">Careva+</p>
            <p className="text-[10px] text-gold-400 font-medium tracking-wide uppercase">CRM</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-0.5">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 rounded-xl text-[13.5px] font-medium transition-all duration-200 relative',
                  isActive ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]' : 'text-white/55 hover:text-white/90 hover:bg-white/5 hover:translate-x-0.5',
                )
              }
              style={{ height: 38 }}
            >
              <item.icon className="size-[17px]" strokeWidth={2} />
              <span className="flex-1">{item.label}</span>
              {item.to === '/tasks' && dueToday > 0 && (
                <span className="text-[10px] font-bold bg-gold-500 text-navy-900 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{dueToday}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn('flex items-center gap-2.5 px-3 rounded-xl text-[13.5px] font-medium transition-all duration-200', isActive ? 'bg-white/12 text-white' : 'text-white/55 hover:text-white/90 hover:bg-white/5 hover:translate-x-0.5')
            }
            style={{ height: 38 }}
          >
            <Settings className="size-[17px]" strokeWidth={2} />
            Settings &amp; Team
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
