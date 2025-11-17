"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { worldTagline } from '@/data/characterLore';

export default function UltraHero() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const float1Ref = useRef<HTMLDivElement>(null);
  const float2Ref = useRef<HTMLDivElement>(null);
  const float3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Parallax effect
  useEffect(() => {
    if (!mounted) return;

    if (float1Ref.current) {
      float1Ref.current.style.transform = `translate3d(${mousePos.x * 20}px, ${mousePos.y * 20}px, 0) rotate(${mousePos.x * 5}deg)`;
    }
    if (float2Ref.current) {
      float2Ref.current.style.transform = `translate3d(${mousePos.x * -30}px, ${mousePos.y * 30}px, 0) rotate(${mousePos.x * -8}deg)`;
    }
    if (float3Ref.current) {
      float3Ref.current.style.transform = `translate3d(${mousePos.x * 15}px, ${mousePos.y * -25}px, 0) rotate(${mousePos.x * 3}deg)`;
    }
  }, [mousePos, mounted]);

  return (
    <div ref={heroRef} className="relative min-h-[100vh] flex items-center overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-pink-600/20 via-purple-900/30 to-cyan-600/20 animate-gradient-shift" />
      <div className="absolute inset-0 bg-grid-overlay opacity-10" />

      {/* Floating 3D Elements */}
      <div ref={float1Ref} className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-pink-500/30 to-transparent rounded-full blur-3xl transition-transform duration-700 ease-out" />
      <div ref={float2Ref} className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/30 to-transparent rounded-full blur-3xl transition-transform duration-700 ease-out" />
      <div ref={float3Ref} className="absolute top-1/2 right-1/3 w-48 h-48 bg-gradient-to-br from-purple-500/30 to-transparent rounded-full blur-2xl transition-transform duration-700 ease-out" />

      {/* Morphing Shapes */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" style={{ mixBlendMode: 'screen' }}>
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#ff7ce3', stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: '#52e1ff', stopOpacity: 0.8 }} />
          </linearGradient>
        </defs>
        <circle cx="20%" cy="30%" r="150" fill="url(#grad1)" opacity="0.3">
          <animate attributeName="r" values="150;180;150" dur="8s" repeatCount="indefinite" />
          <animate attributeName="cx" values="20%;25%;20%" dur="10s" repeatCount="indefinite" />
        </circle>
        <circle cx="80%" cy="70%" r="120" fill="url(#grad1)" opacity="0.25">
          <animate attributeName="r" values="120;150;120" dur="7s" repeatCount="indefinite" />
          <animate attributeName="cy" values="70%;65%;70%" dur="9s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* Content Container */}
      <div className="relative z-10 w-full px-4 py-20">
        <div className="cp-container max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text Content */}
            <div className="space-y-8">
              {/* Animated Badge */}
              <div
                className={`inline-flex items-center gap-3 transition-all duration-1000 ${
                  mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                }`}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-green-400 rounded-full blur-md animate-pulse" />
                  <div className="relative w-3 h-3 bg-green-400 rounded-full" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest text-white/90">
                  Beta Wave 1 Live Now
                </span>
              </div>

              {/* Massive Headline with 3D Effect */}
              <div
                className={`transition-all duration-1200 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: '200ms' }}
              >
                <h1 className="font-display font-black leading-[0.85] tracking-tighter text-7xl sm:text-8xl lg:text-9xl mb-6"
                    style={{
                      textShadow: '4px 4px 0px rgba(0,0,0,0.3), 8px 8px 20px rgba(255,124,227,0.3)',
                      perspective: '1000px',
                    }}>
                  <span className="block text-white transform-gpu"
                        style={{
                          transform: `rotateX(${mousePos.y * 2}deg) rotateY(${mousePos.x * 2}deg)`,
                          transition: 'transform 0.3s ease-out',
                        }}>
                    Scan.
                  </span>
                  <span className="block cp-gradient-text mt-2 transform-gpu"
                        style={{
                          transform: `rotateX(${mousePos.y * -2}deg) rotateY(${mousePos.x * -2}deg)`,
                          transition: 'transform 0.3s ease-out',
                        }}>
                    Boot.
                  </span>
                  <span className="block text-white mt-2 transform-gpu"
                        style={{
                          transform: `rotateX(${mousePos.y * 1.5}deg) rotateY(${mousePos.x * 1.5}deg)`,
                          transition: 'transform 0.3s ease-out',
                        }}>
                    Own.
                  </span>
                </h1>
              </div>

              {/* Subheadline */}
              <div
                className={`transition-all duration-1000 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: '400ms' }}
              >
                <p className="text-2xl md:text-3xl font-bold text-white/90 leading-tight mb-4">
                  Physical collectibles.<br />Digital superpowers.
                </p>
                <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-xl">
                  {worldTagline} Flash your CharmXPal and watch it materialize in &lt;5 seconds. No apps, no wallets, no friction.
                </p>
              </div>

              {/* CTA Buttons with Magnetic Effect */}
              <div
                className={`flex flex-col sm:flex-row gap-4 transition-all duration-1000 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: '600ms' }}
              >
                <Link
                  href="/claim"
                  className="group relative inline-flex items-center justify-center px-10 py-5 overflow-hidden rounded-2xl font-black text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative text-white font-display tracking-wide flex items-center gap-2">
                    Claim Your Pal
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>

                <Link
                  href="/play"
                  className="group inline-flex items-center justify-center px-10 py-5 rounded-2xl border-2 border-white/30 backdrop-blur-xl bg-white/5 hover:bg-white/10 hover:border-white/50 transition-all duration-300 font-black text-xl"
                >
                  <span className="text-white font-display tracking-wide flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Play Demo
                  </span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div
                className={`flex flex-wrap gap-6 pt-4 transition-all duration-1000 ${
                  mounted ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transitionDelay: '800ms' }}
              >
                <div className="flex items-center gap-2 text-white/70 font-bold">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span>Boot &lt;5s</span>
                </div>
                <div className="text-white/40">•</div>
                <div className="text-white/70 font-bold">No App</div>
                <div className="text-white/40">•</div>
                <div className="text-white/70 font-bold">One-Shot Codes</div>
              </div>
            </div>

            {/* Right Side - 3D Visual Element */}
            <div
              className={`relative transition-all duration-1200 ${
                mounted ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-90 rotate-12'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                {/* Rotating Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-pink-500/30 animate-spin-slow" />
                <div className="absolute inset-8 rounded-full border-2 border-cyan-500/30 animate-spin-slower" style={{ animationDirection: 'reverse' }} />

                {/* Center Card Mock */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="relative w-full h-full rounded-3xl overflow-hidden transform transition-transform duration-500 hover:scale-105"
                       style={{
                         transform: `perspective(1000px) rotateY(${mousePos.x * 10}deg) rotateX(${mousePos.y * -10}deg)`,
                       }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 opacity-80" />
                    <div className="absolute inset-0 bg-grid-overlay opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white font-display font-black text-6xl">CXP</div>
                    </div>
                    {/* Animated Sheen */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent animate-sheen" />
                  </div>
                </div>

                {/* Floating Icons */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center animate-float shadow-lg">
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center animate-float-delayed shadow-lg">
                  <span className="text-2xl">🎮</span>
                </div>
                <div className="absolute top-1/2 -right-8 w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center animate-float shadow-lg"
                     style={{ animationDelay: '0.5s' }}>
                  <span className="text-2xl">✨</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
