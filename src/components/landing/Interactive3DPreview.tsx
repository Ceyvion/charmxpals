"use client";

import { useState, useRef, type CSSProperties } from 'react';

const features = [
  {
    title: 'Real-time 3D Models',
    desc: 'Rendered instantly in your browser with WebGL.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10m0-10L4 7m8 4l8-4" />
      </svg>
    ),
  },
  {
    title: 'Signature Animations',
    desc: 'Each Pal has exclusive motion and emotes.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Cosmetic Upgrades',
    desc: 'Unlock skins, badges, and aura effects.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.252c1.2-1.102 2.8-1.754 4.5-1.754 3.037 0 5.5 2.462 5.5 5.5 0 5.25-5.5 9.75-10 12.002C7.5 19.748 2 15.248 2 10.998c0-3.038 2.463-5.5 5.5-5.5 1.7 0 3.3.652 4.5 1.754z" />
      </svg>
    ),
  },
];

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
      x: y * 14,
      y: x * -14,
    });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setIsHovering(false);
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />

      <div className="cp-container max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
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
                Every CharmXPal includes a real-time 3D model you can rotate, explore, and collect.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex gap-4 items-start p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl border border-white/10 bg-white/10 flex items-center justify-center text-white/80 flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">{feature.title}</h4>
                    <p className="text-sm text-white/70">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              ref={cardRef}
              className="relative preserve-3d"
              style={{ perspective: '1000px' }}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="relative w-full aspect-square max-w-lg mx-auto rounded-[2.2rem] overflow-hidden cp-surface-neo"
                style={{
                  '--surface-accent': 'rgba(120, 224, 255, 0.3)',
                  transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) ${isHovering ? 'scale(1.03)' : 'scale(1)'}`,
                  transition: 'transform 0.3s ease-out',
                } as CSSProperties}
              >
                <div className="absolute inset-0 bg-grid-overlay cp-grid-soft opacity-25" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-44 h-44 rounded-full border border-white/10 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.18),_rgba(0,0,0,0)_60%),_radial-gradient(circle_at_70%_70%,_rgba(125,231,255,0.18),_rgba(0,0,0,0)_65%)]" />
                    <div className="absolute inset-0 rounded-full border border-white/10" style={{ transform: 'scale(1.25)' }} />
                    <div className="absolute inset-0 rounded-full border border-white/5" style={{ transform: 'scale(1.45)' }} />
                  </div>
                </div>

                <div
                  className="absolute inset-0 bg-gradient-to-br from-white/18 via-transparent to-transparent"
                  style={{ transform: `translate3d(${rotation.y * 0.6}px, ${rotation.x * 0.6}px, 0)` }}
                />

                <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6">
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
                        <div className="text-[0.6rem] text-white/60 uppercase tracking-[0.28em]">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/25 via-white/5 to-amber-300/20 opacity-60 blur-3xl -z-10" />
            </div>

            <div className="text-center mt-8 opacity-60">
              <div className="inline-flex items-center gap-2 text-white text-sm font-semibold">
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
