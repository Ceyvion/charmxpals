"use client";

import { useState, useRef, useEffect } from 'react';

export default function Interactive3DPreview() {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setRotation({
      x: y * 20,
      y: x * -20,
    });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setIsHovering(false);
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-purple-950/20" />

      <div className="cp-container max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="cp-kicker">Experience</span>
              </div>
              <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
                <span className="text-white">See Your Pal</span>
                <br />
                <span className="cp-gradient-text">Come Alive</span>
              </h2>
              <p className="text-xl text-white/70 leading-relaxed max-w-xl">
                Every CharmXPal includes a 3D model you can view, rotate, and interact with. Watch them animate, emote, and show off their unique personality.
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              {[
                { icon: '🎭', title: 'Real-time 3D Models', desc: 'Rendered in your browser with WebGL' },
                { icon: '💫', title: 'Unique Animations', desc: 'Each Pal has signature moves and emotes' },
                { icon: '🎨', title: 'Customizable Skins', desc: 'Unlock and apply cosmetic upgrades' },
              ].map((feature, i) => (
                <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">{feature.title}</h4>
                    <p className="text-sm text-white/70">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Interactive 3D Card */}
          <div className="relative">
            <div
              ref={cardRef}
              className="relative preserve-3d"
              style={{
                perspective: '1000px',
              }}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="relative w-full aspect-square max-w-lg mx-auto rounded-3xl overflow-hidden transition-transform duration-300 ease-out"
                style={{
                  transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) ${isHovering ? 'scale(1.05)' : 'scale(1)'}`,
                }}
              >
                {/* Card Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500" />
                <div className="absolute inset-0 bg-grid-overlay opacity-20" />

                {/* 3D Character Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* Character Silhouette */}
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-8xl animate-float">✨</div>
                    </div>

                    {/* Orbiting Elements */}
                    <div className="absolute top-0 left-1/2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-spin-slow"
                         style={{ transformOrigin: '0 120px' }}>
                      <span className="text-lg">⚡</span>
                    </div>
                    <div className="absolute top-0 left-1/2 w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center animate-spin-slower"
                         style={{ transformOrigin: '0 140px', animationDelay: '0.5s' }}>
                      <span className="text-lg">💎</span>
                    </div>
                  </div>
                </div>

                {/* Depth Layers */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"
                  style={{
                    transform: `translate3d(${rotation.y * 0.5}px, ${rotation.x * 0.5}px, 0)`,
                  }}
                />

                {/* Light Effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent"
                  style={{
                    transform: `translate3d(${rotation.y}px, ${rotation.x}px, 0)`,
                    mixBlendMode: 'overlay',
                  }}
                />

                {/* Stats Overlay */}
                <div className="absolute bottom-8 left-8 right-8 bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: 'Power', value: '8.2' },
                      { label: 'Speed', value: '7.5' },
                      { label: 'Rarity', value: '9.1' },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <div className="font-display font-black text-2xl text-white mb-1">
                          {stat.value}
                        </div>
                        <div className="text-xs text-white/70 uppercase tracking-wider">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-50 blur-3xl -z-10 animate-pulse" />
            </div>

            {/* Interaction Hint */}
            <div className="text-center mt-8 opacity-60">
              <div className="inline-flex items-center gap-2 text-white text-sm font-bold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                <span>Drag to rotate</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
