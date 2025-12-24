import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Teko } from 'next/font/google';
import LayoutChrome from '@/components/LayoutChrome';
import AuthSessionProvider from '@/components/AuthSessionProvider';
import { getTheme } from '@/lib/theme';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const teko = Teko({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-teko' });

export const metadata: Metadata = {
  title: 'CharmPals — Scan a Charm. Meet Your Pal.',
  description: 'Unlock a 3D pal from your physical charm and jump into quick arcade games. No app—play in seconds.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = getTheme();
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${teko.variable} font-sans bg-hero-radial bg-fixed`} data-theme={theme}>
        <AuthSessionProvider>
          <LayoutChrome>{children}</LayoutChrome>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
