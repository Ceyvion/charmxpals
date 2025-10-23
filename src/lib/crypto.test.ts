import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hashClaimCode, computeChallengeDigest, signChallengeWithCode } from './crypto';

describe('crypto helpers', () => {
  const prev = process.env.CODE_HASH_SECRET;

  beforeAll(() => {
    process.env.CODE_HASH_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.CODE_HASH_SECRET = prev;
  });

  it('hashClaimCode is deterministic with secret', () => {
    const a = hashClaimCode('CHARM-XPAL-001');
    const b = hashClaimCode('CHARM-XPAL-001');
    const c = hashClaimCode('CHARM-XPAL-002');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('hashClaimCode trims and uppercases input', () => {
    const a = hashClaimCode('   charm-xpal-001 ');
    const b = hashClaimCode('CHARM-XPAL-001');
    expect(a).toBe(b);
  });

  it('computeChallengeDigest combines codeHash, nonce, timestamp, salt', () => {
    const codeHash = 'abc123';
    const nonce = 'deadbeefcafebabe';
    const timestamp = '1690000000000';
    const secureSalt = 'unit-salt';
    const digest = computeChallengeDigest({ codeHash, nonce, timestamp, secureSalt });
    // spot check length and deterministic
    expect(digest).toHaveLength(64);
    expect(digest).toBe(computeChallengeDigest({ codeHash, nonce, timestamp, secureSalt }));
  });

  it('signChallengeWithCode HMACs challenge with plaintext code', () => {
    const sig = signChallengeWithCode('CHARM-XPAL-001', 'cafed00dbabe');
    expect(sig).toHaveLength(64);
    expect(sig).toBe(signChallengeWithCode('CHARM-XPAL-001', 'cafed00dbabe'));
  });
});
