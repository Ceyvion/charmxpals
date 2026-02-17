'use client';

import Link from 'next/link';

import ArenaClient from '@/components/ArenaClient';

export default function ArenaPage() {
  return (
    <div className="min-h-screen bg-grid-overlay py-12 px-4">
      <div className="cp-container space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Rift Arena (Preview)</h1>
          <Link href="/play" className="text-sm text-gray-300 hover:text-white">
            Back to Play
          </Link>
        </div>
        <p className="text-gray-300">
          Real-time 2D arena proof-of-concept. Use WASD/Arrow keys to move and press <code>Space</code> to cast pulse.
        </p>
        <ArenaClient height={500} />
      </div>
    </div>
  );
}
