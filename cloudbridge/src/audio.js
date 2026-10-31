// 외부 오디오 파일 없이 WebAudio로만 만든 가벼운 소리. 첫 사용자 입력 이후에만 켜진다.
let ctx = null;
let enabled = true;
let padNodes = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export const audio = {
  get enabled() { return enabled; },
  setEnabled(v) {
    enabled = v;
    if (!v) this.stopPad(); else this.startPad();
  },
  unlock() { ensure(); if (enabled) this.startPad(); },
  chime(kind = 'soft') {
    if (!enabled) return;
    const c = ensure(); if (!c) return;
    const notes = kind === 'star' ? [523.25, 659.25, 783.99, 1046.5] : kind === 'letter' ? [392, 523.25, 659.25] : [659.25, 783.99];
    const t0 = c.currentTime;
    notes.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t0 + i * 0.09);
      g.gain.linearRampToValueAtTime(0.12, t0 + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.09 + 0.9);
      o.connect(g).connect(c.destination);
      o.start(t0 + i * 0.09);
      o.stop(t0 + i * 0.09 + 1);
    });
  },
  startPad() {
    const c = ensure(); if (!c || padNodes) return;
    const master = c.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.035, c.currentTime + 3);
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 700;
    const oscs = [196, 246.94, 293.66, 392].map((f, i) => {
      const o = c.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 4;
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 3;
      lfo.connect(lg).connect(o.detune);
      lfo.start();
      o.connect(filt);
      o.start();
      return o;
    });
    filt.connect(master).connect(c.destination);
    padNodes = { master, oscs };
  },
  stopPad() {
    if (!padNodes || !ctx) return;
    const { master, oscs } = padNodes;
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
    setTimeout(() => oscs.forEach((o) => { try { o.stop(); } catch {} }), 900);
    padNodes = null;
  },
};
