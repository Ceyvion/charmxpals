'use client';

import PlazaClient from '@/components/PlazaClient';

export default function PlazaPage() {
  return (
    <div className="relative min-h-screen" style={{ background: '#03050d', color: '#f2f7ff', overflowX: 'hidden' }}>
      {/* Ambient grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(35,243,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(35,243,255,0.045) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: 'min(720px, 100vw)',
          height: '320px',
          background: 'radial-gradient(ellipse at center, rgba(255,214,10,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1820px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <PlazaClient height={680} />

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
