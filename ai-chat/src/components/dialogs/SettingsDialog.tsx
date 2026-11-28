import { useEffect, useState, type ReactNode } from 'react';
import { useSettings } from '../../stores/settings';
import { useModels, audioModels, shortName } from '../../stores/models';
import { useChat } from '../../stores/chat';
import { useUI, toast } from '../../stores/ui';
import { getKeyInfo, startOAuth } from '../../lib/openrouter';
import { VOICE_LANGS, browserSpeechSupported } from '../../lib/voice';
import type { Theme, VoiceEngine } from '../../lib/types';
import { Dialog } from '../ui/Dialog';
import { Button, IconButton } from '../ui/Button';
import { confirmDelete } from './askStore';

const IN_ANDROID_APP = (() => {
  try {
    if (document.referrer.startsWith('android-app://com.carevaplus.ai')) sessionStorage.setItem('careva.twa', '1');
    return sessionStorage.getItem('careva.twa') === '1';
  } catch { return false; }
})();

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3 rounded-2xl border border-line bg-raised px-4 py-3.5">
    <h3 className="m-0 text-[15px] font-semibold">{title}</h3>{children}
  </section>
);
const field = 'rounded-[10px] border border-line bg-paper px-3 py-2 text-[15px] text-ink outline-none focus:border-line-strong';
const Label = ({ children }: { children: ReactNode }) => <label className="flex flex-col gap-1.5 text-[14px] text-ink-2">{children}</label>;

