'use client';

import PlazaClient from '@/components/PlazaClient';
import Link from 'next/link';

export default function PlazaPage() {
  return (
    <div className="relative min-h-screen" style={{ background: '#060610', color: '#f2f7ff' }}>
      {/* Ambient grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: '720px',
          height: '320px',
          background: 'radial-gradient(ellipse at center, rgba(255,214,10,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">&#x1F4E1;</span>
              <span
                className="rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.2em]"
                style={{ background: 'rgba(255,214,10,0.15)', color: '#FFD60A', border: '1px solid rgba(255,214,10,0.25)' }}
              >
                Preview
              </span>
            </div>
            <h1
              className="mt-3 font-display text-4xl font-black tracking-tight md:text-5xl"
              style={{ color: '#f2f7ff' }}
            >
              Signal Plaza
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              The nightly link-up inside the Skylink Atrium. DJ Prismix keeps the shard stable so crews
              can sync strats, swap charm loadouts, and show off new footwork.
            </p>
          </div>

          <Link
            href="/play"
            className="flex items-center gap-2 self-start rounded-lg px-4 py-2 text-sm font-semibold transition sm:self-auto"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.6)',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <span aria-hidden="true">&larr;</span>
            Back to Play
          </Link>
        </div>

        {/* Plaza client */}
        <PlazaClient height={520} />

        {/* Controls hint */}
        <div
          className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.7rem] font-medium uppercase tracking-[0.16em]"
          style={{ color: 'rgba(255,255,255,0.28)' }}
        >
          <span>
            <kbd className="mr-1.5 rounded border px-1.5 py-0.5 text-[0.6rem]" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>W</kbd>
            <kbd className="mr-1.5 rounded border px-1.5 py-0.5 text-[0.6rem]" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>A</kbd>
            <kbd className="mr-1.5 rounded border px-1.5 py-0.5 text-[0.6rem]" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>S</kbd>
            <kbd className="rounded border px-1.5 py-0.5 text-[0.6rem]" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>D</kbd>
            <span className="ml-1">Move</span>
          </span>
          <span>Click emotes to express</span>
          <span>Chat to connect</span>
        </div>
      </div>
    </div>
  );
}
