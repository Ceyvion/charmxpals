import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Play',
  description: 'Jump into the current CharmPals playable beta modes, from runner to arena previews.',
  alternates: {
    canonical: '/play',
  },
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
