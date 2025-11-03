"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
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

  const handleChecklistUpdate = useCallback((snapshot: ChecklistSnapshot) => {
    setChecklistSnapshot(snapshot);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-white font-display">My Pals</h1>
        <div className="flex gap-2">
          <Link href="/claim" className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold">Claim</Link>
          <Link href="/play" className="px-4 py-2 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Play</Link>
        </div>
      </div>
      <div className="space-y-10 mb-10">
        <BetaWelcome
          userName={userDisplayName}
          ownedCount={ownedCount}
          lastClaimAtIso={lastClaimAtIso}
          newestPalName={newestPalName}
          checklistProgressPercent={checklistPercent}
          checklistUpdatedAtIso={checklistSnapshot.updatedAtIso}
        />
        <BetaChecklist
          userId={userId}
          initialProgress={checklistSnapshot}
          onProgressUpdate={handleChecklistUpdate}
        />
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

type ChecklistSnapshot = {
  progress: Record<string, boolean>;
  updatedAtIso: string | null;
};
