import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signChallengeWithCode } from '@/lib/crypto';

function makeReq(url: string, body: any) {
  return {
    url,
    headers: new Headers(),
    json: async () => body,
  } as any;
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
    let json: any = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe('available');
    expect(json.character?.id).toBeTruthy();

    // 2) Start claim
    res = await startClaim(makeReq('http://local/api/claim/start', { code }));
    json = await res.json();
    expect(json.success).toBe(true);
    expect(json.challengeId).toBeTruthy();
    expect(json.challengeDigest).toHaveLength(64);

    // 3) Complete claim with correct signature
    const signature = signChallengeWithCode(code, json.challengeDigest);
    const complete = await completeClaim(
      makeReq('http://local/api/claim/complete', {
        code,
        challengeId: json.challengeId,
        signature,
        userId: 'test-user-1',
      }),
    );
    const completeJson: any = await complete.json();
    expect(completeJson.success).toBe(true);
    expect(completeJson.characterId).toBeTruthy();

    // 4) Verify reflects claimed
    const res2 = await verifyCode(makeReq('http://local/api/claim/verify', { code }));
    const json2: any = await res2.json();
    expect(res2.status).toBe(200);
    expect(json2.status).toBe('claimed');
  });

  it('rejects invalid signature and prevents challenge reuse', async () => {
    const code2 = 'CHARM-XPAL-002';
    // Start challenge
    const res = await startClaim(makeReq('http://local/api/claim/start', { code: code2 }));
    const json: any = await res.json();
    expect(json.success).toBe(true);

    // Attempt complete with wrong signature
    const bad = await completeClaim(
      makeReq('http://local/api/claim/complete', {
        code: code2,
        challengeId: json.challengeId,
        signature: 'deadbeef',
        userId: 'test-user-2',
      }),
    );
    const badJson: any = await bad.json();
    expect(bad.status).toBe(400);
    expect(badJson.success).toBe(false);

    // Complete correctly
    const okSig = signChallengeWithCode(code2, json.challengeDigest);
    const okRes = await completeClaim(
      makeReq('http://local/api/claim/complete', {
        code: code2,
        challengeId: json.challengeId,
        signature: okSig,
        userId: 'test-user-3',
      }),
    );
    const okJson: any = await okRes.json();
    expect(okJson.success).toBe(true);

    // Try to reuse the same challenge
    const reuse = await completeClaim(
      makeReq('http://local/api/claim/complete', {
        code: code2,
        challengeId: json.challengeId,
        signature: okSig,
        userId: 'test-user-4',
      }),
    );
    const reuseJson: any = await reuse.json();
    expect(reuse.status).toBe(400);
    expect(reuseJson.success).toBe(false);
  });
});
