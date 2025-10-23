# MMO Social Plaza — Feature Spec (v0.1)

## Overview
Create a lightweight, low‑latency “Social Plaza” where verified owners of physical collectibles can spawn an avatar, explore, emote, and chat with 20–30 other players per instance. This is a vertical slice aimed at validating tech, UX, and performance prior to expanding into larger worlds or gameplay modes.

## Goals
- Real‑time presence: players appear, move, emote, and chat with low perceived latency.
- Ownership‑gated access: only users with a collectible (or dev users) can join.
- Cosmetics from collectibles: skins/nameplates driven by ownership/cosmetics.
- Smooth client experience on mid‑range mobile and desktop.
- Observability: metrics and logs for join/leave, concurrency, latency.

## Non‑Goals (v0.1)
- Combat, physics‑heavy mechanics, or world streaming at scale.
- Cross‑instance migration, large maps, or persistence of in‑world props.
- Anti‑cheat beyond server authority and basic abuse/rate limits.

## Experience Outline
1. Player lands on Play → Plaza and sees available instances (or “Quick Join”).
2. Auth/session is minted server‑side; client opens a WebSocket to the game server.
3. Player chooses an owned pal to represent; cosmetics auto‑apply.
4. Movement (WASD/virtual joystick), camera orbit, simple emotes, and proximity chat.
5. Presence UI shows nearby players; nameplate and rarity flair from ownership.
6. Soft limits: 20–30 players per instance; load new instance when full.

## Interaction Set (P0)
- Movement (2.5D/flat plaza) + camera.
- Emotes: wave, cheer, dance (client‑triggered, server‑authorized broadcast).
- Chat: global room text; optional proximity channel for P1.
- Cosmetics: equip a skin/badge from owned cosmetics at join; toggle in UI.
- Safety: profanity filter client + server side; simple rate limits (chat/emotes).

## Performance Targets
- Input‑to‑photon: ≤ 100ms local; tolerate 60–180ms network RTT using interpolation.
- Bandwidth: ≤ 50–100 kbps per client in typical density with interest management.
- Server tick: 20 Hz authoritative state; snapshots at 10–20 Hz + event RPCs.
- CPU/Memory: 30 players/instance on a small shared VM (tune with profiling).

## Eligibility & Gating
- Must have at least one ownership record; dev cookie users allowed in non‑prod.
- Tokenized session: short‑lived HMAC/JWT including userId, exp, and nonce.

## Telemetry & Moderation
- Metrics: joins, time‑in‑instance, avg RTT, snapshot size, disconnect reasons.
- Abuse: flood/rate‑limit counters, mute list, ban list, incident logs.

## Rollout Plan
- P0: Internal dev instances; synthetic load and device test matrix.
- P1: Closed alpha to early owners; daily resets; iterate on smoothing & UX.
- P2: Public beta; scaling plan with autoscaling policies and on‑call.

## Success Criteria
- 95th percentile RTT < 180ms; churn < 20% at 5 minutes; crash rate < 0.5%.
- Positive qualitative feedback on vibe, movement fidelity, and cosmetics.

## Risks & Mitigations
- Net jitter → client buffers + interpolation, state deltas over full snapshots.
- Cheating (speed/chat spam) → server authority + rate limits + mute/ban.
- Asset weight → GLB Draco/KTX2, CDN caching, instancing, shared skeletons.

