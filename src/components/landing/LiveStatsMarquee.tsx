"use client";

const stats = [
  { value: '2.4K', label: 'Pals claimed' },
  { value: '850+', label: 'Active players' },
  { value: '12K+', label: 'Games played' },
  { value: '99.8%', label: 'Uptime' },
];

export default function LiveStatsMarquee() {
  return (
    <section className="relative py-10 border-y border-white/10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,_rgba(125,231,255,0.12),_rgba(0,0,0,0)_55%),_radial-gradient(circle_at_80%_0%,_rgba(255,185,154,0.12),_rgba(0,0,0,0)_55%)]" />

      <div className="cp-container max-w-6xl relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="cp-stat-card">
              <div className="h-0.5 w-10 rounded-full bg-gradient-to-r from-cyan-300/70 to-amber-200/70 mb-3" />
              <div className="text-2xl md:text-3xl font-display font-black text-white">
                {stat.value}
              </div>
              <div className="text-[0.65rem] uppercase tracking-[0.28em] text-white/55 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
