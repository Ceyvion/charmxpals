'use client';

import PlazaClient from '@/components/PlazaClient';
import Link from 'next/link';

export default function PlazaPage() {
  return (
    <div className="min-h-screen bg-gray-950/90 py-12 px-4">
      <div className="cp-container space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Plaza (Preview)</h1>
          <Link href="/play" className="text-sm text-gray-300 hover:text-white">Back to Play</Link>
        </div>
        <p className="text-gray-300">Prototype multiplayer plaza. Start the dev server with <code>npm run mmo:server</code>.</p>
        <PlazaClient height={460} />
      </div>
    </div>
  );
}

