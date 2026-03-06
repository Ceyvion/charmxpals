import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Beta Login',
  description: 'Sign in to the CharmPals beta to claim pals and access synced gameplay surfaces.',
  alternates: {
    canonical: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
