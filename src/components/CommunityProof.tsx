"use client";

import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: '2.4K+', label: 'Pals Claimed', icon: '⚡' },
  { value: '850+', label: 'Active Players', icon: '🎮' },
  { value: '12K+', label: 'Games Played', icon: '🏆' },
  { value: '99.8%', label: 'Uptime', icon: '✨' },
];

const testimonials = [
  {
    quote: "Got my legendary in Wave 1. The Plaza is insane—feels like a real hangout spot.",
    author: "Alex M.",
    role: "Beta Tester",
    avatar: "AM",
  },
  {
    quote: "My 8-year-old can't stop playing Time Trial. Physical toy + instant game = genius.",
    author: "Jordan K.",
    role: "Parent & Collector",
    avatar: "JK",
  },
  {
    quote: "The QR scan is literally 3 seconds. No app store, no wallet connect drama. Just works.",
    author: "Sam T.",
    role: "Early Adopter",
    avatar: "ST",
  },
];

export default function CommunityProof() {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="cp-container max-w-7xl relative z-10">
      <div className="text-center mb-16 md:mb-24">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="cp-kicker">Community</span>
        </div>
        <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight">
          <span className="text-white">Join the</span>
          <br />
          <span className="cp-gradient-text">CharmXPals Movement</span>
        </h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16 md:mb-24">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`cp-card p-6 md:p-8 text-center transition-all duration-700 hover:scale-105 ${
              inView
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <div className="text-4xl mb-3">{stat.icon}</div>
            <div className="font-display font-black text-4xl md:text-5xl cp-gradient-text mb-2">
              {stat.value}
            </div>
            <div className="text-sm md:text-base cp-muted font-semibold">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Testimonials */}
      <div
        className={`transition-all duration-1000 ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
        style={{ transitionDelay: '400ms' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.author}
              className="cp-card p-6 md:p-8 hover:scale-105 transition-all duration-300"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Quote Icon */}
              <div className="text-pink-500 mb-4">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              {/* Quote */}
              <p className="text-white text-base md:text-lg leading-relaxed mb-6">
                &ldquo;{testimonial.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-white font-bold">{testimonial.author}</div>
                  <div className="text-sm cp-muted">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Proof Banner */}
      <div
        className={`mt-16 md:mt-24 transition-all duration-1000 ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transitionDelay: '800ms' }}
      >
        <div className="cp-panel p-8 md:p-12 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white font-bold text-lg">Live Beta Active</span>
            </div>
            <span className="hidden md:inline text-white/20">|</span>
            <div className="text-white/80 font-semibold">
              Wave 2 Opening Soon
            </div>
            <span className="hidden md:inline text-white/20">|</span>
            <div className="text-white/80 font-semibold">
              Limited Supply
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
