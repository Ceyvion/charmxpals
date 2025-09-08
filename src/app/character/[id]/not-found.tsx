import Link from 'next/link';
import { getRepo } from '@/lib/repo';

export default async function NotFound() {
  const repo = await getRepo();
  const picks = await repo.listCharacters({ limit: 6, offset: 0 });

  return (
    <div className="min-h-screen bg-gray-950/90 px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display mb-2">Character Not Found</h1>
          <p className="text-white/80">We couldn’t find that character. Try these instead, or claim yours.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {picks.map((c) => (
            <div key={c.id} className="cp-card p-5 backdrop-blur">
              <div className="h-32 rounded-lg bg-gradient-to-br from-cyan-200 via-amber-200 to-rose-200 mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white/70">Suggested</div>
                  <div className="text-lg font-bold text-white font-display">{c.name}</div>
                </div>
                <Link href={`/character/${c.id}`} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold hover:bg-gray-100">View</Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/explore" className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100">Explore Characters</Link>
          <Link href="/claim" className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Claim Your Character</Link>
          <Link href="/" className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Home</Link>
        </div>
      </div>
    </div>
  );
}
