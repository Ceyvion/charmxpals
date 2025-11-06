"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import BetaWelcome from '@/components/BetaWelcome';
import BetaChecklist from '@/components/BetaChecklist';
import Cosmetics from '@/app/character/[id]/Cosmetics';
import { betaChecklistTasks } from '@/data/betaChecklist';

const CharacterViewer3D = dynamic(() => import('@/components/CharacterViewer3D'), { ssr: false });

type CharacterDisplay = {
  id: string;
  name: string;
  title?: string | null;
  tagline?: string | null;
  stats: Record<string, number>;
  modelUrl: string | null;
  ownedAtIso: string | null;
};

type MeDashboardProps = {
  userId: string;
  userDisplayName: string;
  ownedCount: number;
  characters: CharacterDisplay[];
  lastClaimAtIso: string | null;
  newestPalName: string | null;
  initialChecklistProgress: ChecklistSnapshot;
};

type QuickAction = {
  id: string;
  label: string;
  href: string;
  tagline: string;
  external?: boolean;
};

type PalStory = {
  headline: string;
  summary: string;
  beats: Array<{
    id: string;
    label: string;
    detail: string;
    href?: string;
    external?: boolean;
  }>;
};

export default function MeDashboard({
  userId,
  userDisplayName,
  ownedCount,
  characters,
  lastClaimAtIso,
  newestPalName,
  initialChecklistProgress,
}: MeDashboardProps) {
  const [checklistSnapshot, setChecklistSnapshot] = useState<ChecklistSnapshot>(initialChecklistProgress);

  useEffect(() => {
    setChecklistSnapshot(initialChecklistProgress);
  }, [initialChecklistProgress]);

  const completedMissions = useMemo(() => {
    return betaChecklistTasks.reduce((count, task) => (checklistSnapshot.progress[task.id] ? count + 1 : count), 0);
  }, [checklistSnapshot]);

  const checklistPercent = useMemo(() => {
    if (betaChecklistTasks.length === 0) return 0;
    return (completedMissions / betaChecklistTasks.length) * 100;
  }, [completedMissions]);

  const quickActions = useMemo<QuickAction[]>(() => {
    return [
      {
        id: 'claim',
        label: 'Claim a Pal',
        href: '/claim',
        tagline: 'Scan or enter a fresh code.',
      },
      {
        id: 'play',
        label: 'Play Mini-Game',
        href: '/play',
        tagline: 'Chase today’s high score.',
      },
      {
        id: 'plaza',
        label: 'Enter Plaza',
        href: '/plaza',
        tagline: 'Link up in the social hub.',
      },
      {
        id: 'compare',
        label: 'Compare Crew',
        href: '/compare',
        tagline: 'Stack stats head-to-head.',
      },
      {
        id: 'feedback',
        label: 'Drop Feedback',
        href: 'mailto:charmxpals.contact@gmail.com',
        tagline: 'Share discoveries in beta.',
        external: true,
      },
    ];
  }, []);

  const todaysStory = useMemo<PalStory>(() => {
    return createPalStory({
      ownedCount,
      newestPalName,
      lastClaimAtIso,
      checklistPercent,
      characters,
    });
  }, [ownedCount, newestPalName, lastClaimAtIso, checklistPercent, characters]);

  const handleChecklistUpdate = useCallback((snapshot: ChecklistSnapshot) => {
    setChecklistSnapshot(snapshot);
  }, []);

  return (
    <>
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#110628] via-[#0b031b] to-[#050012] px-6 py-8 shadow-[0_40px_120px_rgba(32,10,70,0.45)] sm:px-8 sm:py-10">
        <AmbientBackdrop />
        <div className="relative z-10 space-y-8">
          <header className="space-y-3 md:flex md:items-end md:justify-between md:space-y-0">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/60">My Pal Home</p>
              <h1 className="font-display text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Welcome back, {userDisplayName}.
              </h1>
              <p className="max-w-xl text-sm text-white/70 md:text-base">
                Today&apos;s stage adapts to what your pals have been up to. Tap an action or jump into the latest beat.
              </p>
            </div>
          </header>

          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => {
              const actionBody = (
                <span className="flex flex-col gap-1 text-left">
                  <span className="text-sm font-semibold text-white">{action.label}</span>
                  <span className="text-xs text-white/70">{action.tagline}</span>
                </span>
              );

              return action.external ? (
                <a
                  key={action.id}
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex min-w-[12rem] flex-1 basis-[12rem] items-center justify-between rounded-2xl border border-white/15 bg-white/6 px-4 py-4 transition hover:border-white/35 hover:bg-white/12"
                >
                  {actionBody}
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">↗</span>
                </a>
              ) : (
                <Link
                  key={action.id}
                  href={action.href}
                  className="group inline-flex min-w-[12rem] flex-1 basis-[12rem] items-center justify-between rounded-2xl border border-white/15 bg-white/6 px-4 py-4 transition hover:border-white/35 hover:bg-white/12"
                >
                  {actionBody}
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">⇢</span>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 rounded-2xl border border-white/12 bg-white/6 px-5 py-6 backdrop-blur-[32px]">
              <div className="text-[11px] uppercase tracking-[0.28em] text-white/55">What&apos;s new with your pals</div>
              <h2 className="mt-2 font-display text-2xl font-semibold text-white md:text-3xl">{todaysStory.headline}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-base">{todaysStory.summary}</p>
            </div>
            <div className="space-y-3">
              {todaysStory.beats.map((beat) => {
                const beatBody = (
                  <>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-white/55">{beat.label}</div>
                    <p className="mt-2 text-sm text-white/75">{beat.detail}</p>
                  </>
                );

                if (!beat.href) {
                  return (
                    <div key={beat.id} className="rounded-2xl border border-white/12 bg-white/6 px-5 py-5">
                      {beatBody}
                    </div>
                  );
                }

                return beat.external ? (
                  <a
                    key={beat.id}
                    href={beat.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-white/12 bg-white/6 px-5 py-5 transition hover:border-white/30 hover:bg-white/12"
                  >
                    {beatBody}
                    <span className="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                      Open ↗
                    </span>
                  </a>
                ) : (
                  <Link
                    key={beat.id}
                    href={beat.href}
                    className="block rounded-2xl border border-white/12 bg-white/6 px-5 py-5 transition hover:border-white/30 hover:bg-white/12"
                  >
                    {beatBody}
                    <span className="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                      Jump ⇢
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-10 mb-10">
        <BetaWelcome
          userName={userDisplayName}
          ownedCount={ownedCount}
          lastClaimAtIso={lastClaimAtIso}
          newestPalName={newestPalName}
          checklistProgressPercent={checklistPercent}
        />
        <div id="beta-checklist">
          <BetaChecklist
            userId={userId}
            initialProgress={checklistSnapshot}
            onProgressUpdate={handleChecklistUpdate}
          />
        </div>
      </div>

      {characters.length > 0 ? (
        <div className="space-y-8">
          {characters.map((c) => {
            const statsEntries = Object.entries(c.stats ?? {});
            return (
              <div key={c.id} className="cp-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white font-display">{c.name}</h2>
                    {c.title && <div className="text-white/75 text-sm font-medium">{c.title}</div>}
                    {c.tagline && <div className="text-white/60 text-sm">{c.tagline}</div>}
                  </div>
                  <div className="flex gap-2">
                    <span className="cp-chip">Owned</span>
                    <Link href={`/character/${c.id}`} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold">Open</Link>
                  </div>
                </div>
                <div className="grid lg:grid-cols-5 gap-6 items-start">
                  <div className="lg:col-span-3">
                    {c.modelUrl ? (
                      <CharacterViewer3D modelUrl={c.modelUrl} height={320} />
                    ) : (
                      <div className="flex h-80 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/60">
                        Model preview coming soon.
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white font-display mb-3">Stats</h3>
                      {statsEntries.length > 0 ? (
                        <div className="space-y-3">
                          {statsEntries.map(([key, value]) => {
                            const v = Math.max(0, Math.min(100, Number(value)));
                            return (
                              <div key={key}>
                                <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                                  <span className="capitalize">{key}</span>
                                  <span className="font-semibold text-white">{v}</span>
                                </div>
                                <div className="cp-bar">
                                  <div className="cp-bar-fill" style={{ width: `${v}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-white/60">Stats coming soon for this pal.</div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white font-display mb-3">Outfits</h3>
                      <Cosmetics characterId={c.id} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cp-panel p-8 text-center">
          <p className="cp-muted">No pals yet. Claim a code to add your first one.</p>
          <div className="mt-4">
            <Link href="/claim" className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold">Claim a Pal</Link>
          </div>
        </div>
      )}
    </>
  );
}

function AmbientBackdrop() {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -top-40 left-[-15%] h-[460px] w-[460px] rounded-full bg-gradient-to-br from-rose-500/30 via-purple-500/20 to-sky-400/20 blur-3xl"
        animate={{ rotate: 360 }}
        transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-52 right-[-10%] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-sky-400/25 via-fuchsia-400/15 to-amber-300/10 blur-3xl"
        animate={{ rotate: -360 }}
        transition={{ duration: 56, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="pointer-events-none absolute inset-x-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-white/10 via-fuchsia-200/10 to-transparent blur-3xl"
        animate={{ scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: [0.6, 0.05, 0.01, 0.99] }}
      />
    </>
  );
}

type ChecklistSnapshot = {
  progress: Record<string, boolean>;
  updatedAtIso: string | null;
};

type CreatePalStoryInput = {
  ownedCount: number;
  newestPalName: string | null;
  lastClaimAtIso: string | null;
  checklistPercent: number;
  characters: CharacterDisplay[];
};

function createPalStory({
  ownedCount,
  newestPalName,
  lastClaimAtIso,
  checklistPercent,
  characters,
}: CreatePalStoryInput): PalStory {
  if (ownedCount === 0) {
    return {
      headline: 'Stage is ready when you are',
      summary: 'Redeem your first physical pal to light up the dashboard with stats, cosmetics, and daily beats tailored to you.',
      beats: [
        {
          id: 'claim',
          label: 'Next step',
          detail: 'Scan or enter a code to claim your first pal and unlock the viewer.',
          href: '/claim',
        },
        {
          id: 'explore',
          label: 'Preview roster',
          detail: 'Scout Wave 1 on the Explore page to pick who you want to chase.',
          href: '/explore',
        },
        {
          id: 'tip',
          label: 'Pro tip',
          detail: 'Test the claim flow on mobile—note timing, haptics, and clarity as you go.',
        },
      ],
    };
  }

  const now = new Date();
  const newestPal = characters[0] ?? null;
  const lastClaimAt = parseIsoDate(lastClaimAtIso);
  const daysSinceClaim = lastClaimAt ? Math.floor((now.getTime() - lastClaimAt.getTime()) / MS_IN_DAY) : null;
  const timeAgo = lastClaimAt ? formatRelativeShort(lastClaimAt, now) : null;
  const checklistRounded = Math.round(checklistPercent);
  const palName = newestPal?.name ?? newestPalName ?? 'your crew';

  let headline = `${palName} is holding the spotlight`;
  let summary =
    'Spin the viewer, tweak an outfit, and capture any rough edges while the lights are on.';

  if (daysSinceClaim !== null && daysSinceClaim <= 2) {
    headline = `${palName} just landed on your stage`;
    summary = 'Give them a full spin in 3D, try on cosmetics, and note anything that breaks the arrival magic.';
  } else if (checklistRounded < 100 && checklistRounded >= 40) {
    headline = 'Beta missions are halfway there';
    summary = `You’re ${checklistRounded}% through the checklist. Knock out the next tasks to unlock bonus drops.`;
  } else if (ownedCount >= 3 && (daysSinceClaim ?? 0) > 2) {
    headline = 'Your crew is warming up';
    summary = 'Line up your pals head-to-head and track who’s leading the charge before the next wave hits.';
  } else if (checklistRounded < 40) {
    headline = 'Kick off your beta checklist';
    summary = 'Complete missions on the checklist so the team sees how the journey feels on day one.';
  }

  const beats: PalStory['beats'] = [
    {
      id: 'spotlight',
      label: 'Spotlight beat',
      detail: timeAgo
        ? `${palName} arrived ${timeAgo}. Equip a look or rename them while the energy is fresh.`
        : `Open ${palName} in the viewer and check their idle loops for any jitter.`,
      href: newestPal ? `/character/${newestPal.id}` : '/me',
    },
  ];

  if (checklistRounded < 100) {
    beats.push({
      id: 'missions',
      label: 'Mission cue',
      detail: `Checklist is ${checklistRounded}% complete. Tackle the next task so we can unblock the next drop.`,
      href: '#beta-checklist',
    });
  }

  if (ownedCount > 1) {
    beats.push({
      id: 'compare',
      label: 'Crew sync',
      detail: 'Run a quick compare to see which pal is tournament-ready and who needs more love.',
      href: '/compare',
    });
  } else if (!beats.find((beat) => beat.id === 'compare')) {
    beats.push({
      id: 'play',
      label: 'Keep momentum',
      detail: 'Jump into the runner and feel out how your pal handles boosts today.',
      href: '/play',
    });
  }

  if (daysSinceClaim !== null && daysSinceClaim >= 7) {
    const freshBeat = {
      id: 'fresh-claim',
      label: 'Fresh energy',
      detail: 'It’s been a while since your last code. Try redeeming a new pal to keep the stage lively.',
      href: '/claim',
    } satisfies PalStory['beats'][number];
    beats.splice(Math.min(1, beats.length), 0, freshBeat);
  }

  return {
    headline,
    summary,
    beats: beats.slice(0, 3),
  };
}

function parseIsoDate(iso: string | null): Date | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeShort(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs <= 0) return 'just now';

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

const MS_IN_DAY = 1000 * 60 * 60 * 24;
