import Link from 'next/link';

import { getBetaDashboardContent } from '@/lib/betaDashboard';

type BetaWelcomeProps = {
  userName?: string | null;
  ownedCount: number;
  lastClaimAtIso?: string | null;
  newestPalName?: string | null;
  checklistProgressPercent?: number | null;
};

const content = getBetaDashboardContent();

function isExternal(href: string) {
  return /^https?:\/\//i.test(href) || href.startsWith('mailto:');
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

export default function BetaWelcome({
  userName,
  ownedCount,
  lastClaimAtIso,
  newestPalName,
  checklistProgressPercent,
}: BetaWelcomeProps) {
  const displayName = userName ?? 'Tester';
  const patchVersion = content.patch.codename
    ? `${content.patch.version} — ${content.patch.codename}`
    : content.patch.version;
  const patchDate = formatAbsolute(content.patch.publishedAt);

  const rosterTitle =
    ownedCount > 0 ? `${ownedCount} ${ownedCount === 1 ? 'pal' : 'pals'} synced` : 'No pals yet';
  const rosterDescription =
    ownedCount > 0 ? 'Track stats, cosmetics, and loadouts from here.' : 'Claim a code to light up this space.';

  const lastSyncPrimary = lastClaimAtIso ? formatAbsolute(lastClaimAtIso, true) : '--';
  const lastSyncSecondary = lastClaimAtIso
    ? `Last claim ${formatRelative(lastClaimAtIso)}`
    : 'Redeem your first code to start tracking.';

  const newestPalPrimary = newestPalName ?? '--';
  const newestPalSecondary = newestPalName ? 'Jump in to tweak cosmetics or nameplates.' : 'Waiting for first claim.';

  const missions = content.highlights;
  const quickActions = content.resources;
  const patchSummary = truncate(content.patch.summary, 120);

  const statCards: Array<{
    id: string;
    label: string;
    primary: string;
    secondary?: string | null;
    meta?: string | null;
    href?: string;
    external?: boolean;
  }> = [
    {
      id: 'patch',
      label: 'Latest Patch',
      primary: patchVersion,
      secondary: patchSummary,
      meta: patchDate ? `Published ${patchDate}` : null,
      href: content.patch.href,
      external: true,
    },
    {
      id: 'roster',
      label: 'Roster',
      primary: rosterTitle,
      secondary: rosterDescription,
    },
    {
      id: 'sync',
      label: 'Last Sync',
      primary: lastSyncPrimary,
      secondary: lastSyncSecondary,
    },
    {
      id: 'newest',
      label: 'Newest Pal',
      primary: newestPalPrimary,
      secondary: newestPalSecondary,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#160732] via-[#12062a] to-[#050112] px-8 py-10 shadow-[0_34px_120px_rgba(60,10,120,0.35)] text-white">
      <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-gradient-to-br from-pink-500/35 to-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-16 h-60 w-60 rounded-full bg-gradient-to-br from-purple-500/30 to-amber-400/15 blur-3xl" />

      <div className="relative z-10 space-y-10">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
            {content.waveLabel}
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-extrabold leading-tight">
            Welcome back, {displayName}.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-fuchsia-200 to-sky-200">
              Let&apos;s break things.
            </span>
          </h2>
          <p className="max-w-2xl text-sm md:text-base text-white/75">
            {content.missionStatement}
          </p>
          {typeof checklistProgressPercent === 'number' ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/65">
              Beta progress: {Math.round(checklistProgressPercent)}%
            </div>
          ) : null}
        </header>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const body = (
              <div className="h-full rounded-2xl border border-white/12 bg-white/6 px-4 py-4 shadow-inner shadow-black/10 transition hover:border-white/25 hover:bg-white/10">
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/55">{card.label}</div>
                <div className="mt-1 text-lg font-semibold text-white">{card.primary}</div>
                {card.secondary ? (
                  <p className="mt-1 text-xs leading-relaxed text-white/70">{card.secondary}</p>
                ) : null}
                {card.meta ? (
                  <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-white/45">{card.meta}</p>
                ) : null}
                {card.href ? (
                  <span className="mt-3 inline-flex text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
                    {card.external ? 'Open ↗' : 'Details ⇢'}
                  </span>
                ) : null}
              </div>
            );

            if (!card.href) {
              return (
                <div key={card.id} className="h-full">
                  {body}
                </div>
              );
            }

            return card.external ? (
              <a
                key={card.id}
                href={card.href}
                target="_blank"
                rel="noreferrer"
                className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
              >
                {body}
              </a>
            ) : (
              <Link
                key={card.id}
                href={card.href}
                className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
              >
                {body}
              </Link>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/55">Core Missions</div>
              <div className="text-lg font-semibold text-white">Focus these first</div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {missions.map((mission) => {
              const card = (
                <div className="h-full rounded-2xl border border-white/12 bg-white/6 px-5 py-6 transition hover:border-white/30 hover:bg-white/12">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-white/55">{mission.label}</span>
                  {mission.tagline ? (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                      {mission.tagline}
                    </p>
                  ) : null}
                  <h3 className="mt-3 text-xl font-semibold text-white">{mission.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">{mission.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                    {mission.cta ?? (mission.external ? 'Open link ↗' : 'Jump in ⇢')}
                  </span>
                </div>
              );

              return isExternal(mission.href) ? (
                <a
                  key={mission.id}
                  href={mission.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
                >
                  {card}
                </a>
              ) : (
                <Link
                  key={mission.id}
                  href={mission.href}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
                >
                  {card}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/55">Quick Actions</div>
              <div className="mt-1 text-lg font-semibold text-white">Jump straight to tests</div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {quickActions.map((action) => {
              const actionExternal = action.external ?? isExternal(action.href);
              const body = (
                <div className="h-full rounded-xl border border-white/12 bg-white/6 px-5 py-5 transition hover:border-white/30 hover:bg-white/12">
                  <div className="text-sm font-semibold text-white">{action.title}</div>
                  <p className="mt-2 text-xs text-white/65 leading-relaxed">{action.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/75">
                    {actionExternal ? 'Open link ↗' : 'Go now ⇢'}
                  </span>
                </div>
              );
              return actionExternal ? (
                <a
                  key={action.id}
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
                >
                  {body}
                </a>
              ) : (
                <Link
                  key={action.id}
                  href={action.href}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
                >
                  {body}
                </Link>
              );
            })}
          </div>
        </div>

        <footer className="flex flex-col gap-2 text-xs text-white/65 md:flex-row md:items-center md:justify-between">
          <div>
            Bug reports: <a href="mailto:charmxpals.contact@gmail.com" className="text-white/85 hover:text-white">charmxpals.contact@gmail.com</a>
          </div>
          <div>
            Issues? <a href="mailto:charmxpals.contact@gmail.com" className="text-white/85 hover:text-white">charmxpals.contact@gmail.com</a>
          </div>
        </footer>
      </div>
    </section>
  );
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}
