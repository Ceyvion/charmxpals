export type CrewFriend = {
  id: string;
  name: string;
  dancerTitle: string;
  status: string;
  energy: 'High' | 'Medium' | 'Low';
  vibe: string;
  accent: string;
};

export type CrewInvite = {
  id: string;
  handle: string;
  sentAt: string;
};
