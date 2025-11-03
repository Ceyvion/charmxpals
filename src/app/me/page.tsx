import Link from 'next/link';
import { getServerSession } from 'next-auth';

import { getRepo, type Character } from '@/lib/repo';
import { getModelUrl } from '@/data/characterModels';
import { authOptions } from '@/lib/auth';
import { getBetaChecklistProgress } from '@/lib/betaChecklistStore';
import MeDashboard from './MeDashboard';

export default async function MePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const userDisplayName = session?.user?.name ?? session?.user?.email ?? 'Beta Tester';

  if (!userId) {
    return (
      <div className="min-h-screen py-16 px-4 bg-grid-overlay">
        <div className="cp-container max-w-2xl">
          <div className="cp-panel p-8 text-center">
            <h1 className="text-3xl font-extrabold text-white font-display mb-2">Your Pals</h1>
            <p className="cp-muted">Sign in to view your roster, claim new pals, and sync cosmetics across experiences.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/login" className="px-6 py-3 bg-white text-gray-900 rounded-lg font-bold">Sign in</Link>
              <Link href="/explore" className="px-6 py-3 border border-white/20 text-white rounded-lg font-bold hover:bg-white/5">Explore</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const repo = await getRepo();
  const ownerships = await repo.listOwnershipsByUser(userId);
  const ownedRecords: Array<{ character: Character; ownedAt: Date | null }> = [];
  for (const ownership of ownerships) {
    const character = await repo.getCharacterById(ownership.characterId);
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
    modelUrl: getModelUrl(character) ?? null,
    ownedAtIso: ownedAt ? ownedAt.toISOString() : null,
  }));

  const ownedCount = characters.length;
  const newestPalName = ownedRecords.length > 0 ? ownedRecords[0].character.name : null;
  const lastClaimAtIso = lastClaimAt ? lastClaimAt.toISOString() : null;
  const checklistRecord = await getBetaChecklistProgress(userId);

  return (
    <div className="min-h-screen py-12 px-4 bg-grid-overlay">
      <div className="cp-container">
        <MeDashboard
          userId={userId}
          userDisplayName={userDisplayName}
          ownedCount={ownedCount}
          characters={characters}
          lastClaimAtIso={lastClaimAtIso}
          newestPalName={newestPalName}
          initialChecklistProgress={{
            progress: checklistRecord?.progress ?? {},
            updatedAtIso: checklistRecord?.updatedAt ?? null,
          }}
        />
      </div>
    </div>
  );
}
