"use client";

const stats = [
  { icon: '⚡', label: '2.4K Pals Claimed', color: 'from-yellow-400 to-orange-500' },
  { icon: '🎮', label: '850+ Active Players', color: 'from-pink-400 to-rose-500' },
  { icon: '🏆', label: '12K+ Games Played', color: 'from-purple-400 to-indigo-500' },
  { icon: '✨', label: '99.8% Uptime', color: 'from-cyan-400 to-blue-500' },
  { icon: '🔥', label: 'Beta Wave 1 Live', color: 'from-red-400 to-pink-500' },
  { icon: '💎', label: 'Legendary Drops', color: 'from-emerald-400 to-green-500' },
];

export default function LiveStatsMarquee() {
  return (
    <div className="relative py-6 overflow-hidden border-y border-white/10 bg-gradient-to-r from-purple-950/50 via-pink-950/50 to-cyan-950/50">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-gradient-shift" />

      {/* Double Marquee for Seamless Loop */}
      <div className="flex items-center gap-8 animate-marquee">
        {[...stats, ...stats, ...stats].map((stat, index) => (
          <div
            key={index}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 whitespace-nowrap group hover:bg-white/10 transition-all duration-300 flex-shrink-0"
          >
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <span className="font-bold text-white text-sm">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
