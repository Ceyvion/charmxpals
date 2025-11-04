"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pulsegridTracks, type PulsegridNote, type PulsegridTrack } from '@/data/pulsegridTracks';

type GameState = 'menu' | 'countdown' | 'playing' | 'paused' | 'over';
type JudgmentKind = 'perfect' | 'great' | 'good' | 'miss';

type RunnerProps = {
  stats?: Record<string, number> | null;
  audio?: { enabled: boolean; playHit?: () => void; playMiss?: () => void; playPulse?: () => void } | null;
  onGameOver?: (finalScore: number, maxCombo: number, trackId: string) => void;
};

type RuntimeNote = PulsegridNote & {
  judged: boolean;
  result?: JudgmentKind;
  flashUntil?: number;
};

type Accuracy = {
  perfect: number;
  great: number;
  good: number;
  miss: number;
};

type LaneEffect = { lane: number; until: number; strength: number; tone?: 'hit' | 'input' | 'miss'; duration: number };
type ActiveJudgment = { kind: JudgmentKind; at: number; offset?: number };
type CountdownKind = 'start' | 'resume';

const LANES = 4;
const HIT_WINDOWS = { perfect: 55, great: 95, good: 140 } as const; // ms windows centered on the beat
const MISS_WINDOW_BASE = 180; // ms after the beat before a note counts as a miss
const TRAVEL_MS_BASE = 1800; // how long a note takes to travel from spawn to the hit line
const COUNTDOWN_MS = 2900;
const RESUME_COUNTDOWN_MS = 1600;

const SCORE_VALUE: Record<Exclude<JudgmentKind, 'miss'>, number> = {
  perfect: 1250,
  great: 940,
  good: 660,
};

const JUDGMENT_LABEL: Record<JudgmentKind, string> = {
  perfect: 'Perfect Sync',
  great: 'Great Timing',
  good: 'On Beat',
  miss: 'Signal Lost',
};

const KEY_BINDINGS = ['KeyF', 'KeyG', 'KeyH', 'KeyJ'];
const KEY_LABELS = ['F', 'G', 'H', 'J'];

const defaultAccuracy: Accuracy = { perfect: 0, great: 0, good: 0, miss: 0 };
const hexToRgb = (hex: string): [number, number, number] | null => {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return [r, g, b];
};
const readStat = (stats: Record<string, number> | null | undefined, key: string, fallback: number) => {
  if (!stats) return fallback;
  const target = key.toLowerCase();
  for (const [name, value] of Object.entries(stats)) {
    if (typeof value !== 'number') continue;
    if (name.toLowerCase() === target) return Math.max(0, Math.min(100, value));
  }
  return fallback;
};

