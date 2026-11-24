import { useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { Button } from '@/ui';
import { applyPwaUpdate, isNativeApp, onPwaUpdate } from '@/lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'careva-crm-install-dismissed';

function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');

  useEffect(() => {
    if (isNativeApp() || isStandalone()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  useEffect(() => onPwaUpdate(() => setUpdateReady(true)), []);

  if (isNativeApp()) return null;

  if (updateReady) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-[riseIn_.3s_cubic-bezier(.16,1,.3,1)]">
        <div className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3 shadow-float">
          <RefreshCw className="size-4 text-brand-600 shrink-0" />
          <p className="text-sm text-ink-800">A new version of Careva+ CRM is ready.</p>
          <Button size="sm" variant="primary" onClick={applyPwaUpdate}>Refresh</Button>
        </div>
      </div>
    );
  }

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 animate-[riseIn_.3s_cubic-bezier(.16,1,.3,1)]">
      <div className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-3 shadow-float max-w-md sm:w-[420px]">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shrink-0 shadow-gold">
          <Download className="size-4 text-navy-900" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-900">Install Careva+ CRM</p>
          <p className="text-xs text-ink-500">Works offline, opens instantly, feels like a native app.</p>
        </div>
        <Button size="sm" variant="primary" onClick={install}>Install</Button>
        <button onClick={dismiss} aria-label="Dismiss" className="text-ink-400 hover:text-ink-700 shrink-0">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
