import { useUI } from '../../stores/ui';
import { startOAuth } from '../../lib/openrouter';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

export function WelcomeDialog() {
  const open = useUI((s) => s.dialog === 'welcome');
  const set = useUI((s) => s.set);
  return (
    <Dialog open={open} onClose={() => set({ dialog: null })} label="Welcome to Careva AI">
      <div className="flex flex-col items-center gap-3.5 px-7 py-8 text-center">
        <Logo size={56} />
        <h2 className="m-0 font-serif text-[24px] font-medium">Welcome to Careva AI</h2>
        <p className="m-0 text-ink-2 [text-wrap:pretty]">A free assistant that sends every message to the strongest open-source models on OpenRouter. If one model is busy it switches to the next, and <b>Council</b> mode combines several models' answers for hard questions.</p>
        <Button variant="primary" size="lg" onClick={startOAuth} data-autofocus>Connect with OpenRouter</Button>
        <p className="m-0 text-[13px] text-muted">Free account, no card needed. Free models allow about 50 messages a day, or about 1,000 a day after a one-time $10 credit top-up.</p>
        <button type="button" className="text-[13px] text-muted underline" onClick={() => set({ dialog: 'settings' })}>I'll paste a key in Settings</button>
      </div>
    </Dialog>
  );
}
