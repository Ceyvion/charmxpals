import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getSafeServerSession: vi.fn(),
  rateLimitCheck: vi.fn(),
  getRepo: vi.fn(),
  getClientIp: vi.fn(),
  ensurePlazaServer: vi.fn(),
}));

vi.mock('@/lib/serverSession', () => ({
  getSafeServerSession: mocks.getSafeServerSession,
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimitCheck: mocks.rateLimitCheck,
}));

vi.mock('@/lib/repo', () => ({
  getRepo: mocks.getRepo,
}));

vi.mock('@/lib/ip', () => ({
  getClientIp: mocks.getClientIp,
}));

vi.mock('@/lib/mmo/serverRuntime', () => ({
  ensurePlazaServer: mocks.ensurePlazaServer,
}));

function makeReq(path = '/api/mmo/token') {
  return new NextRequest(`https://charmxpals.vercel.app${path}`, {
    headers: {
      host: 'charmxpals.vercel.app',
      'x-forwarded-host': 'charmxpals.vercel.app',
    },
  });
}

describe('/api/mmo/token', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      VERCEL: '1',
      CODE_HASH_SECRET: 'test-code-secret',
      MMO_WS_SECRET: '',
      MMO_WS_URL: '',
      NEXT_PUBLIC_MMO_WS_URL: '',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
    };
    mocks.getClientIp.mockReturnValue('127.0.0.1');
    mocks.rateLimitCheck.mockResolvedValue({ allowed: true, remaining: 9, resetAt: Date.now() + 10_000 });
    mocks.getRepo.mockImplementation(() => {
      throw new Error('repo should not be needed for guest plaza sessions');
    });
  });

  it('mints a hosted guest plaza session without touching repo storage', async () => {
    mocks.getSafeServerSession.mockResolvedValue(null);

    const { GET } = await import('./route');
    const response = await GET(makeReq());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.transport).toBe('http');
    expect(json.token).toEqual(expect.any(String));
    expect(json.claims.sub).toMatch(/^guest:/);
    expect(json.claims.owned).toEqual(['neon-city']);
    expect(mocks.getRepo).not.toHaveBeenCalled();
  });

  it('keeps arena gated behind authentication', async () => {
    mocks.getSafeServerSession.mockResolvedValue(null);
    mocks.rateLimitCheck.mockImplementation(() => {
      throw new Error('rate limit should not run before arena auth rejection');
    });

    const { GET } = await import('./route');
    const response = await GET(makeReq('/api/mmo/token?mode=arena'));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json).toEqual({ ok: false, error: 'unauthenticated' });
    expect(mocks.rateLimitCheck).not.toHaveBeenCalled();
    expect(mocks.getRepo).not.toHaveBeenCalled();
  });
});
