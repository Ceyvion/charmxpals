import { getArenaProgress } from '@/lib/arenaProgressStore';
import { getSafeServerSession } from '@/lib/serverSession';

export async function GET() {
  const session = await getSafeServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const record = await getArenaProgress(userId);
  return Response.json({
    success: true,
    record,
  });
}

export async function POST() {
  return Response.json({
    success: false,
    error: 'arena_progress_server_managed',
  }, {
    status: 405,
    headers: { Allow: 'GET' },
  });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
