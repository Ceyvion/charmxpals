"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { worldTagline } from '@/data/characterLore';

export default function NewHeroSection() {
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center px-4 py-20 md:py-32">
      <div className="cp-container max-w-7xl">
        <div className="text-center space-y-8">
          {/* Eyebrow */}
          <div
            className={`inline-flex items-center gap-2 transition-all duration-700 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <span className="cp-chip animate-pulse">Live Now</span>
            <span className="cp-pill">Beta Wave 1</span>
          </div>

          {/* Main Headline - Extra Bold */}
          <h1
            className={`font-display font-black leading-[0.9] tracking-tight transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem]">
              <span className="block cp-gradient-text">
                Scan. Boot.
              </span>
              <span className="block text-white mt-2">
                Flex Forever.
              </span>
            </div>
          </h1>

          {/* Subheadline */}
          <div
            className={`max-w-3xl mx-auto transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-white/90 leading-tight">
              Your physical charm is your battle pass.
            </p>
            <p className="mt-4 text-base md:text-lg lg:text-xl cp-muted max-w-2xl mx-auto">
              {worldTagline} Flash your CharmXPal, it boots instantly. No downloads, no wallets—just pure collect-and-play energy.
            </p>
          </div>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            <Link
              href="/claim"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-black rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/50"
              data-magnetic="cta"
              data-magnetic-color="sunrise"
              data-ripple
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative text-white font-display text-xl tracking-wide">
                Claim Your Pal
              </span>
            </Link>

            <Link
              href="/play"
              className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-2xl border-2 border-white/20 backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all duration-300"
              data-magnetic="cta"
              data-magnetic-color="aqua"
            >
              <span className="text-white font-display text-xl tracking-wide">
                Play Demo
              </span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Trust Badges */}
          <div
            className={`flex flex-wrap items-center justify-center gap-3 md:gap-4 pt-8 transition-all duration-1000 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '800ms' }}
          >
            <div className="flex items-center gap-2 text-sm md:text-base text-white/70 font-semibold">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span>Boot in &lt;5s</span>
            </div>
            <span className="text-white/30">•</span>
            <div className="text-sm md:text-base text-white/70 font-semibold">
              No App Required
            </div>
            <span className="text-white/30">•</span>
            <div className="text-sm md:text-base text-white/70 font-semibold">
              One-Shot Codes
            </div>
            <span className="hidden sm:inline text-white/30">•</span>
            <div className="hidden sm:block text-sm md:text-base text-white/70 font-semibold">
              Plaza Alpha Live
            </div>
          </div>

          {/* Scroll Hint */}
          <div
            className={`pt-12 transition-all duration-1000 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: '1000ms' }}
          >
            <div className="inline-flex flex-col items-center gap-2 text-white/50">
              <span className="text-xs uppercase tracking-widest font-bold">Discover More</span>
              <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
