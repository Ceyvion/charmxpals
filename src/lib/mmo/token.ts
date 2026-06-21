import { createHmac, timingSafeEqual } from 'crypto';
import { isProductionRuntime } from '@/lib/runtime';

type TokenPayload = Record<string, unknown>;

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function resolveMmoTokenSecret(explicit?: string) {
  const configured = explicit || process.env.MMO_WS_SECRET?.trim() || process.env.CODE_HASH_SECRET?.trim();
  if (configured) return configured;

  if (!isProductionRuntime()) {
    return 'dev-secret';
  }

  throw new Error('MMO_WS_SECRET or CODE_HASH_SECRET is required in production.');
}

export function signToken(payload: TokenPayload, opts?: { secret?: string }) {
  const secret = resolveMmoTokenSecret(opts?.secret);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { iat: Math.floor(Date.now() / 1000), ...payload };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function decodeBase64Url(input: string) {
  let normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  if (pad) normalized += '='.repeat(4 - pad);
  return Buffer.from(normalized, 'base64');
}

export function verifyToken(token: string, opts?: { secret?: string }): MmoSessionClaims | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const secret = resolveMmoTokenSecret(opts?.secret);
    const data = `${header}.${payload}`;
    const expected = createHmac('sha256', secret).update(data).digest('base64url');
    const actual = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actual.length !== expectedBuffer.length || !timingSafeEqual(actual, expectedBuffer)) {
      return null;
    }
    const parsed = JSON.parse(decodeBase64Url(payload).toString('utf8')) as MmoSessionClaims & { iat?: number };
    const now = Math.floor(Date.now() / 1000);
    if (!parsed.sub || !parsed.sid || !parsed.nonce || typeof parsed.exp !== 'number') return null;
    if (parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export type MmoSessionClaims = {
  sub: string; // userId
  sid: string; // sessionId
  exp: number; // exp in seconds
  nonce: string;
  scope?: string[]; // e.g., ['plaza:join']
  owned?: string[]; // avatar identifiers allowed (character slug preferred)
  mode?: 'plaza' | 'arena';
  displayName?: string;
};
