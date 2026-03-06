import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rift Arena',
  description: 'Real-time 2D arena battles inside the current CharmPals beta.',
  alternates: {
    canonical: '/arena',
  },
};

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
