# Beta Exit Tonight Checklist

- [x] Remove all user-facing 3D surfaces from home, character, and inventory experiences.
- [x] Redesign character profile page around static art, stats, and battle CTAs.
- [x] Expand roster dataset beyond initial beta set and wire deterministic local asset refs.
- [x] Add multiplayer arena route and client experience for real-time battle proof-of-concept.
- [x] Extend MMO token scope and server protocol to support arena mode and combat events.
- [x] Generate and stage low-quality proof-of-concept assets (character portraits + arena maps + sprites).
- [x] Update docs/copy that still referenced 3D viewer as a user-facing feature.
- [x] Add retention/game-loop upgrades inspired by top competitors (map rotation, mutators, daily missions, match reset target).
- [x] Stabilize quality gates for beta handoff (Vitest boundary fix, claim flow test reliability, build/lint pass).

## Arena Sprite ID Mapping Fix Plan (2026-02-17)

- [x] Confirm why arena avatar rendering falls back to dot despite generated sprite assets existing.
- [x] Patch MMO token/avatar identifier flow so arena clients receive sprite-addressable character IDs.
- [x] Verify multiplayer arena behavior with targeted tests and lint.
- [x] Add review notes with root cause, fix summary, and residual risk.

### Arena Sprite ID Mapping Fix Review (2026-02-17)

- Root cause: arena renderer resolves sprites from `/assets/characters/<characterId>/sprite.png`, but MMO tokens used DB character IDs (UUIDs), so clients requested non-existent sprite paths and rendered the dot fallback.
- `src/app/api/mmo/token/route.ts` now maps owned DB character IDs to avatar slugs (with `artRefs.sprite` fallback parsing) before minting `claims.owned`, so WS sessions broadcast sprite-addressable avatar IDs.
- `server/mmo/plazaServer.ts` snapshots now include `characterId`, and both `src/components/ArenaClient.tsx` and `src/components/PlazaClient.tsx` apply `characterId` updates from state packets plus optimistic local avatar updates on selection.
- Replaced `demo` avatar fallbacks with `neon-city` in arena/plaza clients and MMO server defaults so dev users without ownership still render a real sprite.
- Verification: `npm run test -- server/mmo/__tests__/plazaServer.test.ts` passes (4/4). `npm run lint` passes with pre-existing warnings only.
- Residual risk: existing live WS sessions minted before this change keep old UUID avatar IDs until clients reconnect and receive a new token.

## Review

- Character roster now contains 44 profiles with deterministic art paths under `public/assets/characters/<slug>/`.
- Arena assets are staged under `public/assets/arena/maps/` and `public/assets/arena/sprites/`.
- Arena battle loop now supports movement, pulse cast, HP, eliminations, respawn, server-enforced match end/reset at kill target, map rotation metadata, and active mutators.
- Arena client now renders generated character sprites, selectable map previews, and daily mission progress tracking with UTC reset.
- Image generation had transient rate-limit/moderation failures during batch mode; missing portraits were regenerated individually and staged.
- Verification completed: `npm test` passing (14 tests), `npm run build` passing, `npm run lint` passing with warnings.
- Redis check: missing Upstash environment variables in this workspace; app now fails fast with a clear message and safely falls back where designed.

## Legibility Fix Plan (2026-02-17)

- [x] Audit `/me` page components for white-on-light and low-contrast text/background combinations.
- [x] Refactor `BetaChecklist` styles to match the flat light design system tokens while preserving hierarchy/interaction states.
- [x] Fix adjacent `/me` panels with the same mismatch (`cp-panel` + `text-white`) for consistent readability.
- [x] Verify via `npm run lint` and targeted visual spot-check (screenshot-style review of `/me` mission tracker area).
- [x] Document outcome and residual risks in a new review note below.

### Legibility Fix Review (2026-02-17)

- Mission tracker UI is now readable on light surfaces using `--cp-text-primary`, `--cp-text-secondary`, and `--cp-text-muted` instead of translucent white typography.
- `/me` roster cards and signed-out panel no longer use white text on `cp-panel`; headings, supporting copy, and CTAs now follow light-theme tokens.
- Visual verification captured at `output/me-checklist-after.png` and `output/me-legibility-after.png`.
- `npm run lint` passes; warnings are pre-existing and unrelated to this change.

## Explore Page Cleanup Plan (2026-02-17)

- [x] Compare `/explore` visual language against `/claim` and catalog contrast + motion mismatches.
- [x] Refactor `src/app/explore/ExploreClient.tsx` to use light design tokens and consistent control/card styling.
- [x] Remove or tame noisy transitions/animations on roster and spotlight surfaces.
- [x] Validate with `npm run lint` and a production preview screenshot of `/explore`.
- [x] Add a short review note with what changed and any residual polish opportunities.

