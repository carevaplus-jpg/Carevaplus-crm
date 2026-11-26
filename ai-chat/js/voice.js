// Voice dictation: types what you say into the prompt box.
// Engine "browser": Web Speech API (live words as you speak; Chrome, Edge, Safari).
// Engine "ai": records audio, then transcribes it with a free audio-capable model on OpenRouter
// (works in any browser with a microphone, e.g. Firefox, or when the browser engine fails).

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const isAndroid = /Android/i.test(navigator.userAgent);

export const browserSpeechSupported = !!SR;
export const recordingSupported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

export const VOICE_LANGS = [
  ['', 'Auto (browser language)'], ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['en-IN', 'English (India)'],
  ['hi-IN', 'हिन्दी Hindi'], ['ta-IN', 'தமிழ் Tamil'], ['te-IN', 'తెలుగు Telugu'], ['ml-IN', 'മലയാളം Malayalam'],
  ['kn-IN', 'ಕನ್ನಡ Kannada'], ['mr-IN', 'मराठी Marathi'], ['bn-IN', 'বাংলা Bengali'], ['gu-IN', 'ગુજરાતી Gujarati'],
  ['pa-IN', 'ਪੰਜਾਬੀ Punjabi'], ['ur-PK', 'اردو Urdu'], ['ar-SA', 'العربية Arabic'], ['es-ES', 'Español'],
  ['fr-FR', 'Français'], ['de-DE', 'Deutsch'], ['pt-BR', 'Português (BR)'], ['it-IT', 'Italiano'],
  ['ja-JP', '日本語 Japanese'], ['ko-KR', '한국어 Korean'], ['zh-CN', '中文 Chinese'], ['ru-RU', 'Русский'],
  ['id-ID', 'Bahasa Indonesia'], ['tr-TR', 'Türkçe'],
];

export function joinText(a, b) {
  if (!a) return b || '';
  if (!b) return a;
  return /\s$/.test(a) || /^[\s.,!?;:]/.test(b) ? a + b : `${a} ${b}`;
}

export class Dictation {
  /**
   * cb: { onUpdate(final, interim), onDone(text), onCancel(), onError(msg, {fallback}), onState(state), onLevel(0..1) }
   * transcribe(base64Wav, lang) => Promise<string>  (AI engine)
   */
  constructor(cb, transcribe) {
    this.cb = cb;
    this.transcribe = transcribe;
    this.state = 'idle';
  }

  setState(s) { this.state = s; this.cb.onState?.(s); }
  get busy() { return this.state !== 'idle'; }

  start(engine, lang) {
    if (this.busy) return;
    this.engine = engine;
    this.lang = lang || navigator.language || 'en-US';
    this.final = '';
    this.cancelled = false;
    if (engine === 'browser') this.startBrowser();
    else this.startRecording();
  }

