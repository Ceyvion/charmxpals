import { getRepo } from '@/lib/repo';
import { getSafeServerSession } from '@/lib/serverSession';

export async function GET() {
  const session = await getSafeServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const repo = await getRepo();
  const ids = repo.listOwnedCharacterIdsByUser
    ? await repo.listOwnedCharacterIdsByUser(userId)
    : Array.from(new Set((await repo.listOwnershipsByUser(userId)).map((ownership) => ownership.characterId).filter(Boolean)));

  return Response.json(
    {
      success: true,
      ids,
    },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
