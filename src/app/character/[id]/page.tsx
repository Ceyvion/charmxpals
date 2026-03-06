import type { Metadata } from 'next';
import { getRepo } from '@/lib/repo';
import { notFound } from 'next/navigation';
import { withCharacterLore } from '@/lib/characterLore';
import { resolveCharacterByIdentifier } from '@/lib/characterLookup';
import CharacterPageClient from './CharacterPageClient';
import { absoluteUrl } from '@/lib/site';

async function loadCharacter(id: string) {
  const repo = await getRepo();
  const rawCharacter = await resolveCharacterByIdentifier(repo, id);
  return withCharacterLore(rawCharacter);
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const character = await loadCharacter(params.id);
  if (!character) {
    return {
      title: 'Character Not Found',
    };
  }

  const ogImage =
    character.artRefs?.banner ??
    character.artRefs?.signature ??
    character.artRefs?.portrait ??
    character.artRefs?.card ??
    null;
  const canonicalPath = `/character/${character.slug ?? character.id}`;
  const description =
    character.tagline ??
    character.description ??
    `Explore ${character.name} and their CharmPals profile.`;

  return {
    title: character.name,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: character.name,
      description,
      type: 'profile',
      url: canonicalPath,
      images: ogImage ? [{ url: absoluteUrl(ogImage), alt: character.name }] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: character.name,
      description,
      images: ogImage ? [absoluteUrl(ogImage)] : undefined,
    },
  };
}

export default async function CharacterPage({ params }: { params: { id: string } }) {
  const character = await loadCharacter(params.id);

  if (!character) return notFound();

  return <CharacterPageClient character={character} />;
}
