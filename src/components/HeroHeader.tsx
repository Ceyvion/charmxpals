"use client";

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import anime from 'animejs';

export default function HeroHeader() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const titleLines = root.querySelectorAll<HTMLElement>('[data-hero-title] > span');
    const sub = root.querySelector<HTMLElement>('[data-hero-sub]');
    const cta = root.querySelector<HTMLElement>('[data-hero-cta]');
    const proof = root.querySelector<HTMLElement>('[data-hero-proof]');

    // Reset initial states
    titleLines.forEach((el) => { el.style.opacity = '0'; el.style.transform = 'translateY(12px)'; });
    if (sub) { sub.style.opacity = '0'; sub.style.transform = 'translateY(10px)'; }
    if (cta) { cta.style.opacity = '0'; cta.style.transform = 'translateY(8px)'; }
    if (proof) { proof.style.opacity = '0'; proof.style.transform = 'translateY(6px)'; }

    const tl = anime.timeline({ easing: 'easeOutCubic' });
    tl.add({
      targets: Array.from(titleLines),
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 520,
      delay: anime.stagger(70),
    })
      .add({ targets: sub, opacity: [0, 1], translateY: [10, 0], duration: 420 }, '-=200')
      .add({ targets: cta, opacity: [0, 1], translateY: [8, 0], duration: 420 }, '-=140')
      .add({ targets: proof, opacity: [0, 1], translateY: [6, 0], duration: 360 }, '-=140');
  }, []);

  return (
    <div ref={rootRef} className="text-center max-w-4xl mx-auto">
      <div className="inline-flex items-center gap-2 mb-4">
        <span className="cp-chip">Season One • Free Access</span>
      </div>
      <h1 className="font-display font-extrabold leading-tight text-5xl sm:text-6xl md:text-8xl" data-hero-title>
        <span>Scan a Charm.</span>
        <br />
        <span>Meet Your Pal.</span>
      </h1>
      <p className="mt-3 cp-muted text-base sm:text-lg md:text-xl" data-hero-sub>
        Unlock a 3D pal from your physical charm and jump into quick arcade games. No app—play in seconds.
      </p>
      <div className="mt-5 flex items-center justify-center" data-hero-cta>
        <div className="cp-cta">
          <Link href="/claim" className="px-5 py-2.5 bg-white text-gray-900 rounded-lg font-bold">Claim Your Pal</Link>
          <Link href="/play" className="px-5 py-2.5 border border-white/20 text-white rounded-lg font-bold hover:bg-white/5">Try a Game</Link>
          <Link href="/explore" className="hidden md:inline-flex px-5 py-2.5 border border-white/20 text-white rounded-lg font-bold hover:bg-white/5">Explore the Squad</Link>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-3 text-sm text-white/80" data-hero-proof>
        <span className="cp-pill">Trusted by players and creators</span>
        <span className="cp-chip">Indie Studios</span>
        <span className="cp-chip">Game Jams</span>
        <span className="cp-chip hidden sm:inline-flex">Toy Makers</span>
        <span className="cp-chip hidden md:inline-flex">Arcade Nights</span>
      </div>
    </div>
  );
}

