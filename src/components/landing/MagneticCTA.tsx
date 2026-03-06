"use client";

import Link from 'next/link';
import { trackEvent } from '@/lib/analyticsClient';

export default function MagneticCTA() {
  return (
    <section className="relative py-32 md:py-40 overflow-hidden cp-section-dark">
      <div className="cp-container max-w-5xl relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-8">
            <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-green)]" />
            <span className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--cp-gray-400)]">
              Join the movement
            </span>
          </div>

          <h2 className="font-display font-black text-6xl md:text-7xl lg:text-8xl leading-[0.9] mb-8">
            <span className="block text-[var(--cp-white)]">Ready to</span>
            <span className="block cp-gradient-text">Claim Your Pal?</span>
          </h2>

          <p className="text-xl md:text-2xl text-[var(--cp-gray-400)] max-w-2xl mx-auto mb-12">
            Join thousands of collectors. Flash your code, boot instantly, flex forever.
          </p>

          <div className="relative inline-block">
            <Link
              href="/claim"
              className="cp-cta-primary font-display text-base md:text-lg"
              onClick={() => trackEvent('home_cta_click', { target: 'claim', source: 'closing_cta' })}
            >
              <span>Claim Your CharmXPal</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-10 text-[var(--cp-gray-400)]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-green)]" />
              <span className="text-sm font-semibold">Secure & Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-cyan)]" />
              <span className="text-sm font-semibold">Boot in under 5s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-yellow)]" />
              <span className="text-sm font-semibold">Own forever</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <Link
              href="/explore"
              className="cp-cta-ghost font-display text-sm"
              onClick={() => trackEvent('home_cta_click', { target: 'explore', source: 'closing_cta' })}
            >
              Browse Roster
            </Link>
            <Link
              href="/play"
              className="cp-cta-ghost font-display text-sm"
              onClick={() => trackEvent('home_cta_click', { target: 'play', source: 'closing_cta' })}
            >
              Try Demo
            </Link>
            <Link
              href="/plaza"
              className="cp-cta-ghost font-display text-sm"
              onClick={() => trackEvent('home_cta_click', { target: 'plaza', source: 'closing_cta' })}
            >
              Join Plaza
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