export function SettingsDialog() {
  const open = useUI((s) => s.dialog === 'settings');
  const setUI = useUI((s) => s.set);
  const s = useSettings();
  const loadModels = useModels((m) => m.load);
  const [keyStatus, setKeyStatus] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!s.apiKey) { setKeyStatus('Not connected. Connect to start chatting.'); return; }
    setKeyStatus('Checking…');
    getKeyInfo(s.apiKey)
      .then((i) => setKeyStatus(`✓ Connected${i.label ? ` (${i.label})` : ''}, ${i.is_free_tier ? 'free tier' : 'credits on account'}${i.limit != null ? `, limit $${i.limit}` : ''}`))
      .catch((e) => setKeyStatus(`⚠ ${e.message}`));
  }, [open, s.apiKey]);

  const am = audioModels();
  return (
    <Dialog open={open} onClose={() => setUI({ dialog: null })} label="Settings">
      <div className="flex flex-col gap-3.5 p-5">
        <header className="flex items-center justify-between">
          <h2 className="m-0 font-serif text-[22px] font-medium">Settings</h2>
          <IconButton icon="x" label="Close" onClick={() => setUI({ dialog: null })} />
        </header>

        <Card title="OpenRouter connection">
          <p className="m-0 text-[13px] text-muted">{keyStatus}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={startOAuth}>{s.apiKey ? 'Reconnect' : 'Connect with OpenRouter'}</Button>
            {s.apiKey && <Button onClick={() => { s.set({ apiKey: '' }); toast('Disconnected. Your key was removed from this browser.'); }}>Disconnect</Button>}
          </div>
          <button type="button" onClick={() => setShowPaste(!showPaste)} className="self-start text-[14px] text-ink-2 underline-offset-2 hover:underline">{showPaste ? 'Hide' : 'Or paste an API key'}</button>
          {showPaste && (
            <>
              <div className="flex flex-wrap gap-2">
                <input type="password" placeholder="sk-or-v1-…" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} autoComplete="off" spellCheck={false} aria-label="OpenRouter API key" className={`${field} min-w-[180px] flex-1`} />
                <Button onClick={() => { const k = keyInput.trim(); if (!/^sk-or-/.test(k)) { toast("That doesn't look like an OpenRouter key (sk-or-…)."); return; } s.set({ apiKey: k }); setKeyInput(''); toast('Key saved.'); }}>Save</Button>
              </div>
              <p className="m-0 text-[13px] text-muted">Create one at <a className="text-accent-ink underline" href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer">openrouter.ai/settings/keys</a>. Your key stays in this browser and is only sent to OpenRouter.</p>
            </>
          )}
        </Card>

        <Card title="Personalization">
          <Label>What should Careva AI call you?<input className={field} maxLength={40} value={s.userName} onChange={(e) => s.set({ userName: e.target.value })} placeholder="Your name" /></Label>
          <Label>Custom instructions<textarea className={field} rows={4} value={s.instructions} onChange={(e) => s.set({ instructions: e.target.value })} placeholder="e.g. Keep answers concise. I run a home-care business in India." /></Label>
        </Card>

        <Card title="Voice input">
          <Label>Language you speak
            <select className={field} value={s.voiceLang} onChange={(e) => s.set({ voiceLang: e.target.value })}>{VOICE_LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
          </Label>
          <Label>Speech engine
            <select className={field} value={s.voiceEngine} onChange={(e) => s.set({ voiceEngine: e.target.value as VoiceEngine })}>
              <option value="auto">Automatic (best available)</option>
              <option value="browser">Browser speech recognition (live words)</option>
              <option value="ai">AI transcription via OpenRouter (any browser)</option>
            </select>
          </Label>
          <p className="m-0 text-[13px] text-muted">
            {browserSpeechSupported ? '✓ This browser supports live speech recognition. ' : '✗ This browser has no built-in speech recognition. '}
            {am.length ? `✓ AI transcription available (${shortName(am[0].id)}).` : '✗ No free audio model online right now.'}
          </p>
          <label className="flex items-center gap-2.5 text-[14px]"><input type="checkbox" className="size-[17px] accent-[var(--accent)]" checked={s.voiceAutoSend} onChange={(e) => s.set({ voiceAutoSend: e.target.checked })} />Send automatically when I finish speaking</label>
        </Card>

        <Card title="Models">
          <Label>Council size (models consulted in Council mode): <b className="text-ink">{s.councilSize}</b>
            <input type="range" min={2} max={6} step={1} value={s.councilSize} onChange={(e) => s.set({ councilSize: Number(e.target.value) })} className="accent-[var(--accent)]" />
          </Label>
          <Label>Creativity (temperature): <b className="text-ink">{s.temperature}</b>
            <input type="range" min={0} max={1.5} step={0.1} value={s.temperature} onChange={(e) => s.set({ temperature: Number(e.target.value) })} className="accent-[var(--accent)]" />
          </Label>
          <label className="flex items-center gap-2.5 text-[14px]"><input type="checkbox" className="size-[17px] accent-[var(--accent)]" checked={s.showThinking} onChange={(e) => s.set({ showThinking: e.target.checked })} />Show the model's thinking when available</label>
          <Button className="self-start" onClick={async () => { await loadModels(true); toast(`${useModels.getState().models.length} free models loaded.`); }}>Refresh free model list</Button>
        </Card>

        {!IN_ANDROID_APP && (
          <Card title="Android app">
            <p className="m-0 text-[13px] text-muted">Install Careva AI on your Android phone (Android 7.0 or newer, about 0.6 MB). It opens full-screen with its own icon and uses Chrome for the mic and sign-in.</p>
            <a href="download/careva-ai.apk" download className="self-start rounded-[10px] border border-line-strong bg-raised px-3.5 py-2 text-[14px] font-medium hover:bg-paper">Download the Android app (APK)</a>
          </Card>
        )}

        <Card title="Appearance and data">
          <Label>Theme
            <select className={field} value={s.theme} onChange={(e) => s.set({ theme: e.target.value as Theme })}>
              <option value="system">Match system</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </Label>
          <Button className="self-start !text-danger" onClick={async () => {
            if (!(await confirmDelete('Delete all chats?', 'Every chat on this device will be permanently deleted.', 'Delete all'))) return;
            await useChat.getState().clearAll(); setUI({ artifactKey: null }); toast('All chats deleted.');
          }}>Delete all chats</Button>
        </Card>
      </div>
    </Dialog>
  );
}
