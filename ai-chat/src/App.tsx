import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useChat } from './stores/chat';
import { useSettings } from './stores/settings';
import { useModels } from './stores/models';
import { useUI, toast } from './stores/ui';
import { finishOAuth } from './lib/openrouter';
import { useIsMobile } from './hooks/useMediaQuery';
import { Sidebar, startNewChat } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Thread } from './components/chat/Thread';
import { Composer } from './components/composer/Composer';
import { WelcomeHero, Suggestions, WelcomeStagger, rise } from './components/chat/Welcome';
import { ArtifactPanel } from './components/artifacts/ArtifactPanel';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import { WelcomeDialog } from './components/dialogs/WelcomeDialog';
import { AskDialog } from './components/dialogs/AskDialog';
import { Toaster } from './components/ui/Toaster';

function useTheme() {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme; else root.dataset.theme = theme;
  }, [theme]);
}

function useBoot() {
  useEffect(() => {
    void (async () => {
      const code = new URLSearchParams(location.search).get('code');
      if (code) {
        history.replaceState(null, '', location.pathname + location.hash);
        try { toast('Connecting to OpenRouter…'); useSettings.getState().set({ apiKey: await finishOAuth(code) }); toast('Connected! You can start chatting.'); }
        catch (e) { toast(`Connection failed: ${(e as Error).message}`, 5000); }
      }
      await useChat.getState().init();
      void useModels.getState().load();
      if (!useSettings.getState().apiKey) useUI.getState().set({ dialog: 'welcome' });
    })();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  }, []);
}

function useShortcuts() {
  const mobile = useIsMobile();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'o') { e.preventDefault(); startNewChat(); }
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); useSettings.getState().set({ rail: false }); useUI.getState().set({ searchOpen: true, sidebarOpen: true }); requestAnimationFrame(() => document.getElementById('chat-search')?.focus()); }
      if (mod && e.key === '.') { e.preventDefault(); if (mobile) useUI.getState().set({ sidebarOpen: true }); else useSettings.getState().set({ rail: !useSettings.getState().rail }); }
      if (e.key === 'Escape' && useUI.getState().artifactKey && !document.querySelector('[role="dialog"],[role="menu"]')) useUI.getState().set({ artifactKey: null, artifactFull: false });
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [mobile]);
}

export default function App() {
  useTheme();
  useBoot();
  useShortcuts();
  const conv = useChat((s) => s.convos.find((c) => c.id === s.currentId) ?? null);
  const empty = !conv || conv.messages.length === 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex h-dvh">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">
          <TopBar />
          <LayoutGroup>
            <AnimatePresence mode="popLayout" initial={false}>
              {empty ? (
                // New chat: greeting, centred composer, suggestions
                <motion.div key="welcome" exit={{ opacity: 0, transition: { duration: 0.15 } }} className="flex min-h-0 flex-1 flex-col px-5 pb-[max(10px,env(safe-area-inset-bottom))] max-md:px-3">
                  <WelcomeStagger>
                    <div className="flex flex-1 flex-col justify-end pb-7"><WelcomeHero /></div>
                    <motion.div variants={rise}><Composer centered /></motion.div>
                    <div className="flex-1"><Suggestions /></div>
                  </WelcomeStagger>
                </motion.div>
              ) : (
                <motion.div key="chat" className="flex min-h-0 flex-1 flex-col">
                  <Thread conv={conv} />
                  <div className="px-5 pb-[max(10px,env(safe-area-inset-bottom))] max-md:px-3">
                    <Composer centered={false} />
                    <p className="mx-auto mt-2 max-w-[740px] text-center text-[12px] text-muted">Careva AI runs on free open-source models and can make mistakes. Please double-check responses.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </main>
        <ArtifactPanel />
      </div>
      <SettingsDialog />
      <WelcomeDialog />
      <AskDialog />
      <Toaster />
    </MotionConfig>
  );
}
