'use client';

import { useCallback, useRef } from 'react';

type Tone = {
  frequency: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  detune?: number;
};

export function useSfx() {
  const contextRef = useRef<AudioContext | null>(null);

  const ensureContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!contextRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      contextRef.current = new Ctor();
    }
    if (contextRef.current.state === 'suspended') {
      contextRef.current.resume().catch(() => {});
    }
    return contextRef.current;
  }, []);

  const playTones = useCallback((tones: Tone[]) => {
    const ctx = ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    tones.forEach((tone, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const attack = tone.attack ?? 0.008;
      const release = tone.release ?? 0.24;
      const amplitude = tone.gain ?? 0.18;
      oscillator.type = tone.type ?? 'sine';
      oscillator.frequency.setValueAtTime(tone.frequency, now);
      if (typeof tone.detune === 'number') oscillator.detune.setValueAtTime(tone.detune, now);

      const startTime = now + index * 0.01;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(amplitude, startTime + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + release);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + attack + release + 0.05);
    });
  }, [ensureContext]);

  const playHover = useCallback(() => {
    playTones([
      { frequency: 720, type: 'triangle', gain: 0.12, attack: 0.006, release: 0.16 },
      { frequency: 540, type: 'sine', gain: 0.08, attack: 0.01, release: 0.22, detune: 18 },
    ]);
  }, [playTones]);

  const playClick = useCallback(() => {
    playTones([
      { frequency: 420, type: 'square', gain: 0.18, attack: 0.008, release: 0.26 },
      { frequency: 220, type: 'sawtooth', gain: 0.12, attack: 0.014, release: 0.32, detune: -32 },
    ]);
  }, [playTones]);

  return {
    playHover,
    playClick,
  };
}
