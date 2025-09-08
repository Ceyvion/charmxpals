'use client';

import Link from 'next/link';
import Runner from '@/components/Runner';

export default function RunnerGame() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display">Endless Runner</h1>
          <p className="text-white/80">Tap to jump • Swipe down to slide. Collect coins and survive.</p>
        </div>
        <Runner />
        <div className="mt-6 text-center">
          <Link href="/play" className="px-5 py-2.5 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Game Hub</Link>
        </div>
      </div>
    </div>
  );
}
