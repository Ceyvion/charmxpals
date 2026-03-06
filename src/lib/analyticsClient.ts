'use client';

import type { AnalyticsProperties } from '@/lib/analytics';

type TrackEventOptions = {
  path?: string | null;
};

export function trackEvent(name: string, properties?: AnalyticsProperties, options?: TrackEventOptions) {
  const path = options?.path ?? (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : null);
  const payload = JSON.stringify({
    name,
    path,
    properties: properties ?? {},
  });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/event', blob);
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    cache: 'no-store',
    keepalive: true,
  }).catch(() => {});
}
