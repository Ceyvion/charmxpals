"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function FinalCTA() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="cp-container max-w-5xl relative z-10">
      <div
        className={`cp-panel p-8 md:p-16 text-center transition-all duration-1000 ${
          mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="cp-chip">Beta Access Available</span>
          </div>

          {/* Headline */}
          <h2 className="font-display font-black text-4xl md:text-5xl lg:text-6xl leading-tight">
            <span className="cp-gradient-text">Ready to Flex?</span>
            <br />
            <span className="text-white">Claim Your Pal Now.</span>
          </h2>

          {/* Subtext */}
          <p className="text-lg md:text-xl cp-muted max-w-2xl mx-auto">
            Join the beta wave. Get your CharmXPal, scan the code, and jump into the action in under 5 seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/claim"
              className="group relative inline-flex items-center justify-center px-10 py-5 text-lg font-black rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/50 w-full sm:w-auto"
              data-magnetic="cta"
              data-magnetic-color="sunrise"
              data-ripple
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative text-white font-display text-xl tracking-wide">
                Start Your Collection
              </span>
            </Link>

            <Link
              href="/explore"
              className="group inline-flex items-center justify-center px-10 py-5 text-lg font-bold rounded-2xl border-2 border-white/20 backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all duration-300 w-full sm:w-auto"
            >
              <span className="text-white font-display text-xl tracking-wide">
                Browse Roster
              </span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Trust Line */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-semibold">Secure Claims</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-semibold">Instant Activation</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-semibold">Own Forever</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Note */}
      <div
        className={`mt-8 text-center transition-all duration-1000 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        style={{ transitionDelay: '300ms' }}
      >
        <p className="text-sm text-white/50">
          Questions? Check out our{' '}
          <Link href="/explore" className="text-cyan-400 hover:text-cyan-300 underline font-semibold">
            FAQ
          </Link>
          {' '}or join the{' '}
          <Link href="/plaza" className="text-pink-400 hover:text-pink-300 underline font-semibold">
            Plaza
          </Link>
          {' '}to chat with the community.
        </p>
      </div>
    </div>
  );
}
