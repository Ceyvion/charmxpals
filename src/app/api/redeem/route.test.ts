import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashClaimCode } from '@/lib/crypto';

class FakeRedis {
  strings = new Map<string, string>();
  lists = new Map<string, string[]>();

  async get(key: string) {
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.strings.set(key, String(value));
    return 'OK';
  }

  async del(key: string) {
    return this.strings.delete(key) ? 1 : 0;
  }

  async lpush(key: string, value: string) {
    const list = this.lists.get(key) ?? [];
    list.unshift(String(value));
    this.lists.set(key, list);
    return list.length;
  }

  async eval(_lua: string, keys: string[]) {
    const value = this.strings.get(keys[0]) ?? null;
    if (value !== null) this.strings.delete(keys[0]);
    return value;
  }
}

let fakeRedis: FakeRedis;
vi.mock('@/lib/redis', () => ({
  getRedis: () => fakeRedis,
}));
vi.mock('@/lib/rateLimit', () => ({
  rateLimitCheck: vi.fn(async () => ({ allowed: true, resetAt: Date.now() + 10_000 })),
}));
vi.mock('@/lib/ip', () => ({
  getClientIp: () => '127.0.0.1',
}));

function makeReq(body: any) {
  return {
    url: 'http://local/api/redeem',
    headers: new Headers(),
    json: async () => body,
  } as any;
}

describe('redeem atomicity', () => {
  beforeEach(async () => {
    vi.resetModules();
    process.env.CODE_HASH_SECRET = 'test-secret';
    fakeRedis = new FakeRedis();
  });

  it('redeems a code only once under concurrency', async () => {
    const { POST } = await import('./route');
    const code = 'Charm-XPal-REDEEM-1';
    const codeHash = hashClaimCode(code);
    const key = `redeem:code:${codeHash}`;
    await fakeRedis.set(key, JSON.stringify({ series: 'Test Series', createdAt: new Date().toISOString() }));

    const [res1, res2] = await Promise.all([
      POST(makeReq({ code })),
      POST(makeReq({ code })),
    ]);

    const json1 = await res1.json();
    const json2 = await res2.json();
    const successes = [json1, json2].filter((result) => result.success);

    expect(successes).toHaveLength(1);
    expect([res1.status, res2.status].sort()).toEqual([200, 400]);
  });
});
