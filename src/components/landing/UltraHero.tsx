"use client";

import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { worldTagline } from '@/data/characterLore';

export default function UltraHero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointerFine = window.matchMedia('(pointer: fine)').matches;
    if (reduced || !pointerFine) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden cp-hero-warp">
      <div className="absolute inset-0 bg-grid-overlay cp-grid-soft opacity-40" />
      <div className="absolute -top-32 -right-24 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(125,231,255,0.35),_rgba(0,0,0,0)_60%)] blur-3xl opacity-70" />
      <div className="absolute -bottom-40 left-6 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_60%_40%,_rgba(255,185,154,0.26),_rgba(0,0,0,0)_65%)] blur-3xl opacity-70" />

      <div className="relative z-10 w-full px-4 py-24">
        <div className="cp-container max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div className="space-y-8">
              <div
                className={`inline-flex items-center gap-3 transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                }`}
              >
                <span className="cp-pill">Beta Wave 1</span>
                <span className="text-xs font-semibold tracking-[0.3em] uppercase text-white/50">
                  Live
                </span>
              </div>

              <div
                className={`transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '120ms' }}
              >
                <h1 className="font-display font-black leading-[0.9] tracking-tight text-6xl sm:text-7xl lg:text-8xl">
                  <span className="block text-white">Scan. Boot.</span>
                  <span className="block cp-gradient-text">Own the moment.</span>
                </h1>
              </div>

              <div
                className={`transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '220ms' }}
              >
                <p className="text-xl md:text-2xl text-white/80 leading-relaxed max-w-xl">
                  {worldTagline} Flash your CharmXPal and watch it materialize in under five seconds.
                </p>
                <p className="text-base md:text-lg text-white/60 mt-4 max-w-lg">
                  No apps, no wallets, no friction—just instant play.
                </p>
              </div>

              <div
                className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '320ms' }}
              >
                <Link
                  href="/claim"
                  className="cp-cta-primary font-display"
                  data-magnetic="hero"
                  data-magnetic-color="sunrise"
                  data-ripple
                >
                  <span>Claim Your Pal</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/play"
                  className="cp-cta-ghost font-display"
                  data-magnetic="hero"
                  data-magnetic-color="aqua"
                  data-ripple
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Play Demo</span>
                </Link>
              </div>

              <div
                className={`flex flex-wrap items-center gap-4 text-sm font-semibold text-white/60 transition-all duration-700 ${
                  mounted ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transitionDelay: '420ms' }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/70" />
                  <span>Boot in under 5s</span>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-200/70" />
                  <span>One-shot codes</span>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-200/70" />
                  <span>Verified ownership</span>
                </div>
              </div>
            </div>

            <div
              className={`relative transition-all duration-700 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: '240ms' }}
            >
              <div className="relative max-w-lg mx-auto">
                <div className="absolute -inset-6 bg-gradient-to-br from-cyan-400/25 via-white/5 to-amber-300/20 blur-3xl opacity-80" />
                <div
                  className="cp-surface-neo rounded-[2.25rem] p-8"
                  style={{ '--surface-accent': 'rgba(120, 224, 255, 0.35)' } as CSSProperties}
                >
                  <div
                    className="relative aspect-square rounded-[1.8rem] overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_20%_15%,_rgba(125,231,255,0.2),_rgba(0,0,0,0)_55%),_radial-gradient(circle_at_80%_20%,_rgba(255,181,154,0.18),_rgba(0,0,0,0)_60%),_linear-gradient(160deg,_rgba(14,20,38,0.9),_rgba(10,14,28,0.95))]"
                    style={{
                      transform: `perspective(1200px) rotateX(${mousePos.y * -6}deg) rotateY(${mousePos.x * 6}deg)`,
                      transition: 'transform 0.3s ease-out',
                    }}
                  >
                    <div className="absolute inset-0 bg-grid-overlay cp-grid-soft opacity-30" />
                    <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-[0.6rem] sm:text-xs uppercase tracking-[0.3em] text-white/55">
                      <span>Scan</span>
                      <span>Boot</span>
                      <span>Own</span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-2xl border border-white/15 bg-white/5 px-6 py-5 backdrop-blur">
                        <div className="text-white font-display text-4xl tracking-[0.2em]">CXP</div>
                        <div className="mt-2 text-[0.6rem] uppercase tracking-[0.4em] text-white/50 text-center">NFC</div>
                      </div>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs text-white/60">
                      <span>Instant sync</span>
                      <span>Secure</span>
                      <span>Verified</span>
                    </div>
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"
                      style={{ transform: `translate3d(${mousePos.x * 6}px, ${mousePos.y * 6}px, 0)` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
