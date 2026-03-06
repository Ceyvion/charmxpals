import { NextRequest } from 'next/server';

import { recordAnalyticsEvent } from '@/lib/analyticsStore';
import {
  sanitizeAnalyticsName,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsProperties,
} from '@/lib/analytics';
import { getClientIp } from '@/lib/ip';
import { getSafeServerSession } from '@/lib/serverSession';
import { rateLimitCheck } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.url, request.headers);
  const rateLimit = await rateLimitCheck(`analytics:${ip}`, {
    windowMs: 60_000,
    max: 120,
    prefix: 'analytics',
  });

  if (!rateLimit.allowed) {
    return Response.json({ success: false, error: 'rate_limited' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {};
  const name = sanitizeAnalyticsName(parsed.name);
  if (!name) {
    return Response.json({ success: false, error: 'invalid_name' }, { status: 400 });
  }

  const session = await getSafeServerSession();
  const event = {
    id: crypto.randomUUID(),
    name,
    path: sanitizeAnalyticsPath(parsed.path),
    properties: sanitizeAnalyticsProperties(parsed.properties),
    userId: session?.user?.id ?? null,
    ip,
    userAgent: request.headers.get('user-agent'),
    createdAt: new Date().toISOString(),
  };

  await recordAnalyticsEvent(event);
  return new Response(null, { status: 204 });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
