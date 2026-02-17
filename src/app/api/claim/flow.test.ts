import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { signChallengeWithCode } from '@/lib/crypto';
import type { NextRequest } from 'next/server';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(async () => ({
    user: {
      id: 'test-user-1',
    },
  })),
}));

type JsonObject = Record<string, unknown>;

function makeReq(url: string, body: JsonObject) {
  return {
    url,
    headers: new Headers(),
    json: async () => body,
  } as unknown as NextRequest;
}

let startClaim: typeof import('./start/route').POST;
let completeClaim: typeof import('./complete/route').POST;
let verifyCode: typeof import('./verify/route').POST;

describe('claim flow (memory repo)', () => {
  const code = 'CHARM-XPAL-001';
  const prevSecret = process.env.CODE_HASH_SECRET;

  beforeAll(async () => {
    process.env.CODE_HASH_SECRET = 'test-secret';
    ({ POST: startClaim } = await import('./start/route'));
    ({ POST: completeClaim } = await import('./complete/route'));
    ({ POST: verifyCode } = await import('./verify/route'));
  });

  afterAll(() => {
    process.env.CODE_HASH_SECRET = prevSecret;
  });

  it('verifies availability, starts challenge, completes claim, and reflects claimed status', async () => {
    // 1) Verify before claim
    let res = await verifyCode(makeReq('http://local/api/claim/verify', { code }));
    let json = (await res.json()) as JsonObject;
    expect(res.status).toBe(200);
    expect(json.status).toBe('available');
    const character = json.character as { id?: string } | null | undefined;
    expect(character?.id).toBeTruthy();

    // 2) Start claim
    res = await startClaim(makeReq('http://local/api/claim/start', { code }));
    json = await res.json();
    expect(json.success).toBe(true);
    expect(json.challengeId).toBeTruthy();
    const challengeDigest = typeof json.challengeDigest === 'string' ? json.challengeDigest : '';
    expect(challengeDigest).toHaveLength(64);

    // 3) Complete claim with correct signature
    const signature = signChallengeWithCode(code, challengeDigest);
    const complete = await completeClaim(
      makeReq('http://local/api/claim/complete', {
        code,
        challengeId: String(json.challengeId || ''),
        signature,
      }),
    );
    const completeJson = (await complete.json()) as JsonObject;
    expect(completeJson.success).toBe(true);
    expect(completeJson.characterId).toBeTruthy();
    expect(typeof completeJson.claimedAt).toBe('string');

    // 4) Verify reflects claimed
    const res2 = await verifyCode(makeReq('http://local/api/claim/verify', { code }));
    const json2 = (await res2.json()) as JsonObject;
    expect(res2.status).toBe(200);
    expect(json2.status).toBe('claimed');
  });

  it('rejects invalid signature and prevents challenge reuse', async () => {
    const code2 = 'CHARM-XPAL-002';
    // Start challenge
    const res = await startClaim(makeReq('http://local/api/claim/start', { code: code2 }));
    const json = (await res.json()) as JsonObject;
    expect(json.success).toBe(true);
    const challengeId = String(json.challengeId || '');
    const challengeDigest = String(json.challengeDigest || '');

    // Attempt complete with wrong signature
    const bad = await completeClaim(
      makeReq('http://local/api/claim/complete', {
        code: code2,
        challengeId,
        signature: 'deadbeef',
      }),
    );
    const badJson = (await bad.json()) as JsonObject;
    expect(bad.status).toBe(400);
    expect(badJson.success).toBe(false);

    // Complete correctly
    const okSig = signChallengeWithCode(code2, challengeDigest);
    const okRes = await completeClaim(
      makeReq('http://local/api/claim/complete', {
        code: code2,
        challengeId,
        signature: okSig,
      }),
    );
    const okJson = (await okRes.json()) as JsonObject;
    expect(okJson.success).toBe(true);
    expect(typeof okJson.claimedAt).toBe('string');

    // Try to reuse the same challenge
    const reuse = await completeClaim(
      makeReq('http://local/api/claim/complete', {
        code: code2,
        challengeId,
        signature: okSig,
      }),
    );
    const reuseJson = (await reuse.json()) as JsonObject;
    expect(reuse.status).toBe(400);
    expect(reuseJson.success).toBe(false);
  });
});
