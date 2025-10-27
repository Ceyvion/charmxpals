"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pulsegridTracks, type PulsegridNote, type PulsegridTrack } from '@/data/pulsegridTracks';

type GameState = 'menu' | 'countdown' | 'playing' | 'over';
type Judgment = 'perfect' | 'great' | 'good' | 'miss';

type RunnerProps = {
  stats?: Record<string, number> | null;
  audio?: { enabled: boolean; playHit?: () => void; playMiss?: () => void; playPulse?: () => void } | null;
  onGameOver?: (finalScore: number, maxCombo: number, trackId: string) => void;
};

type RuntimeNote = PulsegridNote & {
  judged: boolean;
  result?: Judgment;
  flashUntil?: number;
};

type Accuracy = {
  perfect: number;
  great: number;
  good: number;
  miss: number;
};

type LaneEffect = { lane: number; until: number; strength: number };

const LANES = 4;
const HIT_WINDOWS = { perfect: 55, great: 95, good: 140 } as const; // ms windows centered on the beat
const MISS_WINDOW_BASE = 180; // ms after the beat before a note counts as a miss
const TRAVEL_MS_BASE = 1800; // how long a note takes to travel from spawn to the hit line
const COUNTDOWN_MS = 2900;

const SCORE_VALUE: Record<Exclude<Judgment, 'miss'>, number> = {
  perfect: 1250,
  great: 940,
  good: 660,
};

const JUDGMENT_LABEL: Record<Judgment, string> = {
  perfect: 'Perfect Sync',
  great: 'Great Timing',
  good: 'On Beat',
  miss: 'Signal Lost',
};

const KEY_BINDINGS = ['KeyF', 'KeyG', 'KeyH', 'KeyJ'];
const KEY_LABELS = ['F', 'G', 'H', 'J'];

