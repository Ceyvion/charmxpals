import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { isProductionRuntime } from '@/lib/runtime';

export async function getSafeServerSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    if (isProductionRuntime()) {
      console.error('[serverSession] getServerSession failed in production.', error);
      throw error;
    }
    console.warn('[serverSession] getServerSession failed; continuing as anonymous.', error);
    return null;
  }
}
