import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Signal Plaza',
  description: 'Meet up in the real-time social hub for the CharmPals beta.',
  alternates: {
    canonical: '/plaza',
  },
};

export default function PlazaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
