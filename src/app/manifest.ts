import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CharmPals',
    short_name: 'CharmPals',
    description: 'Claim your physical collectible, unlock your pal, and jump into the CharmPals beta.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7fbff',
    theme_color: '#111111',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
