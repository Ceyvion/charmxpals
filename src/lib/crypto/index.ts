import { randomBytes, createHmac } from 'crypto';

export { hashClaimCode } from './codeHash';

export type ClaimTokenPayload = {
  challengeId: string;
  codeHash: string;
  nonce: string;
  timestamp: string;
  unitId: string;
  secureSalt: string;
  sub: string | null;
  exp: number;
};

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function decodeBase64Url(input: string) {
  let normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  if (pad) normalized += '='.repeat(4 - pad);
  return Buffer.from(normalized, 'base64');
}

function resolveClaimTokenSecret() {
  const configured = process.env.CLAIM_TOKEN_SECRET?.trim() || process.env.CODE_HASH_SECRET?.trim();
  if (configured) return configured;
  throw new Error('Claim token secret is not configured.');
}

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

export function signClaimToken(payload: ClaimTokenPayload) {
  const secret = resolveClaimTokenSecret();
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyClaimToken(token: string): ClaimTokenPayload | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const secret = resolveClaimTokenSecret();
    const data = `${header}.${payload}`;
    const expected = createHmac('sha256', secret).update(data).digest('base64url');
    if (expected !== signature) return null;

    const parsed = JSON.parse(decodeBase64Url(payload).toString('utf8')) as Partial<ClaimTokenPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof parsed.challengeId !== 'string' ||
      typeof parsed.codeHash !== 'string' ||
      typeof parsed.nonce !== 'string' ||
      typeof parsed.timestamp !== 'string' ||
      typeof parsed.unitId !== 'string' ||
      typeof parsed.secureSalt !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (parsed.exp < now) return null;

    return {
      challengeId: parsed.challengeId,
      codeHash: parsed.codeHash,
      nonce: parsed.nonce,
      timestamp: parsed.timestamp,
      unitId: parsed.unitId,
      secureSalt: parsed.secureSalt,
      sub: typeof parsed.sub === 'string' ? parsed.sub : null,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}
