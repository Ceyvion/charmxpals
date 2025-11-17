import { NextRequest, NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request.url, request.headers);
    const rl = await rateLimitCheck(`${ip}:dev-user`, { windowMs: 60_000, max: 20, prefix: 'dev' });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString(),
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle') || 'demo';
    const email = `${handle}@local`;

    const repo = await getRepo();
    const user = await repo.upsertDevUser({ handle, email });

    const res = NextResponse.json({ success: true, user: { id: user.id, email: user.email, handle: user.handle } });
    try {
      // Lightweight dev cookie to allow server components to render user inventory.
      res.cookies.set('cp_user', user.id, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    } catch {}
    return res;
  } catch (error) {
    console.error('Dev user error:', error);
    return Response.json({ success: false, error: 'Failed to create or load dev user' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
