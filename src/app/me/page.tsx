import Link from 'next/link';

import { getRepo } from '@/lib/repo';
import { getSafeServerSession } from '@/lib/serverSession';
import { withCharacterLore, type CharacterWithLore } from '@/lib/characterLore';
import MeDashboard from './MeDashboard';

export default async function MePage() {
  const session = await getSafeServerSession();
  const userId = session?.user?.id ?? null;
  const userDisplayName = session?.user?.name ?? session?.user?.email ?? 'Trainer';

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#060610]">
        <div className="relative flex min-h-[70vh] items-center justify-center px-4 py-16">
          <HubParticles count={8} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.04] px-8 py-10 text-center backdrop-blur-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">Player Hub</p>
            <h1 className="mt-3 font-display text-4xl font-black leading-tight text-white">Your Pals</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              Sign in to view your roster, claim new pals, and sync cosmetics across experiences.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg bg-[var(--cp-cyan)] px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all hover:brightness-110"
              >
                Sign in
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center rounded-lg border border-white/[0.12] px-6 py-3 text-sm font-bold uppercase tracking-wider text-white/60 transition-all hover:border-white/30 hover:text-white/90"
              >
                Explore
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const repo = await getRepo();
  const ownerships = await repo.listOwnershipsByUser(userId);
  const ownedRecords: Array<{ character: CharacterWithLore; ownedAt: Date | null }> = [];
  const characterIds = ownerships.map((ownership) => ownership.characterId);
  const ownedCharacters = await repo.getCharactersByIds(characterIds);
  const characterById = new Map<string, CharacterWithLore>();
  for (const character of ownedCharacters) {
    const enriched = withCharacterLore(character);
    if (!enriched) continue;
    characterById.set(character.id, enriched);
  }
  for (const ownership of ownerships) {
    const character = characterById.get(ownership.characterId);
    if (!character) continue;
    ownedRecords.push({ character, ownedAt: ownership.createdAt ?? null });
  }

  ownedRecords.sort((a, b) => {
    const timeA = a.ownedAt ? a.ownedAt.getTime() : 0;
    const timeB = b.ownedAt ? b.ownedAt.getTime() : 0;
    return timeB - timeA;
  });

  const lastClaimAt = ownedRecords.reduce<Date | null>((acc, record) => {
    if (!record.ownedAt) return acc;
    if (!acc) return record.ownedAt;
    return record.ownedAt > acc ? record.ownedAt : acc;
  }, null);

  const characters = ownedRecords.map(({ character, ownedAt }) => ({
    id: character.id,
    name: character.name,
    title: character.title ?? null,
    tagline: character.tagline ?? null,
    stats: (character.stats || {}) as Record<string, number>,
    artRefs: character.artRefs ?? {},
    color: character.color ?? null,
    rarity: character.rarity,
    ownedAtIso: ownedAt ? ownedAt.toISOString() : null,
  }));

  const ownedCount = characters.length;
  const newestPalName = ownedRecords.length > 0 ? ownedRecords[0].character.name : null;
  const lastClaimAtIso = lastClaimAt ? lastClaimAt.toISOString() : null;

  return (
    <MeDashboard
      userId={userId}
      userDisplayName={userDisplayName}
      ownedCount={ownedCount}
      characters={characters}
      lastClaimAtIso={lastClaimAtIso}
      newestPalName={newestPalName}
    />
  );
}

function HubParticles({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="cp-profile-particle"
          style={{
            left: `${10 + (i * 80) / count}%`,
            bottom: '0%',
            animationDuration: `${10 + i * 1.5}s`,
            animationDelay: `${i * 0.8}s`,
            opacity: 0,
          }}
        />
      ))}
    </>
  );
}
