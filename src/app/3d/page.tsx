import Link from 'next/link';

export default function ThreePreviewPage() {
  return (
    <div className="min-h-screen bg-grid-overlay px-4 py-20">
      <div className="cp-container max-w-4xl">
        <div className="cp-panel cp-section-dark border-[var(--cp-gray-700)] p-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Beta Update</p>
          <h1 className="mt-4 font-display text-4xl font-black md:text-5xl">3D Viewer Paused for Stability</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
            The experimental 3D viewer has been removed from beta while we finish the rendering pipeline and asset QA. Arena gameplay and roster
            progression remain fully available.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/arena" className="cp-cta-primary">
              Enter Rift Arena
            </Link>
            <Link href="/play" className="cp-cta-ghost">
              Open Game Hub
            </Link>
            <Link href="/explore" className="cp-cta-ghost">
              Browse Characters
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
