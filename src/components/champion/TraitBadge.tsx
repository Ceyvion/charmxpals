'use client';

type Props = {
  label: string;
  value: string;
  icon: string;
  accentColor: string;
};

export default function TraitBadge({ label, value, icon, accentColor }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.05]">
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-40 blur-2xl transition-opacity duration-300 group-hover:opacity-60"
        style={{ backgroundColor: accentColor }}
      />

      <div className="relative flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
            {label}
          </span>
          <p className="mt-1 text-sm leading-relaxed text-white/75">{value}</p>
        </div>
      </div>
    </div>
  );
}
