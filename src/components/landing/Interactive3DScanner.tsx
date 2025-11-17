"use client";

import { useEffect, useRef, useState } from 'react';

export default function Interactive3DScanner() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScan = () => {
    setScanning(true);
    setProgress(0);
    setComplete(false);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          setComplete(true);
          setTimeout(() => setComplete(false), 3000);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/20 to-transparent" />

      <div className="cp-container max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="cp-kicker">How It Works</span>
          </div>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
            <span className="cp-gradient-text">Scan. Boot. Play.</span>
            <br />
            <span className="text-white">In &lt;5 Seconds.</span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Flash your CharmXPal's QR code and watch the magic happen. No apps to download, no accounts to create.
          </p>
        </div>

        {/* Interactive Demo */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Scanner Visualization */}
          <div ref={containerRef} className="relative">
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Phone Frame */}
              <div className="cp-card p-8 rounded-[3rem] h-full relative overflow-hidden">
                {/* Scanner Area */}
                <div className="relative w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                  {/* QR Code Mock */}
                  <div className={`relative w-48 h-48 transition-transform duration-500 ${scanning ? 'scale-95' : 'scale-100'}`}>
                    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-1 p-4 bg-white rounded-2xl">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-sm ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}
                        />
                      ))}
                    </div>

                    {/* Scanner Line */}
                    {scanning && (
                      <div className="absolute inset-0">
                        <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanner-line"
                             style={{ boxShadow: '0 0 20px rgba(34, 211, 238, 0.8)' }} />
                      </div>
                    )}

                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-cyan-400 rounded-tl-2xl animate-pulse" />
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-cyan-400 rounded-tr-2xl animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-cyan-400 rounded-bl-2xl animate-pulse" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-cyan-400 rounded-br-2xl animate-pulse" />
                  </div>

                  {/* Progress Ring */}
                  {scanning && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="rgba(34, 211, 238, 0.2)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#22d3ee" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}

                  {/* Success State */}
                  {complete && (
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center animate-pulse-ring">
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="text-white font-display font-black text-2xl">Claimed!</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Button */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                  <button
                    onClick={startScan}
                    disabled={scanning}
                    className={`px-8 py-3 rounded-full font-bold transition-all duration-300 ${
                      scanning
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50'
                    }`}
                  >
                    {scanning ? `Scanning... ${progress}%` : complete ? 'Success!' : 'Try Scanner'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Steps */}
          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Flash Your Charm',
                description: 'Point your camera at the QR code on your physical CharmXPal.',
                icon: '📱',
              },
              {
                step: '02',
                title: 'Instant Recognition',
                description: 'Our AI scans and verifies your unique code in milliseconds.',
                icon: '⚡',
              },
              {
                step: '03',
                title: 'Boot Complete',
                description: 'Your digital twin materializes with all stats, ready to battle.',
                icon: '✨',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex gap-6 items-start group"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl">{item.icon}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-black text-cyan-400">{item.step}</span>
                    <h3 className="font-display font-black text-2xl text-white">{item.title}</h3>
                  </div>
                  <p className="text-white/70 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
