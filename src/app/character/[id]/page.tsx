import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { withCharacterLore } from '@/lib/characterLore';
import { resolveCharacterByIdentifier, resolveLoreCharacterByIdentifier } from '@/lib/characterLookup';
import CharacterPageClient from './CharacterPageClient';
import { absoluteUrl } from '@/lib/site';

async function loadCharacter(id: string) {
  const publicCharacter = resolveLoreCharacterByIdentifier(id);
  if (publicCharacter) return withCharacterLore(publicCharacter);

  try {
    const { getRepo } = await import('@/lib/repo');
    const repo = await getRepo();
    const rawCharacter = await resolveCharacterByIdentifier(repo, id);
    return withCharacterLore(rawCharacter);
  } catch (error) {
    console.error(`[character] Failed to load repository-backed character "${id}".`, error);
    return null;
  }
}

type CharacterRouteProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: CharacterRouteProps): Promise<Metadata> {
  const { id } = await params;
  const character = await loadCharacter(id);
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

export default async function CharacterPage({ params }: CharacterRouteProps) {
  const { id } = await params;
  const character = await loadCharacter(id);

  if (!character) return notFound();

  return <CharacterPageClient character={character} />;
}
