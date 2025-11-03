import { createHash, timingSafeEqual } from 'crypto';
import type { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { getRepo } from '@/lib/repo';

function hashSecret(value: string) {
  return createHash('sha256').update(value).digest();
}

function secureCompare(a: string, b: string): boolean {
  const bufferA = hashSecret(a);
  const bufferB = hashSecret(b);
  try {
    return timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

function normalizeEmails(input: string | undefined) {
  if (!input) return [];
  return input
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Beta Access',
      credentials: {
        email: { label: 'Email', type: 'email' },
        accessCode: { label: 'Access code', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() || '';
        const accessCode = credentials?.accessCode?.trim() || '';

        if (!email || !accessCode) {
          throw new Error('Email and access code are required.');
        }

        const betaSecret = process.env.BETA_ACCESS_SECRET;
        const devFallback =
          process.env.NODE_ENV !== 'production'
            ? process.env.DEV_AUTH_PASS || 'admin'
            : null;

        const expectedSecret = betaSecret || devFallback;
        if (!expectedSecret) {
          throw new Error('Login is not enabled. Configure BETA_ACCESS_SECRET.');
        }

        if (!secureCompare(expectedSecret, accessCode)) {
          return null;
        }

        const allowedEmails = normalizeEmails(process.env.BETA_TESTERS);
        if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
          return null;
        }

        const repo = await getRepo();
        const handle = email.split('@')[0] || 'pal';
        const user = await repo.upsertDevUser({ handle, email });

        return {
          id: user.id,
          email: user.email,
          name: user.handle ?? handle,
        } satisfies User;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
