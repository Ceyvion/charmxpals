"use client";

import { useMemo, useState, type CSSProperties } from 'react';

export default function Interactive3DScanner() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const qrPattern = useMemo(() => Array.from({ length: 64 }, () => Math.random() > 0.5), []);

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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent" />

      <div className="cp-container max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="cp-kicker">How It Works</span>
          </div>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
            <span className="cp-gradient-text">Scan. Boot. Play.</span>
            <br />
            <span className="text-white">In under 5 seconds.</span>
          </h2>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Flash your CharmXPal's code and watch the magic happen. No apps to download, no accounts to create.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="relative aspect-square max-w-lg mx-auto">
              <div className="cp-surface-neo p-8 rounded-[2.6rem]" style={{ '--surface-accent': 'rgba(120, 224, 255, 0.3)' } as CSSProperties}>
                <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_25%_20%,_rgba(125,231,255,0.12),_rgba(0,0,0,0)_60%),_linear-gradient(160deg,_rgba(8,12,24,0.95),_rgba(6,10,20,0.95))] flex items-center justify-center">
                  <div className={`relative w-48 h-48 transition-transform duration-500 ${scanning ? 'scale-95' : 'scale-100'}`}>
                    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-1 p-4 bg-white rounded-2xl">
                      {qrPattern.map((on, i) => (
                        <div key={i} className={on ? 'bg-slate-900' : 'bg-white'} />
                      ))}
                    </div>

                    {scanning && (
                      <div className="absolute inset-0">
                        <div
                          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent animate-scanner-line"
                          style={{ boxShadow: '0 0 18px rgba(34, 211, 238, 0.65)' }}
                        />
                      </div>
                    )}

                    <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-cyan-300/80 rounded-tl-2xl" />
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-cyan-300/80 rounded-tr-2xl" />
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-cyan-300/80 rounded-bl-2xl" />
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-cyan-300/80 rounded-br-2xl" />
                  </div>

                  {scanning && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(34, 211, 238, 0.15)" strokeWidth="2" />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#scanGradient)"
                        strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                      />
                      <defs>
                        <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#7DE7FF" />
                          <stop offset="100%" stopColor="#FFB59A" />
                        </linearGradient>
                      </defs>
                    </svg>
                  )}

                  {complete && (
                    <div className="absolute inset-0 bg-emerald-400/10 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-300 to-cyan-300 flex items-center justify-center">
                          <svg className="w-10 h-10 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="text-white font-display font-black text-2xl">Claimed</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                  <button
                    onClick={startScan}
                    disabled={scanning}
                    className={`px-7 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 ${
                      scanning
                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/15'
                    }`}
                  >
                    {scanning ? `Scanning... ${progress}%` : complete ? 'Success' : 'Try Scanner'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Flash Your Charm',
                description: 'Point your camera at the QR code on your physical CharmXPal.',
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a1 1 0 011 1v14a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v2h6V4" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'Instant Recognition',
                description: 'Our scanner verifies your unique code in milliseconds.',
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Boot Complete',
                description: 'Your digital twin materializes with stats ready to play.',
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start group">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-white/80 group-hover:scale-105 transition-transform duration-300">
                    {item.icon}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-semibold text-cyan-200/80 tracking-[0.3em]">{item.step}</span>
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
