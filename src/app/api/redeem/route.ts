import { NextRequest, NextResponse } from 'next/server';

import { hashClaimCode } from '@/lib/crypto';
import { getClientIp } from '@/lib/ip';
import { getRedis } from '@/lib/redis';
import { rateLimitCheck } from '@/lib/rateLimit';

const redis = getRedis();

const CODE_PREFIX = process.env.REDEEM_CODE_PREFIX || 'redeem:code';
const CLAIM_LOG_KEY = process.env.REDEEM_CLAIMED_KEY || 'redeem:claimed';

async function getAndDelete(key: string): Promise<string | null> {
  const maybeClient = redis as unknown as { getdel?: (k: string) => Promise<unknown> };
  if (typeof maybeClient.getdel === 'function') {
    const value = (await maybeClient.getdel(key)) as string | null;
    return value;
  }
  const value = (await redis.get(key)) as string | null;
  if (!value) return null;
  await redis.del(key);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.url, request.headers);
    const rl = rateLimitCheck(`${ip}:redeem`, { windowMs: 60_000, max: 15, prefix: 'redeem' });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: { 'Retry-After': Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString() },
        },
      );
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const code = typeof payload?.code === 'string' ? payload.code : '';
    if (!code.trim()) {
      return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });
    }

    const codeHash = hashClaimCode(code);
    const key = `${CODE_PREFIX}:${codeHash}`;
    const stored = await getAndDelete(key);
    if (!stored) {
      return NextResponse.json({ success: false, error: 'Code invalid or already redeemed' }, { status: 400 });
    }

    let record: { series?: string | null; createdAt?: string } | null = null;
    try {
      record = JSON.parse(stored);
    } catch {
      record = null;
    }

    const claimedAt = new Date().toISOString();
    const series = record?.series ?? null;

    const logEntry = {
      codeHash,
      series,
      claimedAt,
      ip,
      metadata: payload?.metadata ?? null,
    };

    try {
      await redis.lpush(CLAIM_LOG_KEY, JSON.stringify(logEntry));
    } catch (error) {
      console.warn('[redeem] Failed to log redemption event', error);
    }

    return NextResponse.json({ success: true, series, claimedAt });
  } catch (error) {
    console.error('[redeem] Unexpected error', error);
    return NextResponse.json({ success: false, error: 'Failed to redeem code' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
