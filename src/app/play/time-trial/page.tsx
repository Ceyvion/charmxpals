'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export default function TimeTrial() {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    setScore(0);
    setTimeLeft(10);
  };

  useEffect(() => {
    if (timeLeft <= 0) return;
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => { timerRef.current && clearTimeout(timerRef.current); };
  }, [timeLeft]);

  const tap = () => {
    if (timeLeft > 0) setScore((s) => s + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500/30 to-amber-400/30 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-white font-display">Time Trial</h1>
        <p className="text-white/80 mb-6">Tap as many times as you can in 10 seconds.</p>

        <div className="flex items-center justify-center gap-8 mb-6">
          <div>
            <div className="text-sm text-white/70">Time</div>
            <div className="text-3xl font-bold text-white">{timeLeft}s</div>
          </div>
          <div>
            <div className="text-sm text-white/70">Score</div>
            <div className="text-3xl font-bold text-white">{score}</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button onClick={start} className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100">Start</button>
          <button onClick={tap} disabled={timeLeft <= 0} className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg font-semibold disabled:opacity-60 hover:bg-white/5">Tap</button>
          <Link href="/play" className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Game Hub</Link>
        </div>

        {timeLeft === 0 && score > 0 && (
          <div className="mt-6 text-white/90">Nice run! Share your score: <span className="font-semibold">{score}</span></div>
        )}
      </div>
    </div>
  );
}
