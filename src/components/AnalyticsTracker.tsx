'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { trackEvent } from '@/lib/analyticsClient';

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackEvent('page_view', { route: pathname || '/' }, { path: pathname || '/' });
  }, [pathname]);

  return null;
}
