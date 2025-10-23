import { randomBytes, createHmac } from 'crypto';

export { hashClaimCode } from './codeHash';

export function generateNonce() {
  return randomBytes(16).toString('hex');
}

// Legacy helper (kept for reference); prefer computeChallengeDigest below
export function generateChallenge(code: string, nonce: string, timestamp: string, secret: string) {
  return createHmac('sha256', secret).update(`${code}-${nonce}-${timestamp}`).digest('hex');
}

// Compute a server-side challenge digest bound to the physical unit
// Uses per-unit secureSalt and the hashed code to avoid handling plaintext at rest
export function computeChallengeDigest(params: {
  codeHash: string;
  nonce: string;
  timestamp: string; // stringified milliseconds
  secureSalt: string;
}) {
  const { codeHash, nonce, timestamp, secureSalt } = params;
  return createHmac('sha256', secureSalt).update(`${codeHash}-${nonce}-${timestamp}`).digest('hex');
}

// Client-simulated signing: HMAC the challenge digest using the plaintext code as key
export function signChallengeWithCode(code: string, challengeDigest: string) {
  return createHmac('sha256', code).update(challengeDigest).digest('hex');
}
