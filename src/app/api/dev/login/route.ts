import { NextRequest, NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';

function devEnabled() {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.DEV_AUTH_ENABLED === '1';
}

export async function POST(req: NextRequest) {
  try {
    if (!devEnabled()) return NextResponse.json({ success: false, error: 'Dev login disabled' }, { status: 403 });
    const { username, password } = await req.json();
    const expectedUser = process.env.DEV_AUTH_USER || 'admin';
    const expectedPass = process.env.DEV_AUTH_PASS || 'admin';

    if (username !== expectedUser || password !== expectedPass) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const handle = username;
    const email = `${handle}@local`;
    const repo = await getRepo();
    const user = await repo.upsertDevUser({ handle, email });

    const res = NextResponse.json({ success: true, user: { id: user.id, handle: user.handle, email: user.email } });
    res.cookies.set('cp_user', user.id, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error('Dev login failed:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
