import { getRepo } from '@/lib/repo';
import { notFound } from 'next/navigation';
import { withCharacterLore } from '@/lib/characterLore';
import { resolveCharacterByIdentifier } from '@/lib/characterLookup';
import CharacterPageClient from './CharacterPageClient';

export default async function CharacterPage({ params }: { params: { id: string } }) {
  const repo = await getRepo();
  const rawCharacter = await resolveCharacterByIdentifier(repo, params.id);
  const character = withCharacterLore(rawCharacter);

  if (!character) return notFound();

  return <CharacterPageClient character={character} />;
}
