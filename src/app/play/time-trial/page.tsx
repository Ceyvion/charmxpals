'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Target = { x: number; y: number; r: number };

export default function TimeTrial() {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [target, setTarget] = useState<Target | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    setScore(0);
    setTimeLeft(15);
    spawnNewTarget();
  };

  useEffect(() => {
    if (timeLeft <= 0) { clearTimers(); return; }
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => { timerRef.current && clearTimeout(timerRef.current); };
  }, [timeLeft]);

  const clearTimers = () => {
    timerRef.current && clearTimeout(timerRef.current);
    spawnRef.current && clearTimeout(spawnRef.current);
  };

  const spawnNewTarget = () => {
    const area = areaRef.current; if (!area) return;
    const rect = area.getBoundingClientRect();
    const r = 18;
    const x = Math.random() * (rect.width - r * 2) + r;
    const y = Math.random() * (rect.height - r * 2) + r;
    setTarget({ x, y, r });
    // schedule next spawn to keep it dynamic
    spawnRef.current && clearTimeout(spawnRef.current);
    spawnRef.current = setTimeout(spawnNewTarget, 800 + Math.random() * 600);
  };

  const onAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timeLeft <= 0) return;
    const area = areaRef.current; if (!area) return;
    const rect = area.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const t = target;
    if (t) {
      const dx = cx - t.x, dy = cy - t.y;
      const hit = dx * dx + dy * dy <= t.r * t.r;
      if (hit) { setScore((s) => s + 1); spawnNewTarget(); return; }
    }
    // miss reduces time
    setTimeLeft((t) => Math.max(0, t - 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500/30 to-amber-400/30 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-white font-display">Time Trial</h1>
        <p className="text-white/80 mb-4">Click targets quickly. Miss clicks reduce time.</p>

        <div className="flex items-center justify-center gap-8 mb-4">
          <div>
            <div className="text-sm text-white/70">Time</div>
            <div className="text-3xl font-bold text-white">{timeLeft}s</div>
          </div>
          <div>
            <div className="text-sm text-white/70">Score</div>
            <div className="text-3xl font-bold text-white">{score}</div>
          </div>
        </div>

        <div className="mb-4">
          <button onClick={start} className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100">Start</button>
          <Link href="/play" className="ml-3 px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Game Hub</Link>
        </div>

        <div
          ref={areaRef}
          onClick={onAreaClick}
          className="relative mx-auto h-64 w-full max-w-md rounded-xl border border-white/10 bg-black/30"
        >
          {target && timeLeft > 0 && (
            <div
              className="absolute rounded-full bg-emerald-400/90 ring-2 ring-emerald-200/70 shadow"
              style={{ left: target.x - target.r, top: target.y - target.r, width: target.r * 2, height: target.r * 2 }}
            />
          )}
          {timeLeft <= 0 && (
            <div className="absolute inset-0 grid place-items-center text-white/80">Click Start to play</div>
          )}
        </div>

        {timeLeft === 0 && score > 0 && (
          <div className="mt-6 text-white/90">Nice run! Score: <span className="font-semibold">{score}</span></div>
        )}
      </div>
    </div>
  );
}
