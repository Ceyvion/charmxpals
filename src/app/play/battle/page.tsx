import dynamic from 'next/dynamic';

const BattlePhaserGame = dynamic(() => import('@/components/play/BattlePhaserGame'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#020617_45%,_#030712_100%)] px-4 py-20 text-slate-100">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-700 bg-slate-900/90 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Loading</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-slate-50">Rift Pulse Ascendant</h1>
        <p className="mt-3 text-slate-300">Preparing the Phaser arena and combat systems...</p>
      </div>
    </div>
  ),
});

export default function BattlePage() {
  return <BattlePhaserGame />;
}
