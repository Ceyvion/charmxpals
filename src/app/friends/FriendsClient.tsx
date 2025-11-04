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
      <div className="cp-container space-y-10">
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-emerald-500/30 p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_55%)]" />
          <div className="relative flex flex-col gap-6 text-white">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">Charm Crew Deck</p>
              <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Friends &amp; Dance Partners</h1>
              <p className="mt-4 max-w-2xl text-base text-white/70">
                {isAuthenticated
                  ? `Hey ${userLabel.split(' ')[0] ?? userLabel}, your roster is ready to light up the MotionXChange Arena.`
                  : 'Sign in to light up your roster and watch your dancers take the stage.'}
                {' '}
                The shared stage updates live as friends join the show.
              </p>
            </div>
            {spotlight ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Spotlight</p>
                  <div className="mt-2 text-lg font-semibold">{spotlight.name}</div>
                  <p className="text-sm text-white/70">{spotlight.status}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                    {spotlight.energy} Energy
                  </div>
                  <button className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100">
                    Send Hype
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
                {isAuthenticated
                  ? 'Invite a friend to claim their dancer and they will appear center stage.'
                  : 'Once you sign in and claim a pal, they will step into the spotlight.'}
              </div>
            )}
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 px-8 py-10 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(99,102,241,0.35),_transparent_65%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(147,197,253,0.1),rgba(244,114,182,0.08)_45%,rgba(167,139,250,0.12))]" />
          <div className="relative flex flex-col gap-8 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">Crew Stage</p>
                <h2 className="font-display text-3xl font-semibold">Live Showcase</h2>
                <p className="mt-3 max-w-xl text-sm text-white/70">
                  This hologrid mirrors the energy of your circle. Dancers with active routines pulse brighter—stack
                  the stage by recruiting more pals.
                </p>
              </div>
              <button className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/20">
                Start Crew Session
              </button>
            </div>

            <div className="relative h-[24rem] rounded-[40px] border border-white/20 bg-gradient-to-br from-black/70 via-indigo-950/40 to-purple-950/40 shadow-[0_40px_120px_rgba(45,18,88,0.4)]">
              <div className="absolute inset-x-1/4 bottom-6 h-2 rounded-full bg-gradient-to-r from-violet-400/30 via-sky-400/40 to-fuchsia-400/30 blur-lg" />
              <div className="absolute inset-x-[15%] bottom-16 h-24 rounded-full border border-white/10 bg-white/5 blur-xl" />

              {hasFriends ? (
                <>
                  <div className="absolute inset-0">
                    {stageFriends.map((friend, idx) => (
                      <StageBadge key={friend.id} friend={friend} style={orbitPositions[idx] || {}} />
                    ))}
                  </div>
                  <div className="absolute inset-0 animate-pulse rounded-[40px] border border-white/10" />
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white/70">
                  <div className="mb-6 h-24 w-24 rounded-full border border-dashed border-white/30" />
                  <p className="text-lg font-semibold text-white/80">The stage is set, but the crowd is quiet.</p>
                  <p className="mt-2 max-w-sm text-sm text-white/60">
                    Invite your first friend to light up the arena. We’ll spotlight their dancer right here.
                  </p>
                </div>
              )}
            </div>

            {hasFriends && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_70%)]" />
                    <div className="relative space-y-3 text-white">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{friend.name}</p>
                        <span className="rounded-full bg-white/10 px-2 py-[2px] text-[10px] font-bold uppercase tracking-widest text-white/80">
                          {friend.energy} Energy
                        </span>
                      </div>
                      <p className="text-xs uppercase tracking-[0.28em] text-white/60">{friend.dancerTitle}</p>
                      <p className="text-sm text-white/70">{friend.status}</p>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: friend.accent }} />
                        <span className="text-xs text-white/60">{friend.vibe}</span>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-900 transition hover:bg-gray-100">
                          Challenge
                        </button>
                        <button className="flex-1 rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:border-white/50">
                          Send Crew Pass
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-white">
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
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
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
                        <button className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-100">
                          Nudge
                        </button>
                        <button className="rounded-lg border border-white/30 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:border-white/50">
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

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
              <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(56,189,248,0.18),transparent_55%)]" />
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
                      <button className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white/80 hover:border-white/40">
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
