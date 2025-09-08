import './globals.css';
import type { Metadata } from 'next';
import { Inter, Teko } from 'next/font/google';
import LayoutChrome from '@/components/LayoutChrome';
import { getTheme } from '@/lib/theme';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
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
      <body className={`${inter.variable} ${teko.variable} font-sans bg-hero-radial bg-fixed`} data-theme={theme}>
        <LayoutChrome>{children}</LayoutChrome>
      </body>
    </html>
  );
}
