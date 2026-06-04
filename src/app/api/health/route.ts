import { NextResponse } from 'next/server';
import { getRuntimeDiagnostics } from '@/lib/runtime';

export async function GET() {
  const diagnostics = getRuntimeDiagnostics();
  return NextResponse.json(
    {
      status: diagnostics.ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
    },
    { status: diagnostics.ok ? 200 : 503 },
  );
}
