// MMO Social Plaza — Message and state types (v0.1)

export type Vec2 = { x: number; y: number };

export type Cosmetics = {
  skinId?: string | null;
  badgeIds?: string[];
  nameplate?: string | null;
};

export type PlayerState = {
  id: string; // session or user scoped id (server decides)
  userId: string;
  characterId: string;
  displayName: string;
  pos: Vec2; // plaza is 2.5D; extend to Vec3 later
  rot: number; // radians or degrees; client/server must agree
  cosmetics: Cosmetics;
  emote?: string | null; // transient
};

// Client → Server
export type C2SHello = { type: 'hello'; build: string; device?: string; locale?: string };
export type C2SAuth = { type: 'auth'; token: string };
export type C2SJoin = { type: 'join_instance'; instanceId?: string; preferredRegion?: string };
export type C2SSelectAvatar = {
  type: 'select_avatar';
  characterId: string;
  cosmetics?: Cosmetics;
};
export type C2SInput = { type: 'input'; seq: number; ts: number; axes: Vec2; emote?: string };
export type C2SChat = { type: 'chat'; id: string; ts: number; text: string };
export type C2SPing = { type: 'ping'; ts: number };

export type C2S = C2SHello | C2SAuth | C2SJoin | C2SSelectAvatar | C2SInput | C2SChat | C2SPing;

// Server → Client
export type S2CWelcome = { type: 'welcome'; motd?: string; instanceId: string; snapshotInterval: number };
export type S2CAuthOk = { type: 'auth_ok'; sessionId: string };
export type S2CAuthError = { type: 'auth_error'; reason: string };
export type S2CJoined = { type: 'joined'; you: PlayerState; others: PlayerState[] };
export type S2CState = { type: 'state'; t: number; seqAck: number; players: Array<Partial<PlayerState> & { id: string }> };
export type S2CEvent = { type: 'event'; event: 'emote' | 'join' | 'leave' | 'chat'; data: any };
export type S2CPong = { type: 'pong'; ts: number };
export type S2CKick = { type: 'kick'; reason: string };

export type S2C = S2CWelcome | S2CAuthOk | S2CAuthError | S2CJoined | S2CState | S2CEvent | S2CPong | S2CKick;

