import { getRepo } from '@/lib/repo';
import { notFound } from 'next/navigation';
import { getModelUrl } from '@/data/characterModels';
import { withCharacterLore } from '@/lib/characterLore';
import CharacterPageClient from './CharacterPageClient';

export default async function CharacterPage({ params }: { params: { id: string } }) {
  const repo = await getRepo();
  const rawCharacter = await repo.getCharacterById(params.id);
  const character = withCharacterLore(rawCharacter);

  if (!character) return notFound();

  const modelUrl = getModelUrl(character);

  return <CharacterPageClient character={character} modelUrl={modelUrl} />;
}
