import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { loadCrewProfiles, loadPendingInvites } from '@/lib/friends';
import FriendsClient from './FriendsClient';

export const revalidate = 0;

export default async function FriendsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const userEmail = session?.user?.email ?? null;
  const userLabel = session?.user?.name ?? session?.user?.email ?? 'Beta Tester';

  const [friends, pendingInvites] = await Promise.all([
    userId ? loadCrewProfiles(userId) : Promise.resolve([]),
    loadPendingInvites(userEmail),
  ]);

  return <FriendsClient userLabel={userLabel} isAuthenticated={Boolean(userId)} friends={friends} pendingInvites={pendingInvites} />;
}
