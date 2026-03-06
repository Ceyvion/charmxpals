import type { Metadata } from 'next';

import ClaimPageClient from './ClaimPageClient';
import AuthSessionProvider from '@/components/AuthSessionProvider';

export const metadata: Metadata = {
  title: 'Claim Your Pal',
  description: 'Verify your code, claim your CharmPal, and sync it to your account.',
  alternates: {
    canonical: '/claim',
  },
};

export default function ClaimPage() {
  return (
    <AuthSessionProvider>
      <ClaimPageClient />
    </AuthSessionProvider>
  );
}
