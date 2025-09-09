"use client";

export type TinyAudio = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  playJump: () => void;
  playCoin: () => void;
};

let ctx: AudioContext | null = null;

function ensureCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

function beep(freq: number, durMs: number, type: OscillatorType = 'sine', gain = 0.06) {
  const ac = ensureCtx(); if (!ac) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g); g.connect(ac.destination);
  const now = ac.currentTime; const dur = durMs / 1000;
  osc.start(now);
  osc.stop(now + dur);
  g.gain.setTargetAtTime(0, now + dur * 0.6, 0.04);
}

export function useTinyAudio(): TinyAudio {
  // Lazy local state to avoid importing React in this util module
  // Consumers can manage the enabled flag; we provide simple functions.
  let enabled = false;
  const setEnabled = (v: boolean) => { enabled = v; if (v) ensureCtx(); };
  const playJump = () => { if (!enabled) return; beep(520, 90, 'square', 0.05); };
  const playCoin = () => { if (!enabled) return; beep(880, 70, 'sine', 0.06); };
  return { enabled, setEnabled, playJump, playCoin } as TinyAudio;
}

// Stateless helpers for one-off sounds
export const TinyAudioOnce = {
  jump: () => beep(520, 90, 'square', 0.05),
  coin: () => beep(880, 70, 'sine', 0.06),
};

