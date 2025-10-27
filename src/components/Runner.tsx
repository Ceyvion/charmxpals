"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type GameState = 'menu' | 'countdown' | 'playing' | 'over';
type Judgment = 'perfect' | 'great' | 'good' | 'miss';

type RunnerProps = {
  stats?: Record<string, number> | null;
  audio?: { enabled: boolean; playHit?: () => void; playMiss?: () => void; playPulse?: () => void } | null;
  onGameOver?: (finalScore: number, maxCombo: number) => void;
};

type Note = {
  id: number;
  lane: number;
  time: number;
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

type Track = {
  notes: Note[];
  duration: number;
  travelMs: number;
  tempo: number;
  perfectWindow: number;
  greatWindow: number;
  goodWindow: number;
};

type LaneEffect = { lane: number; until: number; strength: number };

const LANES = 4;
const KEY_BINDINGS = ['KeyF', 'KeyG', 'KeyH', 'KeyJ'];
const KEY_LABELS = ['F', 'G', 'H', 'J'];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seededRandom(seed: number) {
  return () => {
    seed = (seed * 48271) % 0x7fffffff;
    return (seed & 0x7fffffff) / 0x7fffffff;
  };
}

function readStat(stats: Record<string, number> | null | undefined, key: string, fallback: number) {
  if (!stats) return fallback;
  const target = key.toLowerCase();
  for (const [k, v] of Object.entries(stats)) {
    if (typeof v !== 'number') continue;
    if (k.toLowerCase() === target) return clamp(v, 0, 100);
  }
  return fallback;
}

function drawCapsule(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function generateTrack(rhythmStat: number, flowStat: number): Track {
  const rhythm = clamp(rhythmStat, 20, 95);
  const flow = clamp(flowStat, 20, 95);
  const tempo = 112 + rhythm * 0.42; // 112..152 BPM
  const beat = 60000 / tempo;
  const travelMs = clamp(2100 - flow * 9, 1320, 2100);
  const perfectWindow = clamp(84 - rhythm * 0.28, 44, 84);
  const greatWindow = perfectWindow + 70;
  const goodWindow = greatWindow + 90;
  const sections = 26 + Math.round(rhythm / 12);
  const seed = Math.round((rhythm + 11) * 97 + (flow + 5) * 157 + Date.now());
  const random = seededRandom(seed);

  const laneCycles = [
    [0, 1, 2, 3],
    [3, 2, 1, 0],
    [1, 3, 0, 2],
    [2, 0, 3, 1],
  ];

  const patternLibrary: Array<(baseTime: number, lanes: number[], rand: () => number) => Array<[number, number]>> = [
    (t, lanes) => [
      [lanes[0], t],
      [lanes[1], t + beat * 0.5],
      [lanes[2], t + beat],
      [lanes[3], t + beat * 1.5],
    ],
    (t, lanes) => [
      [lanes[3], t],
      [lanes[2], t + beat * 0.5],
      [lanes[1], t + beat],
      [lanes[0], t + beat * 1.5],
    ],
    (t, lanes) => [
      [lanes[1], t],
      [lanes[2], t + beat * 0.375],
      [lanes[1], t + beat * 0.75],
      [lanes[3], t + beat * 1.125],
      [lanes[0], t + beat * 1.5],
    ],
    (t, lanes) => [
      [lanes[0], t],
      [lanes[2], t],
      [lanes[1], t + beat * 0.5],
      [lanes[3], t + beat * 0.5],
      [lanes[1], t + beat],
    ],
    (t, lanes) => {
      const hits: Array<[number, number]> = [];
      for (let i = 0; i < 4; i++) hits.push([lanes[i % LANES], t + beat * 0.25 * i]);
      hits.push([lanes[2], t + beat]);
      hits.push([lanes[1], t + beat * 1.25]);
      return hits;
    },
    (t, lanes) => [
      [lanes[0], t],
      [lanes[3], t + beat * 0.5],
      [lanes[1], t + beat * 0.5],
      [lanes[2], t + beat],
      [lanes[0], t + beat],
      [lanes[1], t + beat * 1.5],
      [lanes[3], t + beat * 1.5],
    ],
    (t, lanes, rand) => {
      const hits: Array<[number, number]> = [];
      const shuffle = [...lanes];
      for (let i = shuffle.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffle[i], shuffle[j]] = [shuffle[j], shuffle[i]];
      }
      hits.push([shuffle[0], t]);
      hits.push([shuffle[0], t + beat / 3]);
      hits.push([shuffle[0], t + (2 * beat) / 3]);
      hits.push([shuffle[2], t + beat]);
      hits.push([shuffle[1], t + beat * 1.375]);
      hits.push([shuffle[3], t + beat * 1.75]);
      return hits;
    },
    (t, lanes) => [
      [lanes[0], t],
      [lanes[3], t + beat * 0.25],
      [lanes[1], t + beat * 0.5],
      [lanes[2], t + beat * 0.75],
      [lanes[0], t + beat],
      [lanes[3], t + beat * 1.25],
      [lanes[2], t + beat * 1.5],
    ],
  ];

  const notes: Note[] = [];
  let id = 0;
  for (let section = 0; section < sections; section++) {
    const baseTime = section * 4 * beat;
    const lanes = laneCycles[section % laneCycles.length];
    const pattern = patternLibrary[Math.floor(random() * patternLibrary.length)];
    const hits = pattern(baseTime, lanes, random);
    for (const [lane, time] of hits) {
      notes.push({ id: id++, lane, time, judged: false });
    }
    if (section > 4 && random() > 0.72) {
      const lane = lanes[Math.floor(random() * lanes.length)];
      const offset = beat * (1.35 + random() * 1.6);
      notes.push({ id: id++, lane, time: baseTime + offset, judged: false });
    }
  }

  const duration = sections * 4 * beat + beat * 4;
  return { notes, duration, travelMs, tempo, perfectWindow, greatWindow, goodWindow };
}

export default function Runner({ stats, audio, onGameOver }: RunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef<GameState>('menu');
  const audioRef = useRef<typeof audio>(audio);
  const scoreRef = useRef(0);
  const maxComboRef = useRef(0);

  const [state, setState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [judgment, setJudgment] = useState<{ kind: Exclude<Judgment, 'miss'> | 'miss'; at: number } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<Accuracy>({ perfect: 0, great: 0, good: 0, miss: 0 });

  const worldRef = useRef({
    notes: [] as Note[],
    track: null as Track | null,
    startAt: 0,
    currentTime: 0,
    countdownEnds: 0,
    countdownDisplay: null as number | null,
    width: 0,
    height: 0,
    judgedCount: 0,
    effects: [] as LaneEffect[],
    didSubmit: false,
  });

  const setGameState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    maxComboRef.current = maxCombo;
  }, [maxCombo]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(360, container.clientWidth);
      const height = Math.max(460, Math.round(width * 1.2));
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
    const rhythm = readStat(stats, 'rhythm', 62);
    const flow = readStat(stats, 'flow', 58);
    const track = generateTrack(rhythm, flow);
    const world = worldRef.current;
    world.track = track;
    world.notes = track.notes.map((note) => ({ ...note, judged: false }));
    world.startAt = 0;
    world.currentTime = 0;
    world.countdownEnds = performance.now() + 2200;
    world.countdownDisplay = 3;
    world.judgedCount = 0;
    world.effects = [];
    world.didSubmit = false;
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setAccuracy({ perfect: 0, great: 0, good: 0, miss: 0 });
    setJudgment(null);
    setCountdown(3);
    setGameState('countdown');
    if (audioRef.current?.enabled) audioRef.current.playPulse?.();
  }, [setGameState, stats]);

  const finishGame = useCallback(() => {
    const world = worldRef.current;
    if (world.didSubmit) return;
    world.didSubmit = true;
    setGameState('over');
    onGameOver?.(scoreRef.current, maxComboRef.current);
  }, [onGameOver, setGameState]);

  const judgeLane = useCallback((lane: number) => {
    if (stateRef.current !== 'playing') return;
    const world = worldRef.current;
    const track = world.track;
    if (!track) return;
    const now = performance.now();
    const currentTime = world.currentTime;
    let target: Note | null = null;
    for (const note of world.notes) {
      if (note.lane !== lane || note.judged) continue;
      if (note.time > currentTime && note.time - currentTime > track.goodWindow) break;
      if (Math.abs(note.time - currentTime) <= track.goodWindow) {
        target = note;
        break;
      }
    }
    if (!target) return;

    const delta = Math.abs(target.time - currentTime);
    let result: Judgment = 'good';
    if (delta <= track.perfectWindow) result = 'perfect';
    else if (delta <= track.greatWindow) result = 'great';

    target.judged = true;
    target.result = result;
    target.flashUntil = now + 220;
    world.judgedCount += 1;

    setCombo((value) => {
      const next = value + 1;
      setMaxCombo((prev) => (next > prev ? next : prev));
      return next;
    });

    setAccuracy((acc) => {
      if (result === 'perfect') return { ...acc, perfect: acc.perfect + 1 };
      if (result === 'great') return { ...acc, great: acc.great + 1 };
      return { ...acc, good: acc.good + 1 };
    });

    const gained = result === 'perfect' ? 1200 : result === 'great' ? 950 : 620;
    setScore((value) => value + gained);
    setJudgment({ kind: result, at: now });

    world.effects.push({ lane, until: now + 260, strength: result === 'perfect' ? 1 : 0.6 });
    if (audioRef.current?.enabled) audioRef.current.playHit?.();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const laneIndex = KEY_BINDINGS.indexOf(event.code);
      if (laneIndex !== -1) {
        event.preventDefault();
        judgeLane(laneIndex);
        return;
      }
      if ((event.code === 'Space' || event.code === 'Enter') && (stateRef.current === 'menu' || stateRef.current === 'over')) {
        event.preventDefault();
        startGame();
      }
      if (event.code === 'Escape' && stateRef.current === 'playing') {
        event.preventDefault();
        finishGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [finishGame, judgeLane, startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handlePointer = (event: PointerEvent) => {
      if (stateRef.current !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const lane = clamp(Math.floor((x / rect.width) * LANES), 0, LANES - 1);
      judgeLane(lane);
    };
    canvas.addEventListener('pointerdown', handlePointer);
    return () => canvas.removeEventListener('pointerdown', handlePointer);
  }, [judgeLane]);

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
      const world = worldRef.current;
      world.width = width;
      world.height = height;

      const currentState = stateRef.current;
      const audioNow = audioRef.current;
      if (currentState === 'countdown') {
        if (!world.countdownEnds) world.countdownEnds = now + 2000;
        const remaining = world.countdownEnds - now;
        const display = remaining > 0 ? Math.ceil(remaining / 1000) : null;
        if (display !== world.countdownDisplay) {
          world.countdownDisplay = display;
          setCountdown(display);
          if (display !== null && audioNow?.enabled) audioNow.playPulse?.();
        }
        if (remaining <= 0) {
          world.startAt = now;
          world.currentTime = 0;
          world.countdownEnds = 0;
          world.countdownDisplay = null;
          setCountdown(null);
          setGameState('playing');
        }
      } else if (currentState === 'playing') {
        world.currentTime = now - world.startAt;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const top = height * 0.08;
      const hitLine = height * 0.82;
      const laneWidth = width / LANES;

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(252, 244, 255, 0.95)');
      gradient.addColorStop(0.55, 'rgba(213, 236, 255, 0.9)');
      gradient.addColorStop(1, 'rgba(196, 188, 255, 0.88)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const waveTime = now / 1000;
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 3; i++) {
        const pulseX = ((waveTime * (0.12 + i * 0.08)) % 1) * width;
        const radial = ctx.createRadialGradient(pulseX, height * (0.22 + i * 0.3), 40, pulseX, height * (0.22 + i * 0.3), width * 0.9);
        radial.addColorStop(0, 'rgba(255, 192, 241, 0.45)');
        radial.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(36, 15, 68, 0.28)';
      ctx.fillRect(width * 0.09, top - 24, width * 0.82, 7);

      const track = world.track;
      if (track) {
        const progress = clamp(track.duration > 0 ? world.currentTime / track.duration : 0, 0, 1);
        ctx.fillStyle = 'rgba(98, 82, 255, 0.65)';
        ctx.fillRect(width * 0.09, top - 24, width * 0.82 * progress, 7);
      }

      for (let lane = 0; lane < LANES; lane++) {
        const laneX = lane * laneWidth + laneWidth * 0.12;
        const laneW = laneWidth * 0.76;
        const laneGradient = ctx.createLinearGradient(laneX, top, laneX + laneW, hitLine);
        laneGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        laneGradient.addColorStop(0.4, 'rgba(255, 229, 254, 0.12)');
        laneGradient.addColorStop(1, 'rgba(196, 221, 255, 0.18)');
        ctx.fillStyle = laneGradient;
        drawCapsule(ctx, laneX, top, laneW, hitLine - top + 14, laneW * 0.18);

        ctx.strokeStyle = 'rgba(98, 82, 255, 0.14)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lane * laneWidth, top);
        ctx.lineTo(lane * laneWidth, hitLine + 20);
        ctx.stroke();
      }

      world.effects = world.effects.filter((effect) => effect.until > now);
      for (const effect of world.effects) {
        const strength = clamp((effect.until - now) / 260, 0, 1) * effect.strength;
        const laneX = effect.lane * laneWidth + laneWidth * 0.12;
        const laneW = laneWidth * 0.76;
        const highlight = ctx.createLinearGradient(laneX, top, laneX + laneW, hitLine);
        highlight.addColorStop(0, `rgba(255, 255, 255, ${0.28 * strength})`);
        highlight.addColorStop(1, `rgba(130, 166, 255, ${0.4 * strength})`);
        ctx.fillStyle = highlight;
        drawCapsule(ctx, laneX, top, laneW, hitLine - top + 14, laneW * 0.18);
      }

      ctx.fillStyle = 'rgba(48, 21, 90, 0.82)';
      ctx.fillRect(width * 0.07, hitLine, width * 0.86, 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillRect(width * 0.07, hitLine + 6, width * 0.86, 1.2);

      if (track) {
        const travelDistance = hitLine - top;
        const misses: Note[] = [];
        for (const note of world.notes) {
          const timeUntil = note.time - world.currentTime;
          if (!note.judged && stateRef.current === 'playing' && world.currentTime - note.time > track.goodWindow + 60) {
            note.judged = true;
            note.result = 'miss';
            note.flashUntil = now + 160;
            world.judgedCount += 1;
            misses.push(note);
          }

          if (timeUntil > track.travelMs + 200) continue;
          const progress = 1 - clamp(timeUntil / track.travelMs, 0, 1);
          const laneX = note.lane * laneWidth + laneWidth * 0.22;
          const laneW = laneWidth * 0.56;
          const noteHeight = laneW * 0.8;
          const y = top + travelDistance * progress - noteHeight / 2;
          if (note.result === 'miss' && note.judged && progress >= 1) continue;

          const opacity = note.judged ? (note.result === 'miss' ? 0.25 : 0.5) : 0.9;
          ctx.fillStyle = note.result === 'miss' ? `rgba(255, 99, 132, ${opacity})` : `rgba(90, 115, 255, ${opacity})`;
          drawCapsule(ctx, laneX, y, laneW, noteHeight, noteHeight / 2);

          if (note.flashUntil && note.flashUntil > now) {
            const flashStrength = clamp((note.flashUntil - now) / 220, 0, 1);
            ctx.save();
            ctx.globalAlpha = flashStrength * 0.6;
            const haloRadius = laneW * 0.9;
            const halo = ctx.createRadialGradient(note.lane * laneWidth + laneWidth / 2, hitLine + 4, 6, note.lane * laneWidth + laneWidth / 2, hitLine + 4, haloRadius);
            halo.addColorStop(0, 'rgba(255,255,255,0.8)');
            halo.addColorStop(1, 'rgba(105,125,255,0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(note.lane * laneWidth + laneWidth / 2, hitLine + 4, haloRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        if (misses.length) {
          setCombo(0);
          setAccuracy((acc) => ({ ...acc, miss: acc.miss + misses.length }));
          setJudgment({ kind: 'miss', at: now });
          if (audioNow?.enabled) audioNow.playMiss?.();
        }

        if (stateRef.current === 'playing') {
          const endReached = world.judgedCount >= world.notes.length && world.currentTime > track.duration;
          if (endReached) finishGame();
        }
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [finishGame, setGameState]);

  useEffect(() => {
    if (!judgment) return;
    const timeout = window.setTimeout(() => setJudgment((current) => (current === judgment ? null : current)), 720);
    return () => window.clearTimeout(timeout);
  }, [judgment]);

  const accuracySummary = useMemo(() => {
    const total = accuracy.perfect + accuracy.great + accuracy.good + accuracy.miss;
    if (total === 0) return { percent: 0, total };
    const weighted = accuracy.perfect * 1 + accuracy.great * 0.82 + accuracy.good * 0.6;
    const percent = Math.round((weighted / total) * 100);
    return { percent, total };
  }, [accuracy]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-[32px] border border-white/20 bg-slate-900/30 shadow-[0_32px_120px_rgba(99,102,241,0.38)] backdrop-blur"
        />

        {(state === 'menu' || state === 'over') && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#fdf9ff]/80 via-[#f3f8ff]/70 to-[#f5f1ff]/80 text-center">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-indigo-500/70">Skylink Pulsegrid</p>
              <h2 className="mt-2 font-display text-4xl font-extrabold text-slate-900 md:text-5xl">Tap Into The Breakbeat</h2>
              <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 md:text-lg">
                Strike the four neon lanes as notes slam the beat line. Use the lane pads or hit the F • G • H • J keys to keep the combo alive.
              </p>
            </div>
            <div className="pointer-events-auto flex flex-col items-center gap-3">
              {state === 'over' && (
                <div className="rounded-2xl bg-white/70 px-6 py-4 text-slate-700 shadow-inner">
                  <div className="text-sm uppercase tracking-[0.3em] text-indigo-400">Run Summary</div>
                  <div className="mt-2 flex flex-wrap justify-center gap-5 text-sm md:text-base">
                    <div><span className="font-semibold text-slate-900">Score</span> {score}</div>
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
                {state === 'over' ? 'Run It Back' : 'Start the Mix'}
              </button>
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Press Space or Enter</div>
            </div>
          </div>
        )}

        {state === 'countdown' && countdown && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-slate-950/20">
            <div className="rounded-full border border-white/40 bg-white/75 px-12 py-8 shadow-lg backdrop-blur">
              <span className="font-display text-6xl font-black text-slate-900 md:text-7xl">{countdown}</span>
              <div className="mt-2 text-center text-sm uppercase tracking-[0.35em] text-slate-500">Drop In</div>
            </div>
          </div>
        )}

        {state === 'playing' && judgment && (
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
              {judgment.kind === 'perfect' && 'Perfect Sync'}
              {judgment.kind === 'great' && 'Great Timing'}
              {judgment.kind === 'good' && 'On Beat'}
              {judgment.kind === 'miss' && 'Signal Lost'}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 text-sm text-white/90 md:grid-cols-3">
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner">
          <div className="text-xs uppercase tracking-[0.4em] text-indigo-200">Score</div>
          <div className="mt-1 text-lg font-semibold text-white">{score.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner">
          <div className="text-xs uppercase tracking-[0.4em] text-indigo-200">Combo</div>
          <div className="mt-1 text-lg font-semibold text-white">{combo} <span className="text-xs font-medium text-indigo-100">Max {maxCombo}</span></div>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner">
          <div className="text-xs uppercase tracking-[0.4em] text-indigo-200">Accuracy</div>
          <div className="mt-1 text-lg font-semibold text-white">{accuracySummary.percent}%</div>
          <div className="mt-1 text-xs text-indigo-100">Perfect {accuracy.perfect} • Great {accuracy.great} • Good {accuracy.good} • Miss {accuracy.miss}</div>
        </div>
      </div>

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
