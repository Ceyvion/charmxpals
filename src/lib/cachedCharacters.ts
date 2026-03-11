import { unstable_cache } from 'next/cache';

import { getRepo, type Character } from '@/lib/repo';

const getCachedCharacterPage = unstable_cache(
  async (limit: number, offset: number): Promise<Character[]> => {
    const repo = await getRepo();
    return repo.listCharacters({ limit, offset });
  },
  ['character-roster-page'],
  { revalidate: 60 },
);

export async function getCachedCharacters(limit: number, offset = 0) {
  return getCachedCharacterPage(limit, offset);
}
