import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Teko } from 'next/font/google';
import LayoutChrome from '@/components/LayoutChrome';
import { getSiteUrl } from '@/lib/site';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const teko = Teko({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-teko' });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'CharmPals',
    template: '%s | CharmPals',
  },
  description: 'Claim your physical collectible, unlock your pal, and jump into the CharmPals beta in seconds.',
  applicationName: 'CharmPals',
  icons: { icon: '/favicon.ico' },
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'CharmPals',
    description: 'Claim your physical collectible, unlock your pal, and jump into the CharmPals beta in seconds.',
    type: 'website',
    url: '/',
    siteName: 'CharmPals',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CharmPals',
    description: 'Claim your physical collectible, unlock your pal, and jump into the CharmPals beta in seconds.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${teko.variable} font-sans`}>
        <LayoutChrome>{children}</LayoutChrome>
      </body>
    </html>
  );
}
