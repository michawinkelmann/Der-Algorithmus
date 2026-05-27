// sound.js — Mini-Synth über WebAudio. Keine externen Audio-Files,
// damit die file://-Auslieferung funktioniert.

import { Store } from './state.js';

let ctx = null;
function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch (e) { return null; }
  return ctx;
}

function enabled() {
  if (!Store.data) return false;
  return Store.data.soundEnabled !== false;
}

function beep({ freq = 440, duration = 0.08, type = 'sine', volume = 0.15, attack = 0.005, release = 0.05 } = {}) {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration + release);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + release + 0.01);
}

export const SFX = {
  like()    { beep({ freq: 880, duration: 0.06, type: 'sine', volume: 0.18 });
              setTimeout(() => beep({ freq: 1320, duration: 0.05, type: 'sine', volume: 0.14 }), 50); },
  share()   { beep({ freq: 660, duration: 0.05, type: 'triangle', volume: 0.14 }); },
  swipe()   { beep({ freq: 220, duration: 0.04, type: 'sine', volume: 0.08 }); },
  dm()      { beep({ freq: 520, duration: 0.07, type: 'triangle', volume: 0.18 });
              setTimeout(() => beep({ freq: 392, duration: 0.07, type: 'triangle', volume: 0.14 }), 70); },
  badge()   { [523, 659, 784].forEach((f, i) => setTimeout(() => beep({ freq: f, duration: 0.12, type: 'triangle', volume: 0.18 }), i * 90)); },
  toast()   { beep({ freq: 330, duration: 0.04, type: 'sine', volume: 0.08 }); },
  error()   { beep({ freq: 180, duration: 0.18, type: 'sawtooth', volume: 0.12 }); },
  weekend() { [392, 523, 659].forEach((f, i) => setTimeout(() => beep({ freq: f, duration: 0.16, type: 'sine', volume: 0.16 }), i * 110)); }
};

export function setSoundEnabled(enabled) {
  if (!Store.data) return;
  Store.data.soundEnabled = !!enabled;
  Store.save();
}
