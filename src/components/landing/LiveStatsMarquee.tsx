"use client";

const stats = [
  { value: '2.4K', label: 'Pals claimed', color: 'var(--cp-red)' },
  { value: '850+', label: 'Active players', color: 'var(--cp-cyan)' },
  { value: '12K+', label: 'Games played', color: 'var(--cp-yellow)' },
  { value: '99.8%', label: 'Uptime', color: 'var(--cp-green)' },
];

export default function LiveStatsMarquee() {
  return (
    <section className="relative py-12 md:py-16 border-y-2 border-[var(--cp-border)] overflow-hidden bg-[var(--cp-white)]">
      <div className="cp-container max-w-7xl relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="cp-stat-card text-center md:text-left">
              <div
                className="h-1 w-10 rounded-[var(--cp-radius-sm)] mb-4 mx-auto md:mx-0"
                style={{ background: stat.color }}
              />
              <div className="text-3xl md:text-4xl font-display font-black text-[var(--cp-text-primary)]">
                {stat.value}
              </div>
              <div className="text-[0.65rem] uppercase tracking-[0.28em] text-[var(--cp-text-muted)] mt-1.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
