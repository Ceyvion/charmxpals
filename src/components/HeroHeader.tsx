"use client";

import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';
import { worldTagline } from '@/data/characterLore';

export default function HeroHeader() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (prefersReduced?.matches) {
      root.dataset.heroReady = 'true';
      return;
    }
    root.dataset.heroAnimated = 'true';
    const frame = window.requestAnimationFrame(() => {
      root.dataset.heroReady = 'true';
    });
    return () => {
      window.cancelAnimationFrame(frame);
      delete root.dataset.heroAnimated;
      delete root.dataset.heroReady;
    };
  }, []);

  return (
    <div ref={rootRef} className="relative z-20 text-center max-w-4xl mx-auto">
      <div className="inline-flex items-center gap-2 mb-4">
        <span className="cp-chip">Connected Toy Drop • Open Beta</span>
      </div>
      <h1 className="font-display font-extrabold leading-tight text-5xl sm:text-6xl md:text-8xl" data-hero-title>
        <span>Scan Your Charm.</span>
        <br />
        <span>Command the Arena.</span>
      </h1>
      <p className="mt-3 cp-muted text-base sm:text-lg md:text-xl" data-hero-sub>
        Turn every CharmXPal collectible into a browser-playable champion in under five seconds. {worldTagline} Pair physical hype with instant dance battles—no downloads, no wallets, just rhythm.
      </p>
      <div className="mt-5 flex items-center justify-center" data-hero-cta>
        <div className="cp-cta">
          <Link href="/claim" className="inline-flex cp-hero-cta-primary">Unlock Now</Link>
          <Link href="/explore" className="hidden md:inline-flex cp-hero-cta-secondary">Preview the Crew</Link>
          <Link href="/play" className="inline-flex cp-hero-cta-secondary">Start a Demo Match</Link>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-3 text-sm text-white/80" data-hero-proof>
        <span className="cp-pill">Onboarding &lt;5s • Zero installs • Secure single-use codes</span>
        <span className="cp-chip hidden sm:inline-flex">No App Required</span>
        <span className="cp-chip hidden md:inline-flex">Dance MMO Alpha</span>
      </div>
    </div>
  );
}
