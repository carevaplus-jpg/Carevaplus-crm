import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { CommandPalette } from './CommandPalette';
import { InstallPrompt } from './InstallPrompt';
import { useUi } from '@/store/ui';
import { usePrefs } from '@/store/prefs';
import { useTaskReminders } from '@/lib/notifications';

export function AppLayout() {
  const [commandOpen, setCommandOpen] = useState(false);
  const mobileNavOpen = useUi((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUi((s) => s.setMobileNavOpen);
  const taskReminders = usePrefs((s) => s.taskReminders);
  useTaskReminders(taskReminders);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative flex min-h-screen">
      <div className="aurora-bg" aria-hidden="true" />
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        <Topbar onOpenCommand={() => setCommandOpen(true)} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <InstallPrompt />
    </div>
  );
}
