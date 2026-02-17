import { createHmac } from 'crypto';

type TokenPayload = Record<string, unknown>;

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function signToken(payload: TokenPayload, opts?: { secret?: string }) {
  const secret = opts?.secret || process.env.MMO_WS_SECRET || process.env.CODE_HASH_SECRET || 'dev-secret';
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { iat: Math.floor(Date.now() / 1000), ...payload };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export type MmoSessionClaims = {
  sub: string; // userId
  sid: string; // sessionId
  exp: number; // exp in seconds
  nonce: string;
  scope?: string[]; // e.g., ['plaza:join']
  owned?: string[]; // avatar identifiers allowed (character slug preferred)
  mode?: 'plaza' | 'arena';
};
