import type { DefaultSession, DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user?: (DefaultSession['user'] & { id: string; handle?: string | null }) | null;
  }

  interface User extends DefaultUser {
    id: string;
    handle?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string;
  }
}
