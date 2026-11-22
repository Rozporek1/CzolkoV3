import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_SERVER_URL || undefined);

export const call = (ev, data = {}) =>
  new Promise((res) => socket.timeout(8000).emit(ev, data, (e, r) => res(e ? { ok: false, error: 'Server not responding' } : r)));

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

export function playerId() {
  let id = store.get('hu.pid', null);
  if (!id) { id = uid(); store.set('hu.pid', id); }
  return id;
}

/* ---- sound (WebAudio, no assets) ---- */
let ctx; let muted = store.get('hu.muted', false);
export const isMuted = () => muted;
export const setMuted = (m) => { muted = m; store.set('hu.muted', m); };
function tone(f, d, t = 0, type = 'sine', v = 0.08) {
  if (muted) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain(), s = ctx.currentTime + t;
    o.type = type; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + d);
    o.start(s); o.stop(s + d);
  } catch { /* audio unavailable */ }
}
export const sfx = {
  correct: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, i * 0.09)),
  wrong: () => { tone(220, 0.25, 0, 'sawtooth', 0.05); tone(165, 0.3, 0.12, 'sawtooth', 0.05); },
  turn: () => { tone(660, 0.12); tone(880, 0.18, 0.1); },
  round: () => [392, 523, 659].forEach((f, i) => tone(f, 0.18, i * 0.1, 'triangle')),
  join: () => tone(740, 0.1, 0, 'triangle'),
  tick: () => tone(1000, 0.05, 0, 'square', 0.03),
};
