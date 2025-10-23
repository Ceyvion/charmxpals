# RFC: MMO Social Plaza Architecture (v0.1)

## Summary
Introduce a dedicated authoritative game server to host small social instances (20–30 players). The web app (Next.js) issues short‑lived tokens, and the client opens a WebSocket to the game server. The server runs a 20 Hz simulation loop, broadcasting delta‑compressed snapshots and event messages. Client applies interpolation, input prediction (optional), and reconciliation to ensure smoothness.

## Components
- Web App (Next.js): auth/gating, account, cosmetics, launcher UI, token mint.
- Game Server (Node/TS): authoritative simulation + transport (WebSocket). Libraries: Colyseus or custom `ws`. Redis optional for matchmaking and presence.
- Data Store (Upstash Redis): ownership, cosmetics, session records, analytics.
- CDN: GLB/texture delivery; Draco + KTX2; shared skeletons for blend clips.

## Transport & Protocol
- Transport: WebSocket (JSON initially; move to binary after P0 if needed).
- Tick: 20 Hz server tick; send state @10–20 Hz with per‑entity deltas + reliable event RPCs (emote/chat/join/leave).
- Interest Management: simple grid partition; only send nearby players within 50–80m; global chat is separate channel.

### Message Types (initial)
- Client → Server
  - `hello`: { build, device, locale }
  - `auth`: { token } // HMAC/JWT with userId, exp, nonce
  - `join_instance`: { instanceId?, preferredRegion? }
  - `select_avatar`: { characterId, cosmetics? }
  - `input`: { seq, ts, axes: {x,y}, emote?: string }
  - `chat`: { id, ts, text }
  - `ping`: { ts }
- Server → Client
  - `welcome`: { motd, instanceId, snapshotInterval }
  - `auth_ok` | `auth_error`
  - `joined`: { you: PlayerState, others: PlayerState[] }
  - `state`: { t, seqAck, players: Delta<PlayerState>[] }
  - `event`: { type: 'emote'|'join'|'leave'|'chat', data }
  - `pong`: { ts }
  - `kick`: { reason }

See `src/lib/mmo/messages.ts` for TypeScript types.

## Authority & Smoothing
- Server authoritative: movement constraints and sanity checks occur server‑side.
- Client interpolation: keep a 100–150ms buffer and interpolate other players.
- Optional prediction: predict your own movement locally; reconcile on snapshots.

## Data Model (proposed)
- `WorldInstance`: id, region, capacity, status, createdAt, updatedAt.
- `GameSession`: id, userId, instanceId, startedAt, endedAt, disconnectReason.
- `PlayerState`: sessionId, lastPos, lastRot, cosmetics, lastActive.
- `ChatMessage` (optional P1): id, instanceId, userId, text, createdAt, moderation.

Note: implement via Redis data structures after prototype validation.

## Security
- Token: HMAC (HS256) over header.payload using `MMO_WS_SECRET`; 5–10 minute TTL; include `nonce` and `sessionId`.
- Gating: verify ownership before minting token (or dev users in non‑prod).
- Abuse: per‑IP and per‑user rate limits; message size limits; profanity filter; kick/mute lists.

## Deployment
- Containerize server; expose WS behind gateway (NGINX/Cloudflare). Sticky routing by instance id.
- Horizontal scaling: instances as pods; Redis for matchmaking/presence.
- Observability: Prometheus metrics, structured logs; dashboards for CCU/RTT.

## Open Questions
- Use Colyseus vs custom `ws`? Start with Colyseus for velocity, swap if needed.
- Binary format (Flatbuffers/Protobuf) for snapshots once feature set stabilizes.
- Proximity chat scope, VOIP (WebRTC) in P2 once moderation is ready.
