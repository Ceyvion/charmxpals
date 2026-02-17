import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';

export async function getSafeServerSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[serverSession] getServerSession failed; continuing as anonymous.', error);
    }
    return null;
  }
}
