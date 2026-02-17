import './globals.css';
import type { Metadata } from 'next';
import { Space_Grotesk, Teko } from 'next/font/google';
import LayoutChrome from '@/components/LayoutChrome';
import AuthSessionProvider from '@/components/AuthSessionProvider';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const teko = Teko({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-teko' });

export const metadata: Metadata = {
  title: 'CharmPals — Scan a Charm. Meet Your Pal.',
  description: 'Unlock a pal from your physical charm and jump into multiplayer arenas and arcade modes in seconds.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${teko.variable} font-sans`}>
        <AuthSessionProvider>
          <LayoutChrome>{children}</LayoutChrome>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
