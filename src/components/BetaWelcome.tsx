import Link from 'next/link';

import { getBetaDashboardContent } from '@/lib/betaDashboard';

type BetaWelcomeProps = {
  userName?: string | null;
  ownedCount: number;
  lastClaimAtIso?: string | null;
  newestPalName?: string | null;
  checklistProgressPercent?: number | null;
  checklistUpdatedAtIso?: string | null;
};

const content = getBetaDashboardContent();

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

function formatRelative(fromIso?: string | null) {
  if (!fromIso) return null;
  const date = new Date(fromIso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'just now';
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} wk${diffWeeks === 1 ? '' : 's'} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} mo${diffMonths === 1 ? '' : 's'} ago`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}+ yr${diffYears === 1 ? '' : 's'} ago`;
}

function formatAbsolute(fromIso?: string | null, withTime = false) {
  if (!fromIso) return null;
  const date = new Date(fromIso);
  if (Number.isNaN(date.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = withTime
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleString(undefined, options);
}

export default function BetaWelcome({
  userName,
  ownedCount,
  lastClaimAtIso,
  newestPalName,
  checklistProgressPercent,
  checklistUpdatedAtIso,
}: BetaWelcomeProps) {
  const firstName = userName?.split(/\s+/)[0] ?? 'Crew';
  const ownedPlural = ownedCount === 1 ? 'pal' : 'pals';
  const lastClaimRelative = formatRelative(lastClaimAtIso);
  const lastClaimAbsolute = formatAbsolute(lastClaimAtIso, true);
  const checklistUpdated = formatAbsolute(checklistUpdatedAtIso, true);
  const patchPublished = formatAbsolute(content.patch.publishedAt);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#160732] via-[#12062a] to-[#050112] px-8 py-10 shadow-[0_34px_120px_rgba(60,10,120,0.35)]">
      <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-pink-500/35 to-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-16 h-60 w-60 rounded-full bg-gradient-to-br from-purple-500/30 to-amber-400/15 blur-3xl" />
      <div className="relative z-10 space-y-10 text-white">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
              {content.waveLabel}
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-extrabold leading-tight">
              Welcome back, {firstName}. <br className="hidden sm:block" /> Ready to push the grid?
            </h2>
            <p className="text-sm md:text-base text-white/75">
              {content.missionStatement}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 font-semibold uppercase tracking-wide text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
                {content.velocityGoal}
              </span>
              <span>{content.weeklyFocus}</span>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/8 px-6 py-5 text-sm text-white/70 shadow-inner shadow-black/30 max-w-sm">
            <div className="uppercase tracking-[0.24em] text-[11px] font-semibold text-white/60">Latest patch</div>
            <div className="mt-3 space-y-2">
              <div className="text-lg font-semibold text-white">
                {content.patch.version}
                {content.patch.codename ? <span className="ml-2 text-white/60">— {content.patch.codename}</span> : null}
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{content.patch.summary}</p>
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                Published {patchPublished ?? 'recently'}
              </div>
            </div>
            {isExternal(content.patch.href) ? (
              <a
                href={content.patch.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Read notes ↗
              </a>
            ) : (
              <Link
                href={content.patch.href}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Read notes ⇢
              </Link>
            )}
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/8 px-5 py-5">
            <div className="text-xs uppercase tracking-[0.28em] text-white/45">Synced roster</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-display font-extrabold text-white">{ownedCount}</span>
              <span className="text-sm text-white/60 mb-1">{ownedPlural}</span>
            </div>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Claim new codes to unlock cosmetics and mini-game loadouts sooner.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/8 px-5 py-5">
            <div className="text-xs uppercase tracking-[0.28em] text-white/45">Last sync</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {lastClaimRelative ?? 'Not yet claimed'}
            </div>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              {lastClaimAbsolute ? `Finalized on ${lastClaimAbsolute}. Keep timing the flow and call out spikes.` : 'Redeem your first code to start the telemetry trail.'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/8 px-5 py-5">
            <div className="text-xs uppercase tracking-[0.28em] text-white/45">Newest pal</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {newestPalName ?? 'TBD'}
            </div>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Spin the 3D viewer, test cosmetics, and attach notes or clips for anything that feels off.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/50">Beta missions</div>
              <div className="mt-1 text-lg font-semibold text-white">Keep momentum high</div>
            </div>
            {typeof checklistProgressPercent === 'number' ? (
              <div className="text-right text-sm text-white/70">
                <div className="text-3xl font-display font-extrabold text-white">{Math.round(checklistProgressPercent)}%</div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                  {checklistUpdated ? `Updated ${checklistUpdated}` : 'Not synced yet'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/70">
                Progress saves per account once you tick off missions below.
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {content.focusAreas.map((focus) => (
              <div key={focus.id} className="rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white/75">
                <div className="font-semibold text-white">{focus.title}</div>
                <div className="mt-1 text-xs text-white/60 leading-relaxed">{focus.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {content.highlights.map((item) => {
            const card = (
              <div className="h-full rounded-2xl border border-white/12 bg-white/6 px-5 py-6 transition hover:border-white/30 hover:bg-white/12">
                <span className="text-[11px] uppercase tracking-[0.28em] text-white/50">{item.label}</span>
                <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                  {item.external ? 'Open link ↗' : 'Jump in ⇢'}
                </span>
              </div>
            );
            return item.external ? (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
              >
                {card}
              </a>
            ) : (
              <Link
                key={item.id}
                href={item.href}
                className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
              >
                {card}
              </Link>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-white/50">Resources</div>
              <div className="mt-1 text-lg font-semibold text-white">Where to drop notes & find context</div>
            </div>
            <div className="text-xs text-white/60">
              Need direct help? Email <a href="mailto:beta@charmxpals.com" className="text-white/85 hover:text-white">beta@charmxpals.com</a>.
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {content.resources.map((resource) => {
              const resourceExternal = resource.external ?? isExternal(resource.href);
              const body = (
                <div className="h-full rounded-xl border border-white/12 bg-white/6 px-5 py-5 transition hover:border-white/30 hover:bg-white/12">
                  <div className="text-sm font-semibold text-white">{resource.title}</div>
                  <p className="mt-2 text-xs text-white/65 leading-relaxed">{resource.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/75">
                    {resourceExternal ? 'Open link ↗' : 'View details ⇢'}
                  </span>
                </div>
              );
              return resourceExternal ? (
                <a
                  key={resource.id}
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
                >
                  {body}
                </a>
              ) : (
                <Link
                  key={resource.id}
                  href={resource.href}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
                >
                  {body}
                </Link>
              );
            })}
          </div>
        </div>

        <footer className="flex flex-col gap-3 text-xs text-white/65 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold uppercase tracking-[0.22em] text-white/70">
              Need backup?
            </span>
            <span>
              DM the beta Discord or loop us in at <a href="mailto:beta@charmxpals.com" className="text-white/85 hover:text-white">beta@charmxpals.com</a>.
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-semibold uppercase tracking-[0.22em] text-white/75">
            Squad pulse stays updated as we ship new waves.
          </div>
        </footer>
      </div>
    </section>
  );
}
