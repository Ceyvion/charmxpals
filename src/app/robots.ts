import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/orchestrator', '/debug', '/3d'],
    },
    sitemap: `${siteUrl.replace(/\/$/, '')}/sitemap.xml`,
    host: siteUrl,
  };
}
