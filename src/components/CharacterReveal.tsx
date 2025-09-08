'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

type ApiResult<T> = ({ success: true } & T) | { success: false; error: string };

type Character = {
  id: string;
  name: string;
  description: string | null;
  rarity: number;
  artRefs: Record<string, string>;
  stats: Record<string, number>;
};

export default function CharacterReveal({ characterId, open, onClose }: { characterId: string; open: boolean; onClose?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCharacter(null);
    (async () => {
      try {
        const res = await fetch(`/api/character/${characterId}`);
        const json = (await res.json()) as ApiResult<{ character: Character }>;
        if (!json.success) throw new Error(json.error || 'Failed to load character');
        if (!cancelled) setCharacter(json.character);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load character');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, characterId]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 20 }}
            className="relative w-[min(96vw,720px)] overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur"
          >
            {/* Portal glow */}
            <div className="absolute -inset-8 -z-10 opacity-50" style={{ backgroundImage: 'radial-gradient(600px 300px at 50% -10%, #22d3ee 0%, transparent 60%), radial-gradient(600px 300px at 50% 110%, #f59e0b 0%, transparent 60%)' }} />

            <div className="p-6 border-b border-white/10 text-center">
              <h2 className="text-2xl font-extrabold font-display text-white">Character Unlocked</h2>
              <p className="text-sm text-white/70 mt-1">Welcome your new squad member</p>
            </div>

            <div className="p-6">
              {loading && (
                <div className="h-52 grid place-items-center text-white/80">Loading…</div>
              )}
              {error && (
                <div className="h-52 grid place-items-center text-amber-300">{error}</div>
              )}
              {character && (
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.05 }}
                    className="aspect-[4/3] rounded-xl border border-white/10 bg-gradient-to-br from-cyan-200 via-amber-200 to-rose-200 bg-cover bg-center"
                    style={{ backgroundImage: character.artRefs?.full || character.artRefs?.thumbnail ? `linear-gradient(to bottom right, rgba(34,211,238,0.35), rgba(245,158,11,0.35)), url(${character.artRefs.full || character.artRefs.thumbnail})` : undefined }}
                  />
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}>
                    <div className="text-sm text-white/70">Name</div>
                    <div className="text-3xl font-extrabold text-white font-display">{character.name}</div>
                    {character.description && (
                      <p className="text-white/80 mt-2">{character.description}</p>
                    )}
                    <div className="mt-4 flex gap-2 text-sm">
                      <span className="px-2 py-1 rounded-full border border-white/20 text-white/90">Rarity: {character.rarity}</span>
                      <span className="px-2 py-1 rounded-full border border-white/20 text-white/90">Stats: {Object.keys(character.stats || {}).length}</span>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-5 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10">Close</button>
              <Link href={`/character/${characterId}`} className="px-5 py-2 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100">View Character</Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
