import { NextRequest } from 'next/server';
import { getRepo } from '@/lib/repo';
import { resolveCharacterByIdentifier } from '@/lib/characterLookup';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const repo = await getRepo();
    const character = await resolveCharacterByIdentifier(repo, params.id);
    if (!character) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
    return Response.json(
      { success: true, character },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (error) {
    console.error('Character API error:', error);
    return Response.json({ success: false, error: 'Failed to load character' }, { status: 500 });
  }
}
