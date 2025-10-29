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
        <span className="cp-chip">Connected Toy Drop • Beta Live</span>
      </div>
      <h1 className="font-display font-extrabold leading-tight text-5xl sm:text-6xl md:text-8xl" data-hero-title>
        <span>Flash Your Charm.</span>
        <br />
        <span>Rule the Grid.</span>
      </h1>
      <p className="mt-3 cp-muted text-base sm:text-lg md:text-xl" data-hero-sub>
        Blink your CharmXPal and it boots up as a battle idol in five heartbeats. {worldTagline} Tangible collectible, instant flex, zero friction.
      </p>
      <div className="mt-5 flex items-center justify-center" data-hero-cta>
        <div className="cp-cta">
          <Link
            href="/claim"
            className="inline-flex cp-hero-cta-primary"
            data-magnetic="cta"
            data-magnetic-color="sunrise"
            data-ripple
          >
            Claim Your Flex
          </Link>
          <Link
            href="/explore"
            className="hidden md:inline-flex cp-hero-cta-secondary"
            data-magnetic="cta"
            data-magnetic-color="aqua"
            data-ripple
          >
            Meet the Crew
          </Link>
          <Link
            href="/play"
            className="inline-flex cp-hero-cta-secondary"
            data-magnetic="cta"
            data-magnetic-color="volt"
            data-ripple
          >
            Drop Into Demo
          </Link>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-3 text-sm text-white/80" data-hero-proof>
        <span className="cp-pill">Boot-Up &lt;5s • No downloads • One-shot codes</span>
        <span className="cp-chip hidden sm:inline-flex">No App. No Wallet.</span>
        <span className="cp-chip hidden md:inline-flex">Dance MMO Alpha</span>
      </div>
    </div>
  );
}
