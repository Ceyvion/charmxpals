'use client';

import { useMemo, type CSSProperties } from 'react';

import type { CrewFriend, CrewInvite } from './types';

type FriendsClientProps = {
  userLabel: string;
  isAuthenticated: boolean;
  friends: CrewFriend[];
  pendingInvites: CrewInvite[];
};

function StageBadge({ friend, style }: { friend: CrewFriend; style: CSSProperties }) {
  return (
    <div
      style={style}
      className="absolute flex flex-col items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-5 text-center shadow-[0_12px_40px_rgba(124,58,237,0.35)] backdrop-blur-md transition-transform hover:-translate-y-1"
    >
      <div
        className="h-14 w-14 rounded-full border border-white/40 bg-gradient-to-br from-white/40 to-white/10 shadow-inner"
        style={{ boxShadow: `0 0 25px ${friend.accent}33` }}
      />
      <div className="space-y-1">
        <div className="text-sm font-semibold text-white/90">{friend.name}</div>
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">{friend.dancerTitle}</div>
      </div>
      <div className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white/80">{friend.vibe}</div>
    </div>
  );
}

const orbitPositions: Array<CSSProperties> = [
  { top: '12%', left: '50%', transform: 'translate(-50%, -50%)' },
  { top: '52%', left: '18%', transform: 'translate(-50%, -50%)' },
  { top: '62%', left: '82%', transform: 'translate(-50%, -50%)' },
  { top: '82%', left: '44%', transform: 'translate(-50%, -50%)' },
];

