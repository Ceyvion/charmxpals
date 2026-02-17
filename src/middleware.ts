import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block debug routes in production
  const debugRoutes = ['/3d', '/debug', '/orchestrator'];
  const isDebugRoute = debugRoutes.some((route) => pathname.startsWith(route));

  if (isDebugRoute && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/3d/:path*', '/debug/:path*', '/orchestrator/:path*'],
};