export default function Runner({ stats, audio, onGameOver }: RunnerProps) {
  const [selectedTrackId, setSelectedTrackId] = useState(pulsegridTracks[0]?.id ?? '');
  const selectedTrack = useMemo<PulsegridTrack | null>(() => {
    return pulsegridTracks.find((track) => track.id === selectedTrackId) ?? pulsegridTracks[0] ?? null;
  }, [selectedTrackId]);

  const rhythmRating = useMemo(() => readStat(stats, 'rhythm', 62), [stats]);
  const flowRating = useMemo(() => readStat(stats, 'flow', 58), [stats]);

  const tunedWindows = useMemo(() => {
    const rhythmDelta = rhythmRating - 60;
    return {
      perfect: Math.max(42, HIT_WINDOWS.perfect - rhythmDelta * 0.35),
      great: Math.max(78, HIT_WINDOWS.great - rhythmDelta * 0.25),
      good: Math.max(118, HIT_WINDOWS.good - rhythmDelta * 0.18),
    };
  }, [rhythmRating]);

  const travelMs = useMemo(() => {
    const flowDelta = flowRating - 55;
    return Math.max(1400, TRAVEL_MS_BASE - flowDelta * 7);
  }, [flowRating]);

  const missWindow = useMemo(() => Math.max(140, tunedWindows.good + (MISS_WINDOW_BASE - HIT_WINDOWS.good)), [tunedWindows]);
  const trackDurationMs = useMemo(() => {
    if (!selectedTrack) return 0;
    const notes = selectedTrack.notes;
    if (!notes.length) return 0;
    const lastNoteTime = notes[notes.length - 1].timeMs;
    return lastNoteTime + travelMs + 1500;
  }, [selectedTrack, travelMs]);
  const progressMarkers = useMemo(() => {
    if (!selectedTrack || trackDurationMs <= 0) return [];
    const measureMs = (60000 / selectedTrack.bpm) * 4;
    if (!Number.isFinite(measureMs) || measureMs <= 0) return [];
    const sectionMs = measureMs * 4;
    const markers: number[] = [];
    for (let t = sectionMs; t < trackDurationMs; t += sectionMs) {
      const pct = t / trackDurationMs;
      if (pct >= 1) break;
      markers.push(pct);
    }
    return markers;
  }, [selectedTrack, trackDurationMs]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [judgment, setJudgment] = useState<ActiveJudgment | null>(null);
  const [accuracy, setAccuracy] = useState<Accuracy>(defaultAccuracy);
  const [progress, setProgress] = useState(0);
  const [countdownKind, setCountdownKind] = useState<CountdownKind>('start');

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const progressRef = useRef(0);
  const lastProgressUpdateRef = useRef(0);

  const worldRef = useRef({
    notes: [] as RuntimeNote[],
    nextIndex: 0,
    currentTime: 0,
    countdownEnds: 0,
    effects: [] as LaneEffect[],
    track: selectedTrack as PulsegridTrack | null,
    pausedAt: 0,
    didSubmit: false,
  });

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    maxComboRef.current = maxCombo;
  }, [maxCombo]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const resetWorld = useCallback((track: PulsegridTrack | null) => {
    const notes = track ? track.notes.map((note) => ({ ...note, judged: false })) : [];
    worldRef.current = {
      notes,
      nextIndex: 0,
      currentTime: 0,
      countdownEnds: 0,
      effects: [],
      track,
      didSubmit: false,
      pausedAt: 0,
    };
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setAccuracy(defaultAccuracy);
    setJudgment(null);
    setProgress(0);
    progressRef.current = 0;
    lastProgressUpdateRef.current = 0;
    setCountdownKind('start');
  }, []);

  useEffect(() => {
    resetWorld(selectedTrack);
    setGameState('menu');
  }, [resetWorld, selectedTrack]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(360, container.clientWidth);
      const height = Math.max(520, Math.round(width * 1.25));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('orientationchange', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
    };
  }, []);

  const startGame = useCallback(() => {
    if (!selectedTrack) return;
    resetWorld(selectedTrack);
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.load();
    }
    const now = performance.now();
    worldRef.current.countdownEnds = now + COUNTDOWN_MS;
    setCountdown(Math.ceil(COUNTDOWN_MS / 1000));
    setCountdownKind('start');
    setGameState('countdown');
    if (audio?.enabled) audio.playPulse?.();
  }, [audio, resetWorld, selectedTrack]);

  const submitRun = useCallback(() => {
    const world = worldRef.current;
    if (world.didSubmit || !selectedTrack) return;
    world.didSubmit = true;
    onGameOver?.(scoreRef.current, maxComboRef.current, selectedTrack.id);
  }, [onGameOver, selectedTrack]);

  const finishGame = useCallback(
    (complete = false) => {
      if (gameState === 'over') return;
      const audioEl = audioRef.current;
      audioEl?.pause();
      setGameState('over');
      setCountdown(null);
      if (complete) {
        progressRef.current = 1;
        lastProgressUpdateRef.current = performance.now();
        setProgress(1);
      }
      submitRun();
    },
    [gameState, submitRun],
  );

  const pauseGame = useCallback(() => {
    if (gameState !== 'playing' && gameState !== 'countdown') return;
    const audioEl = audioRef.current;
    const world = worldRef.current;
    world.pausedAt = world.currentTime;
    world.countdownEnds = 0;
    audioEl?.pause();
    setCountdown(null);
    setGameState('paused');
  }, [gameState]);

  const resumeGame = useCallback(() => {
    if (gameState !== 'paused') return;
    const audioEl = audioRef.current;
    const world = worldRef.current;
    const now = performance.now();
    world.countdownEnds = now + RESUME_COUNTDOWN_MS;
    world.currentTime = world.pausedAt;
    setCountdown(Math.ceil(RESUME_COUNTDOWN_MS / 1000));
    setCountdownKind('resume');
    setGameState('countdown');
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = (world.currentTime ?? 0) / 1000;
    }
    if (audio?.enabled) audio.playPulse?.();
  }, [audio, gameState]);

  const triggerLanePulse = useCallback(
    (lane: number, strength = 0.6, tone: LaneEffect['tone'] = 'input', duration = 200) => {
      const now = performance.now();
      worldRef.current.effects.push({ lane, strength, tone, duration, until: now + duration });
    },
    [],
  );

  const handleMiss = useCallback((lane?: number, at?: number) => {
    setCombo(0);
    comboRef.current = 0;
    setAccuracy((prev) => ({ ...prev, miss: prev.miss + 1 }));
    const stamp = at ?? performance.now();
    setJudgment({ kind: 'miss', at: stamp });
    if (audio?.enabled) audio.playMiss?.();
    if (typeof lane === 'number') triggerLanePulse(lane, 0.55, 'miss', 320);
  }, [audio, triggerLanePulse]);

  const handleJudgment = useCallback((note: RuntimeNote, deltaMs: number, now: number) => {
    const absDelta = Math.abs(deltaMs);
    let kind: JudgmentKind = 'good';
    if (absDelta <= tunedWindows.perfect) kind = 'perfect';
    else if (absDelta <= tunedWindows.great) kind = 'great';

    note.judged = true;
    note.result = kind;
    note.flashUntil = now + 220;

    const addedScore = SCORE_VALUE[kind];
    setScore((prev) => prev + addedScore + Math.round(comboRef.current * 6));
    setCombo((prev) => {
      const next = prev + 1;
      if (next > maxComboRef.current) setMaxCombo(next);
      comboRef.current = next;
      return next;
    });
    setAccuracy((prev) => ({ ...prev, [kind]: prev[kind] + 1 }));
    setJudgment({ kind, at: now, offset: deltaMs });
    if (audio?.enabled) audio.playHit?.();

    triggerLanePulse(note.lane, kind === 'perfect' ? 1 : 0.78, 'hit', 260);
  }, [audio, triggerLanePulse, tunedWindows]);

  const judgeLane = useCallback((lane: number) => {
    if (gameState !== 'playing') return;
    triggerLanePulse(lane, 0.45, 'input', 160);
    const world = worldRef.current;
    const { notes } = world;
    const now = performance.now();
    const currentTime = world.currentTime;

    let target: RuntimeNote | null = null;
    for (let i = 0; i < notes.length; i += 1) {
      const note = notes[i];
      if (note.judged || note.lane !== lane) continue;
      const delta = note.timeMs - currentTime;
      if (delta < -missWindow) {
        continue;
      }
      if (Math.abs(delta) <= tunedWindows.good) {
        target = note;
        break;
      }
      if (delta > tunedWindows.good) break;
    }

    if (!target) return;
    handleJudgment(target, target.timeMs - currentTime, now);
  }, [gameState, handleJudgment, missWindow, triggerLanePulse, tunedWindows.good]);

  useEffect(() => {
    const downHandler = (event: KeyboardEvent) => {
      const laneIndex = KEY_BINDINGS.indexOf(event.code);
      if (laneIndex !== -1) {
        event.preventDefault();
        judgeLane(laneIndex);
        return;
      }
      if (event.code === 'Space' || event.code === 'Enter') {
        if (gameState === 'menu' || gameState === 'over') {
          event.preventDefault();
          startGame();
          return;
        }
        if (gameState === 'paused') {
          event.preventDefault();
          resumeGame();
          return;
        }
      }
      if (event.code === 'Escape') {
        if (gameState === 'playing') {
          event.preventDefault();
          pauseGame();
          return;
        }
        if (gameState === 'paused') {
          event.preventDefault();
          finishGame();
        }
      }
    };
    window.addEventListener('keydown', downHandler);
    return () => window.removeEventListener('keydown', downHandler);
  }, [finishGame, gameState, judgeLane, pauseGame, resumeGame, startGame]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') pauseGame();
    };
    const handleBlur = () => pauseGame();
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pauseGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pointerHandler = (event: PointerEvent) => {
      if (gameState !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const lane = Math.min(LANES - 1, Math.max(0, Math.floor((relativeX / rect.width) * LANES)));
      judgeLane(lane);
    };
    canvas.addEventListener('pointerdown', pointerHandler);
    return () => canvas.removeEventListener('pointerdown', pointerHandler);
  }, [gameState, judgeLane]);

  useEffect(() => {
    if (!judgment) return;
    const timeout = window.setTimeout(() => {
      setJudgment((current) => (current === judgment ? null : current));
    }, 620);
    return () => window.clearTimeout(timeout);
  }, [judgment]);

  useEffect(() => {
    const step = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const hitLine = height * 0.82;
      const top = height * 0.08;
      const laneWidth = width / LANES;

      const world = worldRef.current;
      const audioEl = audioRef.current;

      if (gameState === 'countdown') {
        const remaining = Math.max(0, world.countdownEnds - now);
        const nextDisplay = remaining > 0 ? Math.ceil(remaining / 1000) : null;
        if (nextDisplay !== countdown) {
          setCountdown(nextDisplay);
          if (nextDisplay && audio?.enabled) audio.playPulse?.();
        }
        if (remaining <= 0) {
          setCountdown(null);
          setGameState('playing');
          if (audioEl) {
            const resumeSeconds = countdownKind === 'resume' ? (world.currentTime ?? 0) / 1000 : 0;
            audioEl.pause();
            audioEl.currentTime = resumeSeconds;
            const playPromise = audioEl.play();
            if (playPromise?.catch) playPromise.catch(() => {});
          }
          if (countdownKind === 'resume') {
            world.currentTime = world.pausedAt;
          } else {
            world.currentTime = 0;
          }
          world.pausedAt = 0;
          if (countdownKind === 'resume') setCountdownKind('start');
        }
      }

      if (gameState === 'playing') {
        world.currentTime = (audioEl?.currentTime ?? 0) * 1000;

        if (trackDurationMs > 0) {
          const nextProgress = Math.min(1, world.currentTime / trackDurationMs);
          const previous = progressRef.current;
          progressRef.current = nextProgress;
          const elapsedSinceUpdate = now - lastProgressUpdateRef.current;
          if (elapsedSinceUpdate > 80 || Math.abs(nextProgress - previous) > 0.02) {
            lastProgressUpdateRef.current = now;
            setProgress(nextProgress);
          }
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(253, 245, 255, 0.95)');
      gradient.addColorStop(0.55, 'rgba(214, 236, 255, 0.88)');
      gradient.addColorStop(1, 'rgba(197, 189, 255, 0.86)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const accent = selectedTrack?.sparkColor ?? '#60a5fa';
      const accentRgb = hexToRgb(accent);
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 3; i += 1) {
        const pulseX = ((now / 1000) * (0.08 + i * 0.05)) % 1 * width;
        const radial = ctx.createRadialGradient(pulseX, height * (0.18 + i * 0.24), 40, pulseX, height * (0.18 + i * 0.24), width * 0.9);
        const pulseInner = accentRgb ? `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0.33)` : `${accent}55`;
        radial.addColorStop(0, pulseInner);
        radial.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(36, 15, 68, 0.28)';
      ctx.fillRect(width * 0.09, top - 24, width * 0.82, 7);

      ctx.fillStyle = 'rgba(48, 21, 90, 0.82)';
      ctx.fillRect(width * 0.07, hitLine, width * 0.86, 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(width * 0.07, hitLine + 6, width * 0.86, 1.2);

      // draw lanes
      for (let lane = 0; lane < LANES; lane += 1) {
        const laneX = lane * laneWidth + laneWidth * 0.12;
        const laneW = laneWidth * 0.76;
        const laneGradient = ctx.createLinearGradient(laneX, top, laneX + laneW, hitLine);
        laneGradient.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
        laneGradient.addColorStop(0.4, 'rgba(255, 229, 254, 0.15)');
        laneGradient.addColorStop(1, 'rgba(196, 221, 255, 0.22)');
        ctx.fillStyle = laneGradient;
        ctx.beginPath();
        const radius = laneW * 0.18;
        const heightSpan = hitLine - top + 16;
        ctx.moveTo(laneX + radius, top);
        ctx.lineTo(laneX + laneW - radius, top);
        ctx.quadraticCurveTo(laneX + laneW, top, laneX + laneW, top + radius);
        ctx.lineTo(laneX + laneW, top + heightSpan - radius);
        ctx.quadraticCurveTo(laneX + laneW, top + heightSpan, laneX + laneW - radius, top + heightSpan);
        ctx.lineTo(laneX + radius, top + heightSpan);
        ctx.quadraticCurveTo(laneX, top + heightSpan, laneX, top + heightSpan - radius);
        ctx.lineTo(laneX, top + radius);
        ctx.quadraticCurveTo(laneX, top, laneX + radius, top);
        ctx.closePath();
        ctx.fill();
      }

      world.effects = world.effects.filter((effect) => effect.until > now);
      for (const effect of world.effects) {
        const remaining = Math.max(0, effect.until - now);
        const duration = effect.duration > 0 ? effect.duration : 260;
        const fade = Math.min(1, Math.max(0, remaining / duration));
        const strength = fade * effect.strength;
        if (strength <= 0) continue;
        const tone = effect.tone ?? 'hit';
        const laneX = effect.lane * laneWidth + laneWidth * 0.12;
        const laneW = laneWidth * 0.76;
        const highlight = ctx.createLinearGradient(laneX, top, laneX + laneW, hitLine);
        if (tone === 'miss') {
          highlight.addColorStop(0, `rgba(255, 224, 229, ${0.24 * strength})`);
          highlight.addColorStop(1, `rgba(248, 113, 113, ${0.42 * strength})`);
        } else if (tone === 'input') {
          const inputAccent = accentRgb
            ? `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${0.28 * strength})`
            : `rgba(125, 211, 252, ${0.28 * strength})`;
          highlight.addColorStop(0, `rgba(255, 255, 255, ${0.18 * strength})`);
          highlight.addColorStop(1, inputAccent);
        } else {
          const hitAccent = accentRgb
            ? `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${0.46 * strength})`
            : `rgba(130, 166, 255, ${0.46 * strength})`;
          highlight.addColorStop(0, `rgba(255, 255, 255, ${0.32 * strength})`);
          highlight.addColorStop(1, hitAccent);
        }
        ctx.fillStyle = highlight;
        ctx.beginPath();
        const radius = laneW * 0.18;
        const heightSpan = hitLine - top + 16;
        ctx.moveTo(laneX + radius, top);
        ctx.lineTo(laneX + laneW - radius, top);
        ctx.quadraticCurveTo(laneX + laneW, top, laneX + laneW, top + radius);
        ctx.lineTo(laneX + laneW, top + heightSpan - radius);
        ctx.quadraticCurveTo(laneX + laneW, top + heightSpan, laneX + laneW - radius, top + heightSpan);
        ctx.lineTo(laneX + radius, top + heightSpan);
        ctx.quadraticCurveTo(laneX, top + heightSpan, laneX, top + heightSpan - radius);
        ctx.lineTo(laneX, top + radius);
        ctx.quadraticCurveTo(laneX, top, laneX + radius, top);
        ctx.closePath();
        ctx.fill();
      }

      const { notes } = world;
      const travelDistance = hitLine - top;
      const activeWindow = travelMs + 220;
      let remainingNotes = 0;

      for (let i = world.nextIndex; i < notes.length; i += 1) {
        const note = notes[i];
        if (!note.judged) remainingNotes += 1;
        const timeUntil = note.timeMs - world.currentTime;
        if (timeUntil > activeWindow) break;

        if (!note.judged && -timeUntil > missWindow && gameState === 'playing') {
          note.judged = true;
          note.result = 'miss';
          note.flashUntil = now + 180;
          world.nextIndex = Math.max(world.nextIndex, i + 1);
          handleMiss(note.lane, now);
          continue;
        }

        if (timeUntil < -activeWindow) {
          world.nextIndex = Math.max(world.nextIndex, i + 1);
          continue;
        }

        const laneX = note.lane * laneWidth + laneWidth * 0.22;
        const laneW = laneWidth * 0.56;
        const noteHeight = laneW * 0.82;
        const progress = 1 - Math.max(0, Math.min(1, timeUntil / travelMs));
        const y = top + travelDistance * progress - noteHeight / 2;

        const opacity = note.judged ? (note.result === 'miss' ? 0.2 : 0.4) : 0.9;
        ctx.fillStyle = note.result === 'miss' ? `rgba(255, 99, 132, ${opacity})` : `rgba(90, 115, 255, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(laneX + noteHeight / 2, y);
        ctx.arc(laneX + laneW - noteHeight / 2, y + noteHeight / 2, noteHeight / 2, -Math.PI / 2, Math.PI / 2, false);
        ctx.arc(laneX + noteHeight / 2, y + noteHeight / 2, noteHeight / 2, Math.PI / 2, -Math.PI / 2, false);
        ctx.closePath();
        ctx.fill();

        if (note.flashUntil && note.flashUntil > now) {
          const strength = Math.max(0, (note.flashUntil - now) / 220);
          ctx.save();
          ctx.globalAlpha = strength * 0.65;
          const centerX = note.lane * laneWidth + laneWidth / 2;
          const halo = ctx.createRadialGradient(centerX, hitLine + 4, 6, centerX, hitLine + 4, laneW * 0.9);
          halo.addColorStop(0, 'rgba(255,255,255,0.8)');
          halo.addColorStop(1, 'rgba(105,125,255,0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(centerX, hitLine + 4, laneW * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      world.nextIndex = Math.min(world.nextIndex, notes.length - 1);
      while (world.nextIndex < notes.length && notes[world.nextIndex].judged) {
        world.nextIndex += 1;
      }

      if (gameState === 'playing' && remainingNotes === 0) {
        finishGame(true);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audio, countdown, countdownKind, finishGame, gameState, handleMiss, missWindow, selectedTrack, trackDurationMs, travelMs]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const onEnded = () => finishGame(true);
    audioEl.addEventListener('ended', onEnded);
    return () => audioEl.removeEventListener('ended', onEnded);
  }, [finishGame]);

  const accuracySummary = useMemo(() => {
    const total = accuracy.perfect + accuracy.great + accuracy.good + accuracy.miss;
    if (total === 0) return { percent: 0, total };
    const weighted = accuracy.perfect * 1 + accuracy.great * 0.82 + accuracy.good * 0.6;
    return { percent: Math.round((weighted / total) * 100), total };
  }, [accuracy]);
  const progressPercent = useMemo(() => Math.round(Math.min(1, Math.max(0, progress)) * 100), [progress]);
  const progressFillWidth = useMemo(() => {
    if (progress <= 0) return 0;
    return Math.min(100, Math.max(progress * 100, 4));
  }, [progress]);
  const remainingTimeLabel = useMemo(() => {
    if (trackDurationMs <= 0) return '—';
    const remainingMs = Math.max(0, trackDurationMs * (1 - progress));
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [progress, trackDurationMs]);
  const progressStatus = useMemo(() => {
    if (gameState === 'playing') {
      return remainingTimeLabel !== '—' ? `${remainingTimeLabel} left` : 'Live';
    }
    if (gameState === 'paused') return 'Paused';
    if (gameState === 'countdown') return countdownKind === 'resume' ? 'Resuming' : 'Starting';
    if (gameState === 'over') return 'Run complete';
    return 'Ready';
  }, [countdownKind, gameState, remainingTimeLabel]);

  const trackCards = useMemo(() => pulsegridTracks, []);

  const countdownLabel = countdownKind === 'resume' ? 'Rejoin Sync' : 'Drop In';

  return (
    <div ref={containerRef} className="w-full">
      <div className="grid gap-4 md:grid-cols-2">
        {trackCards.map((track) => {
          const isActive = track.id === selectedTrack?.id;
          const disabled = gameState === 'playing' || gameState === 'countdown';
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => !disabled && setSelectedTrackId(track.id)}
              disabled={disabled && !isActive}
              className={`w-full rounded-3xl border px-5 py-4 text-left transition ${
                isActive
                  ? 'border-purple-400 bg-white/80 shadow-[0_24px_80px_rgba(168,85,247,0.25)]'
                  : 'border-white/50 bg-white/60 hover:bg-white/80 hover:shadow-[0_14px_45px_rgba(148,163,184,0.22)]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.4em] text-slate-500">Track</div>
                  <div className="mt-1 font-display text-lg font-semibold text-slate-900">{track.title}</div>
                  <div className="text-sm text-slate-600">{track.artist}</div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs uppercase tracking-[0.35em] text-slate-500">{track.difficulty}</span>
                  <span className="mt-1 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-white">{track.notes.length.toLocaleString()} notes</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {track.license.credit} — {track.license.name}
              </div>
            </button>
          );
        })}
      </div>

      <div className="relative mt-6">
        <canvas ref={canvasRef} className="w-full rounded-[32px] border border-white/20 bg-slate-900/30 shadow-[0_32px_120px_rgba(99,102,241,0.35)] backdrop-blur" />
        <audio ref={audioRef} src={selectedTrack?.audioSrc} preload="auto" />

        {(gameState === 'menu' || gameState === 'over') && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#fdf9ff]/80 via-[#f3f8ff]/70 to-[#f5f1ff]/80 text-center">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-indigo-500/70">Skylink Pulsegrid</p>
              <h2 className="mt-2 font-display text-4xl font-extrabold text-slate-900 md:text-5xl">Tap Into The Beat Rail</h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 md:text-lg">
                Chain precise taps on the four neon lanes. Use F • G • H • J or tap the pads when each note collides with the beat line.
              </p>
            </div>
            <div className="pointer-events-auto flex flex-col items-center gap-3">
              {gameState === 'over' && (
                <div className="rounded-2xl bg-white/75 px-6 py-4 text-slate-700 shadow-inner">
                  <div className="text-sm uppercase tracking-[0.3em] text-indigo-400">Last Run</div>
                  <div className="mt-2 flex flex-wrap justify-center gap-5 text-sm md:text-base">
                    <div><span className="font-semibold text-slate-900">Score</span> {score.toLocaleString()}</div>
                    <div><span className="font-semibold text-slate-900">Max Combo</span> {maxCombo}</div>
                    <div><span className="font-semibold text-slate-900">Accuracy</span> {accuracySummary.percent}%</div>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={startGame}
                className="rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500 px-8 py-3 text-base font-semibold text-white shadow-[0_16px_40px_rgba(99,102,241,0.35)] transition hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(99,102,241,0.45)]"
              >
                {gameState === 'over' ? 'Run It Back' : 'Start the Mix'}
              </button>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Space or Enter • Esc pauses</div>
            </div>
          </div>
        )}

        {gameState === 'countdown' && countdown && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-slate-950/25">
            <div className="rounded-full border border-white/40 bg-white/80 px-12 py-8 shadow-lg backdrop-blur">
              <span className="font-display text-6xl font-black text-slate-900 md:text-7xl">{countdown}</span>
              <div className="mt-2 text-center text-sm uppercase tracking-[0.35em] text-slate-500">{countdownLabel}</div>
            </div>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
            <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/40 bg-white/85 px-8 py-7 text-center text-slate-700 shadow-2xl">
              <div className="text-sm uppercase tracking-[0.35em] text-indigo-500">Run Paused</div>
              <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">Catch your breath</h3>
              <p className="mt-3 text-sm text-slate-600">
                Resume to sync back in, or end the attempt to lock your current score.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={resumeGame}
                  className="rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500 px-6 py-2 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(99,102,241,0.3)] transition hover:scale-[1.02] hover:shadow-[0_16px_40px_rgba(99,102,241,0.4)]"
                >
                  Resume Mix
                </button>
                <button
                  type="button"
                  onClick={() => finishGame()}
                  className="rounded-full border border-slate-300/60 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white"
                >
                  End Run
                </button>
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.35em] text-slate-500">Space resumes • Escape ends</div>
            </div>
          </div>
        )}

        {gameState === 'playing' && judgment && (
          <div className="pointer-events-none absolute inset-x-0 top-12 flex justify-center">
            <div
              className={`rounded-full px-7 py-2.5 text-center text-sm font-semibold uppercase tracking-[0.32em] text-white shadow-lg transition ${
                judgment.kind === 'perfect'
                  ? 'bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500'
                  : judgment.kind === 'great'
                    ? 'bg-gradient-to-r from-indigo-400 via-sky-400 to-fuchsia-400'
                    : judgment.kind === 'good'
                      ? 'bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500'
                      : 'bg-gradient-to-r from-rose-500 via-amber-500 to-slate-900'
              }`}
            >
              <div>{JUDGMENT_LABEL[judgment.kind]}</div>
              {judgment.offset !== undefined && judgment.kind !== 'miss' && (
                <div className="mt-1 text-[10px] font-medium tracking-[0.4em] text-white/90">
                  {judgment.offset < 0 ? 'EARLY' : 'LATE'} {Math.abs(Math.round(judgment.offset))}MS
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner">
          <div className="text-xs uppercase tracking-[0.4em] text-indigo-200">Score</div>
          <div className="mt-1 text-lg font-semibold text-white">{score.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner">
          <div className="text-xs uppercase tracking-[0.4em] text-indigo-200">Combo</div>
          <div className="mt-1 text-lg font-semibold text-white">{combo}<span className="ml-2 text-xs font-medium text-indigo-100">Max {maxCombo}</span></div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner">
          <div className="text-xs uppercase tracking-[0.4em] text-indigo-200">Accuracy</div>
          <div className="mt-1 text-lg font-semibold text-white">{accuracySummary.percent}%</div>
          <div className="mt-1 text-xs text-indigo-100">Perfect {accuracy.perfect} • Great {accuracy.great} • Good {accuracy.good} • Miss {accuracy.miss}</div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.4em] text-indigo-200">Progress</div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-indigo-100">
              {progressStatus}
            </div>
          </div>
          <div className="mt-1 text-lg font-semibold text-white">{progressPercent}%</div>
          <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-white/12">
            {progressMarkers.map((marker) => (
              <span
                key={marker.toFixed(3)}
                className="pointer-events-none absolute top-0 bottom-0 w-[1px] bg-white/25"
                style={{ left: `${marker * 100}%` }}
              />
            ))}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-sky-400 transition-[width] duration-150 ease-out"
              style={{ width: `${progressFillWidth}%` }}
            />
          </div>
        </div>
      </div>

      {selectedTrack && (
        <div className="mt-3 text-center text-xs text-slate-200">
          Now playing <span className="font-semibold text-white">{selectedTrack.title}</span> •{' '}
          <a href={selectedTrack.license.url} className="text-indigo-200 underline" target="_blank" rel="noreferrer">
            {selectedTrack.license.name}
          </a>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs uppercase tracking-[0.35em] text-indigo-200">
        {KEY_LABELS.map((label) => (
          <span key={label} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/12 font-semibold text-white shadow-inner">
            {label}
          </span>
        ))}
        <span className="text-slate-200">or tap the lanes</span>
      </div>
    </div>
  );
}