export default function FriendsClient({ userLabel, isAuthenticated, friends, pendingInvites }: FriendsClientProps) {
  const hasFriends = friends.length > 0;
  const [spotlight, stageFriends] = useMemo(() => {
    return [friends[0] ?? null, friends.slice(0, orbitPositions.length)];
  }, [friends]);

  return (
    <div className="min-h-screen bg-grid-overlay px-4 py-12">
      <div className="cp-container space-y-8 sm:space-y-10 lg:space-y-12">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/25 via-purple-500/15 to-emerald-500/25 p-7 sm:p-9 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_55%)]" />
          <div className="relative grid gap-6 text-white lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">Charm Crew Deck</p>
              <div className="space-y-3">
                <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Friends &amp; Dance Partners</h1>
                <p className="text-base text-white/75 sm:leading-relaxed">
                  {isAuthenticated
                    ? `Hey ${userLabel.split(' ')[0] ?? userLabel}, your roster is ready to light up the MotionXChange Arena.`
                    : 'Sign in to light up your roster and watch your dancers take the stage.'}
                </p>
              </div>
              <p className="text-sm text-white/65 sm:max-w-lg">
                {isAuthenticated
                  ? 'Share boost links, sync routines, and keep your plaza status glowing.'
                  : 'Claim a pal and invite a friend to unlock boost links and shared routines.'}
              </p>
            </div>
            {spotlight ? (
              <article className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur-sm">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Spotlight</p>
                    <h2 className="mt-2 text-lg font-semibold">{spotlight.name}</h2>
                    <p className="text-sm text-white/70">{spotlight.dancerTitle}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-[6px] text-[11px] font-bold uppercase tracking-[0.24em] text-white/80">
                    {spotlight.energy}
                  </span>
                </header>
                <p className="text-sm text-white/70 sm:max-w-xs">{spotlight.status}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: spotlight.accent }} />
                    Sync Ready
                  </div>
                  <button className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100">
                    Send Hype
                  </button>
                </div>
              </article>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-sm text-white/70 lg:max-w-sm">
                {isAuthenticated
                  ? 'Invite a friend to claim their dancer and they will appear center stage.'
                  : 'Once you sign in and claim a pal, they will step into the spotlight.'}
              </div>
            )}
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/35 px-6 py-8 sm:px-8 sm:py-10 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(99,102,241,0.28),_transparent_65%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(147,197,253,0.08),rgba(244,114,182,0.06)_45%,rgba(167,139,250,0.09))]" />
          <div className="relative grid gap-8 text-white lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Crew Stage</p>
                  <h2 className="font-display text-3xl font-semibold sm:text-[34px]">Live Showcase</h2>
                  <p className="mt-3 max-w-xl text-sm text-white/70 sm:leading-relaxed">
                    The hologrid mirrors the energy of your circle. Routines pulse brighter as friends go live—keep the
                    momentum rolling with fresh invites.
                  </p>
                </div>
                {hasFriends && (
                  <div className="flex items-center gap-3">
                    <button className="inline-flex items-center justify-center rounded-full border border-white/25 bg-black/30 px-5 py-2 text-sm font-semibold text-white/85 transition hover:bg-black/40">
                      Invite Boost
                    </button>
                    <button className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 sm:self-end">
                      Start Crew Session
                    </button>
                  </div>
                )}
              </div>

              <div className="relative h-[18rem] sm:h-[22rem] lg:h-[24rem] rounded-[32px] border border-white/15 bg-gradient-to-br from-black/75 via-indigo-950/45 to-purple-950/50 shadow-[0_28px_100px_rgba(45,18,88,0.35)]">
                <div className="absolute inset-x-1/4 bottom-6 h-2 rounded-full bg-gradient-to-r from-violet-400/30 via-sky-400/35 to-fuchsia-400/30 blur-md" />
                <div className="absolute inset-x-[18%] bottom-16 h-20 rounded-full border border-white/10 bg-white/5 blur-lg" />

                {hasFriends ? (
                  <>
                    <div className="absolute inset-0">
                      {stageFriends.map((friend, idx) => (
                        <StageBadge key={friend.id} friend={friend} style={orbitPositions[idx] || {}} />
                      ))}
                    </div>
                    <div className="pointer-events-none absolute inset-0 rounded-[32px] border border-white/10" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white/70">
                    <div className="mb-6 h-20 w-20 rounded-full border border-dashed border-white/30" />
                    <p className="text-lg font-semibold text-white/80">The stage is set, but the crowd is quiet.</p>
                    <p className="mt-2 max-w-sm text-sm text-white/60">
                      Invite your first friend to light up the arena. We’ll spotlight their dancer right here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-xs uppercase tracking-[0.3em] text-white/60">Crew Pulse</h3>
                <p className="mt-2 text-sm text-white/70">
                  See who is fueling the flow, then jump in for co-op routines or quick duels.
                </p>
              </div>
              {friends.length ? (
                <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible lg:grid-cols-1">
                  {friends.map((friend) => (
                    <article
                      key={friend.id}
                      className="group relative min-w-[220px] snap-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="relative space-y-3 text-white">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold truncate">{friend.name}</p>
                          <span className="rounded-full bg-white/10 px-2 py-[2px] text-[10px] font-bold uppercase tracking-widest text-white/80">
                            {friend.energy}
                          </span>
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">{friend.dancerTitle}</p>
                        <p className="text-sm text-white/70 line-clamp-2">{friend.status}</p>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: friend.accent }} />
                          <span className="truncate">{friend.vibe}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button className="inline-flex min-w-[96px] flex-1 items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-900 transition hover:bg-gray-100">
                            Challenge
                          </button>
                          <button className="inline-flex min-w-[96px] flex-1 items-center justify-center rounded-full border border-white/30 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-white/50">
                            Crew Pass
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/65">
                  Add a friend to start tracking live energy. Once their dancer is active, they’ll pulse into this rail.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/6 p-7 text-white sm:p-8">
            <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.08),transparent_45%)]" />
            <div className="relative space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Invite Link</p>
                <h2 className="mt-2 font-display text-3xl font-semibold">Bring Your Crew</h2>
              </div>
              <p className="text-sm text-white/70">
                Each invitation claimed unlocks arena effects for both of you. Share your link, or drop a private
                invite to friends already training in the Plaza.
              </p>
              <div className="relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-6 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex-1 space-y-3">
                  <label htmlFor="invite-code" className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                    Your crew code
                  </label>
                  <input
                    id="invite-code"
                    value="CHARM-XPAL-FRIEND"
                    readOnly
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText('CHARM-XPAL-FRIEND')}
                  className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 sm:w-auto"
                >
                  Copy &amp; Share
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">Crew Boost</p>
                  <p className="mt-2 text-lg font-semibold text-white">x2</p>
                  <p className="text-[11px] text-white/60">Cosmetic unlock chance</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">Sync Bonus</p>
                  <p className="mt-2 text-lg font-semibold text-white">+14%</p>
                  <p className="text-[11px] text-white/60">Crew flow rating</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">Arena Queue</p>
                  <p className="mt-2 text-lg font-semibold text-white">Fast</p>
                  <p className="text-[11px] text-white/60">Priority slots</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/6 p-6 text-white sm:p-7">
              <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(244,114,182,0.18),transparent_55%)]" />
              <div className="relative space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Pending invites</p>
                  <h3 className="mt-2 font-display text-xl font-semibold">Awaiting Sync</h3>
                </div>
                <div className="space-y-4">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{invite.handle}</p>
                        <p className="text-xs text-white/60">{invite.sentAt}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-100">
                          Nudge
                        </button>
                        <button className="rounded-full border border-white/30 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:border-white/50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                  {!pendingInvites.length && (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-black/10 px-4 py-12 text-center text-sm text-white/60">
                      No invites out right now. Launch one to queue up your next duo.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/6 p-6 text-white sm:p-7">
              <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(56,189,248,0.18),transparent_55%)]" />
              <div className="relative space-y-3">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Crew Status</p>
                <h3 className="font-display text-xl font-semibold">Who’s Live</h3>
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div
                      key={`${friend.id}-status`}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3"
                    >
                      <span className="relative inline-flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ backgroundColor: friend.accent }} />
                        <span className="relative inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: friend.accent }} />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{friend.name}</p>
                        <p className="text-xs text-white/60">{friend.status}</p>
                      </div>
                      <button className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/80 hover:border-white/40">
                        Join
                      </button>
                    </div>
                  ))}
                  {!friends.length && (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-black/10 px-4 py-12 text-center text-sm text-white/60">
                      Claim a pal or add a friend to watch their status here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
