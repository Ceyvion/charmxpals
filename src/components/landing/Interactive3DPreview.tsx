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

  const clampRotation = (value: number) => Math.min(14, Math.max(-14, value));

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setRotation({
      x: y * 14,
      y: x * -14,
    });
  };

  const handleInteractionEnd = () => {
    setRotation({ x: 0, y: 0 });
    setIsHovering(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 2;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;

    e.preventDefault();
    setIsHovering(true);

    if (e.key === 'Home') {
      setRotation({ x: 0, y: 0 });
      return;
    }

    setRotation((prev) => {
      if (e.key === 'ArrowUp') return { ...prev, x: clampRotation(prev.x - step) };
      if (e.key === 'ArrowDown') return { ...prev, x: clampRotation(prev.x + step) };
      if (e.key === 'ArrowLeft') return { ...prev, y: clampRotation(prev.y - step) };
      return { ...prev, y: clampRotation(prev.y + step) };
    });
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden cp-section-dark">
      <div className="cp-container max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="cp-kicker">Experience</span>
              </div>
              <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
                <span className="text-[var(--cp-white)]">See Your Pal</span>
                <br />
                <span className="cp-gradient-text">Come Alive</span>
              </h2>
              <p className="text-xl text-[var(--cp-gray-400)] leading-relaxed max-w-xl">
                Every CharmXPal includes a real-time 3D model you can rotate, explore, and collect.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex gap-4 items-start p-4 rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-gray-700)] bg-[var(--cp-gray-900)] hover:border-[var(--cp-cyan)] transition-colors"
                >
                  <div className="w-12 h-12 rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-gray-700)] bg-[var(--cp-gray-800)] flex items-center justify-center text-[var(--cp-gray-300)] flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--cp-white)] mb-1">{feature.title}</h4>
                    <p className="text-sm text-[var(--cp-gray-400)]">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative max-w-lg mx-auto">
            <div
              ref={cardRef}
              className="relative"
              style={{ perspective: '1000px' }}
              tabIndex={0}
              aria-label="Interactive 3D preview card. Hover, drag, or use arrow keys to rotate."
              onPointerDown={() => setIsHovering(true)}
              onPointerMove={handlePointerMove}
              onPointerEnter={() => setIsHovering(true)}
              onPointerLeave={handleInteractionEnd}
              onPointerUp={handleInteractionEnd}
              onPointerCancel={handleInteractionEnd}
              onFocus={() => setIsHovering(true)}
              onBlur={handleInteractionEnd}
              onKeyDown={handleKeyDown}
            >
              <div
                className="relative w-full aspect-[4/5] rounded-[var(--cp-radius-lg)] overflow-hidden border-2 border-[var(--cp-gray-700)] bg-[var(--cp-gray-900)]"
                style={{
                  transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) ${isHovering ? 'scale(1.02)' : 'scale(1)'}`,
                  transition: 'transform 0.3s ease-out',
                } as CSSProperties}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-32 h-32 md:w-40 md:h-40">
                    <div className="absolute inset-0 rounded-[var(--cp-radius-lg)] border-2 border-[var(--cp-gray-700)] bg-[var(--cp-gray-800)]" />
                    <div className="absolute -inset-4 rounded-[var(--cp-radius-lg)] border border-[var(--cp-gray-800)]" />
                    <div className="absolute -inset-8 rounded-[var(--cp-radius-lg)] border border-[var(--cp-gray-800)]/50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl md:text-4xl font-display font-black text-[var(--cp-gray-700)] tracking-[0.2em]">3D</span>
                    </div>
                  </div>
                </div>

                <div className="absolute top-6 left-6">
                  <span className="cp-chip text-[10px]">Preview</span>
                </div>

                <div className="absolute bottom-6 left-6 right-6 rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-gray-700)] bg-[var(--cp-black)]/80 backdrop-blur-sm p-5">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { label: 'Power', value: '8.2', color: 'var(--cp-red)' },
                      { label: 'Speed', value: '7.5', color: 'var(--cp-cyan)' },
                      { label: 'Rarity', value: '9.1', color: 'var(--cp-yellow)' },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <div className="font-display font-black text-2xl text-[var(--cp-white)] mb-1">
                          {stat.value}
                        </div>
                        <div className="text-[0.6rem] text-[var(--cp-gray-500)] uppercase tracking-[0.28em]">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <div className="inline-flex items-center gap-2 text-[var(--cp-gray-500)] text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                <span>Hover, drag, or use arrow keys</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