### Explore Page Cleanup Review (2026-02-17)

- Replaced dark/translucent `text-white` + `bg-white/*` patterns in explore controls, roster rows, and spotlight panel with light-theme tokens (`--cp-*`) to match claim page styling.
- Removed noisy roster entrance animation definitions from `src/app/globals.css` and kept motion to short hover/focus transitions only.
- Fixed an existing layout issue in `src/app/explore/ExploreClient.tsx` by correcting invalid grid column syntax to `lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]`, restoring desktop two-column layout with sticky spotlight.
- Visual verification captured at `output/explore-cleanup-after-desktop.png` and `output/explore-cleanup-after-mobile.png`.
- `npm run lint` passes; reported warnings are pre-existing and unrelated to this cleanup.

## Dev Chunk Missing Module Fix Plan (2026-02-17)

- [x] Capture root cause and mitigation for `Cannot find module './161.js'` from `.next/server/webpack-runtime.js`.
- [x] Add a guarded dev launcher that blocks duplicate `next dev` processes in this repo.
- [x] Detect broken `.next` server chunk references and auto-clean cache before boot.
- [x] Update npm scripts to use the guarded launcher.
- [x] Verify by starting dev twice and loading `/` without missing chunk errors.

### Dev Chunk Missing Module Fix Review (2026-02-17)

- Root cause confirmed: two concurrent `next dev` processes in the same workspace can race on `.next/server/chunks` and leave stale chunk references, which surfaces as missing `./<id>.js` module errors.
- Added `scripts/dev-guard.mjs` to block duplicate `next dev` sessions by detecting active Next dev processes in this project directory and stopping the second launch with a clear error.
- Added stale chunk guard: if `.next/server/**/*.js` contains static chunk `require()` references to missing files, the guard now removes `.next` before launching dev.
- Updated package scripts (`dev`, `dev:webpack`, `dev:safe`) to route through the guard.
- Verification: `npm run dev` serves `/` with `200`, second `npm run dev` exits with guard message, stale-cache simulation triggers automatic `.next` cleanup, and `npm run build` passes.

## Plaza Recovery Plan (2026-02-17)

- [x] Reproduce the Plaza startup/handshake failure path from local commands.
- [x] Patch MMO server startup command so `npm run mmo:server` runs under current Node/TS settings.
- [x] Verify Plaza server health with targeted MMO tests and direct server launch checks.
- [x] Add a short review note with fix summary and verification evidence.

### Plaza Recovery Review (2026-02-17)

- Root causes fixed:
  - `npm run mmo:server` used a `ts-node` invocation incompatible with this Node/TS setup (`ERR_UNKNOWN_FILE_EXTENSION`).
  - Auto-started Plaza WS inside Next crashed on incoming frames with `TypeError: bufferUtil.unmask is not a function`, causing handshake timeouts.
- MMO server runtime hardening:
  - Added defensive WS payload decoding for string/buffer/typed-array/message-event-like shapes.
  - Switched WS module load to runtime import with `WS_NO_BUFFER_UTIL=1` to avoid broken bundled `bufferutil` path.
  - Added regression test for binary handshake payloads.
- Verification completed:
  - `npm run test -- server/mmo/__tests__/plazaServer.test.ts` (4/4 passing).
  - Isolated startup check: `MMO_WS_PORT=8790 npm run mmo:server` prints listening URL.
  - Browser E2E check (login -> `/plaza`) now reports: `Status: ready — Connected to Signal Plaza`.

## Plaza Token Sync Hotfix Plan (2026-02-17)

- [x] Reproduce `invalid_token` against standalone `npm run mmo:server`.
- [x] Align standalone MMO env loading with Next.js `.env*` behavior.
- [x] Ensure env is loaded before `plazaServer` module-level defaults are evaluated.
- [x] Verify standalone WS auth using a signed token probe.
- [x] Record fix details and residual risk.

### Plaza Token Sync Hotfix Review (2026-02-17)

- Root cause: `server/mmo/server.ts` loaded env after static import of `plazaServer`, but `plazaServer` captures `defaultOptions.secret` at module load. The standalone MMO process could lock to fallback `dev-secret`, causing `invalid_token` against API-minted tokens.
- Fix: `server/mmo/server.ts` now calls `loadEnvConfig(...)` first and dynamically imports `./plazaServer` afterwards.
- Verification: standalone launch on a temp port succeeds and a direct WS auth probe now returns `AUTH_OK` (previously `auth_error: invalid_token`).
- Residual risk: if shell-exported `MMO_WS_SECRET` differs from `.env*`, token auth will fail by design; keep one canonical secret source per environment.

## Plaza Runtime Collision + Me Hooks Hotfix Plan (2026-02-17)

