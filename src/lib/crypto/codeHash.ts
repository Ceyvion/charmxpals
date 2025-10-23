import { createHmac } from 'crypto';

export function hashClaimCode(rawCode: string, secret = process.env.CODE_HASH_SECRET || ''): string {
  const code = (rawCode || '').trim().toUpperCase();
  if (!secret) throw new Error('CODE_HASH_SECRET missing');
  if (!code) throw new Error('Empty claim code');
  return createHmac('sha256', secret).update(code).digest('hex');
}
