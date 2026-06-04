import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/serverSession', () => ({
  getSafeServerSession: vi.fn(async () => null),
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimitCheck: vi.fn(async () => ({ allowed: true, resetAt: Date.now() + 10_000 })),
}));

function makeReq(body: Record<string, unknown>) {
  return {
    url: 'http://local/api/claim/verify',
    headers: new Headers(),
    json: async () => body,
  } as unknown as NextRequest;
}

describe('/api/claim/verify auth gate', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CODE_HASH_SECRET = 'test-secret';
  });

  it('does not reveal claim-code status to unauthenticated callers', async () => {
    const { POST } = await import('./route');

    const response = await POST(makeReq({ code: 'CHARM-XPAL-001' }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ error: 'unauthorized' });
  });
});