- [x] Reproduce and isolate `EADDRINUSE` collision path while running standalone MMO + Next dev.
- [x] Harden MMO auto-start runtime to skip bind attempts when WS port is already occupied.
- [x] Add a one-command local launcher that starts both processes with safe env (`MMO_AUTO_START=0`).
- [x] Remove `/me` dashboard hook dependency path that triggered `Invalid hook call` in dev runtime.
- [x] Re-verify with MMO tests, lint, build, and local dual-process startup smoke check.

### Plaza Runtime Collision + Me Hooks Hotfix Review (2026-02-17)

- Runtime collision fix:
  - `src/lib/mmo/serverRuntime.ts` now probes bind availability before startup and treats occupied port as external MMO runtime, avoiding repeat bind attempts and noisy crashes.
  - Added `scripts/dev-plaza.mjs` and `npm run dev:plaza` to start `mmo:server` + `dev` together with `MMO_AUTO_START=0`, preventing Next token route from trying to launch a second WS server.
- `/me` hook crash mitigation:
  - `src/app/me/MeDashboard.tsx` was simplified to a hook-free render path and no longer relies on `useState/useEffect/useMemo/useCallback` or `framer-motion` runtime hooks.
  - This removes the failing hook execution path that surfaced as `Invalid hook call` with `Cannot read properties of null (reading 'useState')`.
- Verification:
  - `npm run test -- server/mmo/__tests__/plazaServer.test.ts` passes.
  - `npm run lint` passes (warnings only, pre-existing).
  - `npm run build` passes.
  - `npm run dev:plaza` starts both services cleanly with MMO listening and Next serving `/login`.

## CSS Parse Warnings Hotfix Plan (2026-02-17)

- [x] Map Firefox `layout.css` parse warnings to source declarations.
- [x] Fix invalid Tailwind arbitrary grid track syntax that emitted comma-separated `grid-template-columns`.
- [x] Remove accidental class token extraction that generated invalid `dev: plaza` declaration.
- [x] Rebuild and confirm generated CSS no longer contains invalid declarations.

### CSS Parse Warnings Hotfix Review (2026-02-17)

- Root causes:
  - `src/app/play/battle/page.tsx` used a comma-separated arbitrary grid column declaration, which compiled to invalid comma-separated tracks.
  - `scripts/dev-plaza.mjs` log tags used a bracketed `dev:plaza` token; Tailwind content scan interpreted it as an arbitrary utility and emitted an invalid `dev: plaza` declaration.
- Fixes:
  - Replaced the battle layout class with underscore-separated arbitrary tracks (space-separated CSS tracks when compiled).
  - Replaced bracketed log tags with plain text (`dev:plaza ...`) to avoid class extraction.
- Verification:
  - `npm run build` passes.
  - Generated CSS no longer contains `dev: plaza`.
  - Generated CSS contains `minmax(0,1fr) minmax(0,280px) minmax(0,1fr)` and no comma-separated version.

## Landing Character Art + Inactive Cleanup Plan (2026-02-17)

- [x] Reproduce and isolate why landing roster cards show no character artwork.
- [x] Patch landing roster card rendering to display resolved art refs with safe fallback behavior.
- [x] Filter landing roster payload so inactive legacy characters are excluded from this section.
- [x] Add deterministic Blaze the Dragon art fallback to prevent blank/placeholder-only rendering.
- [x] Verify with lint and a focused local roster data check; document review notes.

### Landing Character Art + Inactive Cleanup Review (2026-02-17)

- Root causes:
  - `src/components/landing/HorizontalCharacterShowcase.tsx` rendered text-only cards (no media layer), so character art could never appear.
  - Redis roster data includes legacy/inactive animal entries intermixed with active lore entries; landing page previously pulled first 8 rows raw by order.
  - Legacy rows used placeholder-only art refs, including `Blaze the Dragon`.
- Fixes:
  - Added resolved art rendering with ordered candidate fallback logic in `src/components/landing/HorizontalCharacterShowcase.tsx`.
  - Updated `src/app/page.tsx` to build a curated landing roster: active lore-backed entries only, plus explicit Blaze retention, deduped and capped to 8.
  - Enhanced `src/lib/characterLore.ts` to match lore by character name and provide a deterministic Blaze fallback art slug (`volcanic-lab`) when placeholder refs are detected.
- Verification:
  - `npm run lint` passes (warnings only, pre-existing).
  - `curl -s http://localhost:3000` content check confirms inactive names like `Frost Wolf` no longer appear in landing output.
  - Same output contains Blaze fallback art paths (`/assets/characters/volcanic-lab/portrait.png`, `/assets/characters/volcanic-lab/thumb.png`) and no `card-placeholder.svg` usage for showcased landing cards.
