import { useEffect, useMemo, useRef, useState } from 'react';
import { Dictation, VOICE_LANGS, browserSpeechSupported, joinText, recordingSupported, type VoiceState } from '../lib/voice';
import { transcribeAudio } from '../lib/openrouter';
import { useChat } from '../stores/chat';
import { useSettings } from '../stores/settings';
import { audioModels } from '../stores/models';
import { useUI, toast } from '../stores/ui';
import { send } from '../lib/engine';

const BARS = 32;

export function useDictation() {
  const [state, setState] = useState<VoiceState>('idle');
  const [levels, setLevels] = useState<number[]>(() => new Array(BARS).fill(0.08));
  const [startedAt, setStartedAt] = useState(0);
  const base = useRef('');
  const sendAfter = useRef(false);
  const fake = useRef(0);

  const canUseAI = () => recordingSupported && !!useSettings.getState().apiKey && audioModels().length > 0;

  const dict = useMemo(() => new Dictation({
    onUpdate: (final, interim) => useChat.getState().setDraft(joinText(base.current, joinText(final, interim))),
    onDone: (text) => {
      useChat.getState().setDraft(joinText(base.current, text));
      if (!text) { toast("I didn't catch anything. Try again a little closer to the mic."); return; }
      if (useSettings.getState().voiceAutoSend || sendAfter.current) { sendAfter.current = false; void send(useChat.getState().draft); }
    },
    onCancel: () => useChat.getState().setDraft(base.current),
    onError: (msg, opts) => {
      if (opts?.fallback && canUseAI()) { toast(`${msg} Switching to AI transcription.`); setTimeout(() => start('ai'), 50); return; }
      toast(msg, 5000);
    },
    onState: (s) => setState(s),
    onLevel: (l) => {
      if (dict.engine === 'ai') setLevels((prev) => [...prev.slice(1), Math.max(0.08, Math.min(1, l))]);
      else fake.current = l;
    },
  }, async (wav, lang) => {
    const name = VOICE_LANGS.find(([c]) => c && c === lang)?.[1]?.replace(/^[^\x00-\x7F]+\s*/, '') || '';
    let lastErr: unknown;
    for (const m of audioModels().slice(0, 3)) {
      try { return await transcribeAudio({ key: useSettings.getState().apiKey, model: m.id, wavBase64: wav, langName: name }); }
      catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('No free audio model is available right now.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // simulated levels for the browser engine (it exposes no audio stream)
  useEffect(() => {
    if (state !== 'listening') return;
    const t = setInterval(() => {
      const f = fake.current;
      setLevels((prev) => [...prev.slice(1), f > 0.1 ? f * (0.5 + Math.random() * 0.5) : 0.06 + Math.random() * 0.1]);
      fake.current *= 0.75;
    }, 90);
    return () => clearInterval(t);
  }, [state]);

  function start(force?: 'browser' | 'ai') {
    if (dict.busy) return;
    if (useChat.getState().generating) { toast('Wait for the answer to finish first.'); return; }
    const pref = useSettings.getState().voiceEngine;
    const engine = force
      || (pref === 'browser' && browserSpeechSupported ? 'browser' : pref === 'ai' && canUseAI() ? 'ai' : browserSpeechSupported ? 'browser' : canUseAI() ? 'ai' : null);
    if (!engine) {
      if (!recordingSupported) toast("Voice input isn't available in this browser. Try Chrome, Edge or Safari.", 5000);
      else if (!useSettings.getState().apiKey) useUI.getState().set({ dialog: 'welcome' });
      else toast('Voice input needs Chrome, Edge or Safari here, or a free audio model on OpenRouter (none online right now).', 5000);
      return;
    }
    base.current = useChat.getState().draft;
    setLevels(new Array(BARS).fill(0.08));
    setStartedAt(Date.now());
    dict.start(engine, useSettings.getState().voiceLang || navigator.language);
  }

  return {
    state, levels, startedAt, busy: state !== 'idle', engine: dict.engine,
    start: () => start(),
    finish: (andSend = false) => { sendAfter.current = andSend; dict.finish(); },
    cancel: () => dict.cancel(),
  };
}