  /* ---------------- Web Speech API ---------------- */
  startBrowser() {
    this.active = true;
    this.lastSpeech = Date.now();
    this.setState('listening');
    const run = () => {
      const r = new SR();
      r.lang = this.lang;
      r.continuous = !isAndroid;       // Android Chrome duplicates text in continuous mode; restart instead
      r.interimResults = true;
      r.maxAlternatives = 1;
      let sessionFinal = '';
      r.onresult = (e) => {
        let interim = '';
        if (isAndroid) {
          // Android: results array is cumulative for this short session
          let fin = '';
          for (const res of e.results) (res.isFinal ? (fin += res[0].transcript) : (interim += res[0].transcript));
          sessionFinal = fin;
          this.cb.onUpdate(joinText(this.final, sessionFinal), interim);
        } else {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            if (res.isFinal) this.final = joinText(this.final, res[0].transcript.trim());
            else interim += res[0].transcript;
          }
          this.cb.onUpdate(this.final, interim);
        }
        this.lastSpeech = Date.now();
        this.cb.onLevel?.(0.6 + Math.random() * 0.4);
      };
      r.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        this.active = false;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          this.end();
          this.cb.onError('Microphone access is blocked. Allow the microphone for this site in your browser settings.');
        } else if (e.error === 'network' || e.error === 'language-not-supported') {
          this.end();
          this.cb.onError(e.error === 'network' ? 'Browser speech service is unavailable.' : 'This language isn\'t supported by the browser engine.', { fallback: true });
        } else {
          this.end();
          this.cb.onError(`Voice input stopped (${e.error}).`);
        }
      };
      r.onend = () => {
        if (isAndroid && sessionFinal) { this.final = joinText(this.final, sessionFinal.trim()); sessionFinal = ''; }
        if (!this.active) return;
        if (Date.now() - this.lastSpeech > 15000) { this.finish(); return; }  // long silence: stop by itself
        try { run(); } catch { this.finish(); }
      };
      this.rec = r;
      r.start();
    };
    try { run(); } catch (err) { this.active = false; this.end(); this.cb.onError(`Couldn't start voice input: ${err.message}`, { fallback: true }); }
  }

  /* ---------------- Record + AI transcription ---------------- */
  async startRecording() {
    this.setState('starting');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err) {
      this.end();
      this.cb.onError(err.name === 'NotAllowedError' ? 'Microphone access is blocked. Allow the microphone for this site in your browser settings.' : `Couldn't open the microphone: ${err.message}`);
      return;
    }
    if (this.cancelled) { this.stopTracks(); this.end(); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => window.MediaRecorder.isTypeSupported?.(t));
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.recorder.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.recorder.start(250);
    // live input level for the waveform
    try {
      this.actx = new (window.AudioContext || window.webkitAudioContext)();
      const an = this.actx.createAnalyser();
      an.fftSize = 512;
      this.actx.createMediaStreamSource(this.stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      const tick = () => {
        if (this.state !== 'recording') return;
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        this.cb.onLevel?.(Math.min(1, Math.sqrt(sum / buf.length) * 4.5));
        this.raf = requestAnimationFrame(tick);
      };
      this.setState('recording');
      tick();
    } catch { this.setState('recording'); }
    this.maxTimer = setTimeout(() => this.finish(), 180000); // 3 min cap
  }

  stopTracks() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    cancelAnimationFrame(this.raf);
    try { this.actx?.close(); } catch {}
    this.actx = null;
    clearTimeout(this.maxTimer);
  }

  async finishRecording() {
    const rec = this.recorder;
    if (!rec) { this.end(); return; }
    await new Promise((res) => { rec.onstop = res; try { rec.stop(); } catch { res(); } });
    this.stopTracks();
    if (this.cancelled) { this.end(); return; }
    const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' });
    if (blob.size < 2000) { this.end(); this.cb.onDone(''); return; }
    this.setState('transcribing');
    try {
      const wav = await toWav16k(blob);
      const text = (await this.transcribe(wav, this.lang)).trim();
      if (this.cancelled) return;
      this.end();
      this.cb.onDone(text);
    } catch (err) {
      this.end();
      this.cb.onError(`Transcription failed: ${err.message}`);
    }
  }

  /* ---------------- Controls ---------------- */
  finish() {
    if (this.engine === 'browser') {
      if (!this.active && this.state === 'idle') return;
      this.active = false;
      try { this.rec?.stop(); } catch {}
      // let a trailing final result land before handing the text over
      setTimeout(() => { if (this.state !== 'idle') { this.end(); this.cb.onDone(this.final); } }, 350);
    } else if (this.state === 'recording') {
      this.finishRecording();
    } else if (this.state === 'starting') {
      this.cancel();
    }
  }

  cancel() {
    this.cancelled = true;
    this.active = false;
    try { this.rec?.abort(); } catch {}
    try { this.recorder?.state !== 'inactive' && this.recorder?.stop(); } catch {}
    this.stopTracks();
    this.end();
    this.cb.onCancel?.();
  }

  end() { this.rec = null; this.recorder = null; this.setState('idle'); }
}

/* Decode any recorded format, downmix + resample to 16 kHz mono, encode as 16-bit WAV (base64). */
async function toWav16k(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close?.();
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const pcm = (await off.startRendering()).getChannelData(0);
  const bytes = new Uint8Array(44 + pcm.length * 2);
  const dv = new DataView(bytes.buffer);
  const w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  w(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 0x7fff, true);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
