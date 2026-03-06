import type { MetadataRoute } from 'next';

import { characterLore } from '@/data/characterLore';
import { getSiteUrl } from '@/lib/site';

const STATIC_ROUTES = [
  '/',
  '/claim',
  '/explore',
  '/play',
  '/arena',
  '/plaza',
  '/compare',
  '/login',
  '/support',
  '/privacy',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl().replace(/\/$/, '');
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : route === '/claim' || route === '/explore' || route === '/play' ? 0.85 : 0.65,
  }));

  const characterEntries: MetadataRoute.Sitemap = characterLore.map((character) => ({
    url: `${siteUrl}/character/${character.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticEntries, ...characterEntries];
}
