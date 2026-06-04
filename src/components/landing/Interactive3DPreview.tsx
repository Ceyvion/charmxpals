"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, type CSSProperties } from 'react';
import { trackEvent } from '@/lib/analyticsClient';

const features = [
  {
    title: 'Playable identity layer',
    desc: 'Rarity, realm, stats, and ownership cues travel with each Pal across the app.',
    metric: 'Profile',
  },
  {
    title: 'Arena-ready loadouts',
    desc: 'Players can move from roster browsing to runner, arena, or plaza surfaces fast.',
    metric: 'Modes',
  },
  {
    title: 'Verified claim loop',
    desc: 'Physical charms bind to digital profiles through one-shot codes and server checks.',
    metric: 'Claim',
  },
];

const consoleStats = [
  { label: 'Rhythm', value: 95, color: 'var(--cp-cyan)' },
  { label: 'Style', value: 93, color: 'var(--cp-yellow)' },
  { label: 'Flow', value: 86, color: 'var(--cp-green)' },
];

export default function Interactive3DPreview() {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const clampRotation = (value: number) => Math.min(12, Math.max(-12, value));

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setRotation({
      x: y * 12,
      y: x * -12,
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
    <section className="relative py-20 md:py-32 overflow-hidden cp-section-dark cp-grid-field">
      <div className="cp-container max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-center">
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="cp-kicker">Live Profile</span>
              </div>
              <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
                <span className="text-[var(--cp-white)]">A collectible with</span>
                <br />
                <span className="cp-gradient-text">game-account depth.</span>
              </h2>
              <p className="text-xl text-[var(--cp-gray-400)] leading-relaxed max-w-xl">
                Each Pal resolves into a persistent player profile: art, stats, claim state, and shortcuts into the modes that make the charm worth scanning again.
              </p>
            </div>

            <div className="space-y-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="cp-signal-row"
                >
                  <div className="cp-signal-metric">{feature.metric}</div>
                  <div>
                    <h4 className="font-semibold text-[var(--cp-white)] mb-1">{feature.title}</h4>
                    <p className="text-sm text-[var(--cp-gray-400)] leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/arena"
                className="cp-cta-primary font-display text-sm"
                onClick={() => trackEvent('home_cta_click', { target: 'arena', source: 'live_profile' })}
              >
                Enter Arena
              </Link>
              <Link
                href="/explore"
                className="cp-cta-ghost font-display text-sm"
                onClick={() => trackEvent('home_cta_click', { target: 'explore', source: 'live_profile' })}
              >
                Browse Roster
              </Link>
            </div>
          </div>

          <div className="relative max-w-xl mx-auto w-full">
            <div
              ref={cardRef}
              className="relative cp-live-console"
              style={{ perspective: '1000px' }}
              tabIndex={0}
              aria-label="Interactive Pal profile preview. Use pointer or arrow keys to tilt the card."
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
                className="cp-live-console-frame"
                style={{
                  transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) ${isHovering ? 'scale(1.015)' : 'scale(1)'}`,
                } as CSSProperties}
              >
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.34)_38%,rgba(0,0,0,0.92))]" />
                  <div className="cp-live-console-scanline" />
                </div>

                <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <span className="cp-chip text-[10px]">Wave 01</span>
                      <div className="inline-flex items-center gap-2 rounded-[var(--cp-radius-sm)] border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
                        <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-green)]" />
                        Verified
                      </div>
                    </div>
                    <div className="rounded-[var(--cp-radius-md)] border border-white/15 bg-black/45 px-4 py-3 text-right backdrop-blur-sm">
                      <div className="font-display text-3xl font-black text-[var(--cp-white)]">6.7</div>
                      <div className="text-[0.58rem] font-bold uppercase tracking-[0.28em] text-white/45">Rating</div>
                    </div>
                  </div>

                  <div className="relative my-5 min-h-[12rem] flex-1 overflow-hidden rounded-[var(--cp-radius-lg)] border border-white/15 bg-black/45">
                    <Image
                      src="/assets/characters/neon-city/portrait.webp"
                      alt="Vexa Volt character art"
                      fill
                      sizes="(min-width: 1024px) 480px, 100vw"
                      className="object-cover opacity-95"
                      style={{ objectPosition: 'center 38%' }}
                      priority
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(0,0,0,0.28))]" />
                  </div>

                  <div className="rounded-[var(--cp-radius-lg)] border border-white/15 bg-black/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--cp-cyan)]">Neon City</div>
                        <h3 className="mt-1 font-display text-4xl font-black leading-none text-[var(--cp-white)]">Vexa Volt</h3>
                        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/58">
                          Street Dance Champion with claim-ready stats and a direct path into competitive modes.
                        </p>
                      </div>
                      <Link
                        href="/character/neon-city"
                        className="cp-card-button cp-card-button-primary shrink-0"
                        onClick={() => trackEvent('home_cta_click', { target: 'character', source: 'live_profile_card' })}
                      >
                        Open Profile
                      </Link>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {consoleStats.map((stat) => (
                        <div key={stat.label} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                          <span className="font-semibold text-white/65">{stat.label}</span>
                          <span className="h-2 overflow-hidden rounded-[var(--cp-radius-sm)] bg-white/12">
                            <span
                              className="block h-full rounded-[var(--cp-radius-sm)]"
                              style={{ width: `${stat.value}%`, background: stat.color }}
                            />
                          </span>
                          <span className="text-right font-display text-lg font-black text-white">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-[var(--cp-gray-500)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-cyan)]" />
                Pointer tilt
              </span>
              <span className="text-[var(--cp-gray-700)]">/</span>
              <span>Keyboard accessible</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
