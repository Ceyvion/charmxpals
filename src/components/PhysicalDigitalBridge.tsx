"use client";

import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    number: '01',
    title: 'Scan Your Charm',
    description: 'Flash the QR code on your physical CharmXPal. Instant recognition, zero friction.',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Boot Instantly',
    description: 'Your champion materializes in under 5 seconds. No downloads, no sign-ups, no waiting.',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Battle & Flex',
    description: 'Jump into mini-games, hit the Plaza, climb leaderboards. Your physical charm = your flex forever.',
    icon: (
      <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

export default function PhysicalDigitalBridge() {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="cp-container max-w-7xl">
      <div className="text-center mb-16 md:mb-24">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="cp-kicker">How It Works</span>
        </div>
        <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight">
          <span className="cp-gradient-text">Physical Meets Digital.</span>
          <br />
          <span className="text-white">In 5 Heartbeats.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className={`relative transition-all duration-1000 ${
              inView
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: `${index * 200}ms` }}
          >
            {/* Connection Line */}
            {index < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/4 left-full w-full h-0.5 -z-10">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/50 via-purple-500/50 to-cyan-500/50" />
                <div
                  className={`absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 origin-left transition-transform duration-1000 ${
                    inView ? 'scale-x-100' : 'scale-x-0'
                  }`}
                  style={{ transitionDelay: `${(index + 1) * 200}ms` }}
                />
              </div>
            )}

            <div className="cp-card p-8 hover:scale-105 transition-transform duration-300 h-full">
              {/* Icon Circle */}
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center p-5">
                  <div className="text-white/80">{step.icon}</div>
                </div>
                {/* Step Number */}
                <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center font-display font-black text-white text-lg">
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <h3 className="font-display font-black text-2xl md:text-3xl text-white mb-3">
                {step.title}
              </h3>
              <p className="cp-muted text-base leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Feature Callout */}
      <div
        className={`mt-16 md:mt-24 text-center transition-all duration-1000 ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transitionDelay: '800ms' }}
      >
        <div className="inline-flex flex-col sm:flex-row items-center gap-4 cp-panel px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-display font-black text-white text-lg">Anti-Fraud Protected</div>
              <div className="text-sm cp-muted">One-time codes. Blockchain-verified ownership.</div>
            </div>
          </div>
          <span className="hidden sm:block text-white/20">|</span>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-display font-black text-white text-lg">Always Yours</div>
              <div className="text-sm cp-muted">Digital twin lives forever, even if you trade the physical.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
