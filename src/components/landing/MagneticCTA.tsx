"use client";

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

export default function MagneticCTA() {
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const buttonRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 150;

    if (distance < maxDistance) {
      const strength = (maxDistance - distance) / maxDistance;
      setMagneticOffset({
        x: deltaX * strength * 0.3,
        y: deltaY * strength * 0.3,
      });
      setIsHovering(true);
    } else {
      setMagneticOffset({ x: 0, y: 0 });
      setIsHovering(false);
    }
  };

  const handleMouseLeave = () => {
    setMagneticOffset({ x: 0, y: 0 });
    setIsHovering(false);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 200;

      if (distance < maxDistance) {
        const strength = (maxDistance - distance) / maxDistance;
        setMagneticOffset({
          x: deltaX * strength * 0.2,
          y: deltaY * strength * 0.2,
        });
        setIsHovering(true);
      } else {
        setMagneticOffset({ x: 0, y: 0 });
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  return (
    <section className="relative py-32 md:py-40 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-0 bg-grid-overlay opacity-10" />

      <div className="cp-container max-w-5xl relative z-10">
        <div
          className="text-center"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-black uppercase tracking-widest text-white/90">
              Join The Movement
            </span>
          </div>

          {/* Headline */}
          <h2 className="font-display font-black text-6xl md:text-7xl lg:text-8xl leading-[0.9] mb-8">
            <span className="block text-white">Ready to</span>
            <span className="block cp-gradient-text">Claim Your Pal?</span>
          </h2>

          {/* Subtext */}
          <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-12">
            Join thousands of collectors. Flash your code, boot instantly, flex forever.
          </p>

          {/* Magnetic CTA Button */}
          <div className="relative inline-block">
            <Link
              ref={buttonRef}
              href="/claim"
              className="group relative inline-flex items-center justify-center px-12 py-6 overflow-hidden rounded-2xl font-black text-2xl transition-all duration-300"
              style={{
                transform: `translate(${magneticOffset.x}px, ${magneticOffset.y}px) scale(${isHovering ? 1.1 : 1})`,
              }}
            >
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-sheen" />

              {/* Button Content */}
              <span className="relative text-white font-display tracking-wide flex items-center gap-3">
                Claim Your CharmXPal
                <svg className="w-7 h-7 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>

              {/* Glow Effect */}
              <div
                className="absolute -inset-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-50 blur-2xl -z-10 transition-opacity duration-300"
                style={{ opacity: isHovering ? 0.7 : 0.3 }}
              />
            </Link>

            {/* Magnetic Field Indicator */}
            {isHovering && (
              <div className="absolute -inset-20 border-2 border-white/10 rounded-full animate-pulse-ring pointer-events-none" />
            )}
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-white/60">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-semibold">Secure & Verified</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-semibold">Boot in &lt;5s</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="font-semibold">Own Forever</span>
            </div>
          </div>

          {/* Secondary Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12">
            <Link
              href="/explore"
              className="text-white/80 hover:text-white font-bold transition-colors duration-300 underline underline-offset-4"
            >
              Browse Full Roster
            </Link>
            <span className="text-white/30">•</span>
            <Link
              href="/play"
              className="text-white/80 hover:text-white font-bold transition-colors duration-300 underline underline-offset-4"
            >
              Try Demo Games
            </Link>
            <span className="text-white/30">•</span>
            <Link
              href="/plaza"
              className="text-white/80 hover:text-white font-bold transition-colors duration-300 underline underline-offset-4"
            >
              Join the Plaza
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
