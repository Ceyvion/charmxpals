'use client';

import Link from 'next/link';

export default function ComparePage() {
  return (
    <div className="min-h-screen py-12 px-4 bg-grid-overlay">
      <div className="cp-container">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white font-display mb-2">Compare & Compete</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            See how your characters rank and challenge friends to battles.
          </p>
        </div>

        <div className="cp-panel overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white font-display">Leaderboards</h2>
            <p className="text-gray-300">Top players across the platform</p>
          </div>
          <div className="divide-y divide-white/10">
            {[1, 2, 3, 4, 5].map((rank) => (
              <div key={rank} className="p-4 flex items-center">
                <div className="w-8 h-8 flex items-center justify-center rounded-full cp-chip text-white/90 border-white/20">
                  {rank}
                </div>
                <div className="ml-4 flex-shrink-0 w-12 h-12 rounded-full" style={{ backgroundImage: 'var(--cp-gradient)' }} />
                <div className="ml-4 flex-grow">
                  <h3 className="font-bold text-white">Player {rank}</h3>
                  <p className="text-gray-300 text-sm">Blaze the Dragon</p>
                </div>
                <div className="text-right mr-2">
                  <div className="font-bold text-white">{10000 - rank * 500}</div>
                  <div className="text-xs text-gray-400">Score</div>
                </div>
                <Link href="/play/battle" className="ml-2 px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold hover:bg-gray-100">
                  Challenge
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