const defaultAccuracy: Accuracy = { perfect: 0, great: 0, good: 0, miss: 0 };
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [judgment, setJudgment] = useState<{ kind: Judgment; at: number } | null>(null);
  const [accuracy, setAccuracy] = useState<Accuracy>(defaultAccuracy);

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);

  const worldRef = useRef({
    notes: [] as RuntimeNote[],
    nextIndex: 0,
    currentTime: 0,
    countdownEnds: 0,
    effects: [] as LaneEffect[],
    track: selectedTrack as PulsegridTrack | null,
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
    };
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setAccuracy(defaultAccuracy);
    setJudgment(null);
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
    setCountdown(3);
    setGameState('countdown');
    if (audio?.enabled) audio.playPulse?.();
  }, [audio, resetWorld, selectedTrack]);

  const submitRun = useCallback(() => {
    const world = worldRef.current;
    if (world.didSubmit || !selectedTrack) return;
    world.didSubmit = true;
    onGameOver?.(scoreRef.current, maxComboRef.current, selectedTrack.id);
  }, [onGameOver, selectedTrack]);

  const finishGame = useCallback(() => {
    if (gameState === 'over') return;
    setGameState('over');
    setCountdown(null);
    submitRun();
  }, [gameState, submitRun]);

  const handleMiss = useCallback(() => {
    setCombo(0);
    comboRef.current = 0;
    setAccuracy((prev) => ({ ...prev, miss: prev.miss + 1 }));
    setJudgment({ kind: 'miss', at: performance.now() });
    if (audio?.enabled) audio.playMiss?.();
  }, [audio]);

  const handleJudgment = useCallback((note: RuntimeNote, deltaMs: number, now: number) => {
    const absDelta = Math.abs(deltaMs);
    let kind: Judgment = 'good';
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
    setJudgment({ kind, at: now });
    if (audio?.enabled) audio.playHit?.();

    worldRef.current.effects.push({ lane: note.lane, until: now + 260, strength: kind === 'perfect' ? 1 : 0.7 });
  }, [audio, tunedWindows]);

  const judgeLane = useCallback((lane: number) => {
    if (gameState !== 'playing') return;
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
  }, [gameState, handleJudgment, missWindow, tunedWindows.good]);

  useEffect(() => {
    const downHandler = (event: KeyboardEvent) => {
      const laneIndex = KEY_BINDINGS.indexOf(event.code);
      if (laneIndex !== -1) {
        event.preventDefault();
        judgeLane(laneIndex);
        return;
      }
      if ((event.code === 'Space' || event.code === 'Enter') && (gameState === 'menu' || gameState === 'over')) {
        event.preventDefault();
        startGame();
      }
      if (event.code === 'Escape' && gameState === 'playing') {
        event.preventDefault();
        finishGame();
      }
    };
    window.addEventListener('keydown', downHandler);
    return () => window.removeEventListener('keydown', downHandler);
  }, [finishGame, gameState, judgeLane, startGame]);

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
            audioEl.currentTime = 0;
            const playPromise = audioEl.play();
            if (playPromise?.catch) playPromise.catch(() => {});
          }
        }
      }

      if (gameState === 'playing') {
        world.currentTime = (audioEl?.currentTime ?? 0) * 1000;
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
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 3; i += 1) {
        const pulseX = ((now / 1000) * (0.08 + i * 0.05)) % 1 * width;
        const radial = ctx.createRadialGradient(pulseX, height * (0.18 + i * 0.24), 40, pulseX, height * (0.18 + i * 0.24), width * 0.9);
        radial.addColorStop(0, `${accent}55`);
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
        const strength = (remaining / 260) * effect.strength;
        const laneX = effect.lane * laneWidth + laneWidth * 0.12;
        const laneW = laneWidth * 0.76;
        const highlight = ctx.createLinearGradient(laneX, top, laneX + laneW, hitLine);
        highlight.addColorStop(0, `rgba(255, 255, 255, ${0.32 * strength})`);
        highlight.addColorStop(1, `rgba(130, 166, 255, ${0.45 * strength})`);
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
          handleMiss();
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
        finishGame();
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [audio, countdown, finishGame, gameState, handleMiss, missWindow, selectedTrack, travelMs]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const onEnded = () => finishGame();
    audioEl.addEventListener('ended', onEnded);
    return () => audioEl.removeEventListener('ended', onEnded);
  }, [finishGame]);

  const accuracySummary = useMemo(() => {
    const total = accuracy.perfect + accuracy.great + accuracy.good + accuracy.miss;
    if (total === 0) return { percent: 0, total };
    const weighted = accuracy.perfect * 1 + accuracy.great * 0.82 + accuracy.good * 0.6;
    return { percent: Math.round((weighted / total) * 100), total };
  }, [accuracy]);

  const trackCards = useMemo(() => pulsegridTracks, []);

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
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Space or Enter</div>
            </div>
          </div>
        )}

        {gameState === 'countdown' && countdown && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-slate-950/25">
            <div className="rounded-full border border-white/40 bg-white/80 px-12 py-8 shadow-lg backdrop-blur">
              <span className="font-display text-6xl font-black text-slate-900 md:text-7xl">{countdown}</span>
              <div className="mt-2 text-center text-sm uppercase tracking-[0.35em] text-slate-500">Drop In</div>
            </div>
          </div>
        )}

        {gameState === 'playing' && judgment && (
          <div className="pointer-events-none absolute inset-x-0 top-12 flex justify-center">
            <div
              className={`rounded-full px-6 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-white shadow-lg transition ${
                judgment.kind === 'perfect'
                  ? 'bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-sky-500'
                  : judgment.kind === 'great'
                    ? 'bg-gradient-to-r from-indigo-400 via-sky-400 to-fuchsia-400'
                    : judgment.kind === 'good'
                      ? 'bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500'
                      : 'bg-gradient-to-r from-rose-500 via-amber-500 to-slate-900'
              }`}
            >
              {JUDGMENT_LABEL[judgment.kind]}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
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
