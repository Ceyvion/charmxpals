import './globals.css';
import type { Metadata } from 'next';
import { Inter, Teko } from 'next/font/google';
import LayoutChrome from '@/components/LayoutChrome';
import { getTheme } from '@/lib/theme';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const teko = Teko({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-teko' });

export const metadata: Metadata = {
  title: 'CharmPals - Physical-Digital Collectibles',
  description: 'Collect, play, and share with CharmPals - the ultimate physical-digital collectible platform',
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
