# Beta Exit Tonight Checklist

## Backend Efficiency Analysis Plan (2026-03-11)

- [x] Inventory backend entry points, storage abstractions, and runtime boundaries.
- [x] Inspect hot API paths for avoidable Redis round trips, serialization churn, and synchronous auth/session overhead.
- [x] Inspect server-rendered read paths for N+1 queries and unnecessary dynamic rendering.
- [x] Rank strategic backend improvements by expected latency/throughput impact and implementation scope.
- [x] Document review findings with concrete file references and expected payoff.

### Backend Efficiency Analysis Review (2026-03-11)

- Highest-impact bottlenecks are hot write paths that do synchronous Redis read-modify-write cycles: runner progress (`src/app/api/score/progress/route.ts`, `src/lib/scoreSession.ts`) and arena daily progress (`src/lib/arenaProgressStore.ts`, `server/mmo/plazaServer.ts`).
- MMO token minting is heavier than it should be because it combines rate limiting, session lookup, user lookup, ownership/avatar derivation, and optional plaza startup on the connect path (`src/app/api/mmo/token/route.ts`, `src/lib/repoRedis.ts`, `src/lib/mmo/serverRuntime.ts`).
- Public/server-rendered read paths are also doing unnecessary backend work:
  - `/` and `/explore` are forced dynamic while doing optional ownership reads for personalization (`src/app/page.tsx`, `src/app/explore/page.tsx`).
  - `/u/[handle]` duplicates the user lookup in metadata + page render and does per-ownership character fetches (`src/app/u/[handle]/page.tsx`).
- Claim and redeem flows are less frequent but still pay avoidable Upstash REST round trips; challenge records also do not truly expire despite the route comments saying they have a 5-minute TTL (`src/app/api/claim/start/route.ts`, `src/lib/repoRedis.ts`, `src/app/api/redeem/route.ts`).
- Strategic priority order:
  1. Make hot counters atomic and field-based instead of JSON read-modify-write.
  2. Remove repeated auth/user/profile lookups from hot submission/connect paths.
  3. Precompute and store ownership/avatar projections so connect/profile paths stop scanning full ownership lists.
  4. Restore caching/ISR for mostly-public pages by separating personalization from page render.
  5. Collapse claim/redeem flows into fewer Redis operations and enforce real TTL semantics.

## Backend Efficiency Implementation Plan (2026-03-11)

- [x] Convert score attempt progress persistence to atomic Redis field updates and trim repeated request-path work.
- [x] Convert arena daily progress storage to atomic counters and keep MMO event writes cheap.
- [x] Materialize owned avatar ids in Redis so MMO token minting avoids full ownership scans.
- [x] Remove avoidable repo/session work from score submit and analytics ingestion hot paths.
- [x] Reduce backend page load by restoring caching/ISR for public roster pages and fixing server-side N+1 reads.
- [x] Add or update targeted tests for the new persistence and inventory behavior.
- [x] Run verification (`npm test`, `npm run lint`, `npm run build`) and record the review.

### Backend Efficiency Implementation Review (2026-03-11)

- Score hot path:
  - `src/lib/scoreSession.ts` now stores attempt records as Redis hashes, updates runner progress via one atomic Lua script, and carries `displayName` inside the signed score session token.
  - `src/app/api/score/progress/route.ts` and `src/app/api/score/route.ts` no longer re-load the NextAuth session on every progress/submit call; they trust the short-lived signed score token.
- Arena/MMO hot path:
  - `src/lib/arenaProgressStore.ts` now uses date-scoped Redis hash counters with atomic script updates instead of JSON read-modify-write.
  - `src/lib/repoRedis.ts` now materializes owned avatar ids as a first-class Redis set during claim, and `src/app/api/mmo/token/route.ts` no longer performs a redundant user lookup before minting the MMO token.
- Public read path:
  - Added `src/app/api/me/owned-character-ids/route.ts` plus `src/lib/useOwnedCharacterIds.ts` so `/` and `/explore` can render from cached/public data and fetch ownership overlays client-side.
  - `src/app/page.tsx` and `src/app/explore/page.tsx` now use cached roster reads via `src/lib/cachedCharacters.ts`.
  - `src/app/u/[handle]/page.tsx` now dedupes the metadata user lookup with `cache(...)` and replaces per-ownership character fetches with one bulk fetch plus reconstruction.
- Claim/redeem/auth cleanup:
  - `src/lib/repoRedis.ts` now stores challenges as per-key TTL entries and deletes them atomically during claim completion.
  - `src/app/api/redeem/route.ts` no longer waits on best-effort redemption logging before returning success.
  - `src/app/api/dev/login/route.ts` is now rate-limited, and `src/lib/repoRedis.ts` avoids rewriting unchanged dev users on every login.
- Verification:
  - `npm test` passes: 41/41 tests.
  - `npm run lint` passes with pre-existing `no-explicit-any` warnings only.
  - `npm run build` passes.
  - Build output now shows `/` and `/explore` prerendered as static content.

## Backend Efficiency Follow-up Plan (2026-03-11)

- [x] Collapse leaderboard submit/trim into a single atomic Redis script and remove extra round trips.
- [x] Collapse claim start into one Redis-backed availability + challenge creation step.
- [x] Reduce claim complete pre-read overhead where possible without weakening validation.
- [x] Add or update targeted tests for leaderboard and claim flow persistence changes.
- [x] Re-run verification and document the review.

### Backend Efficiency Follow-up Review (2026-03-11)

- Leaderboard write path:
  - `src/lib/leaderboard.ts` now handles compare-existing, write, expire, and trim-overflow in one Redis `EVAL`, eliminating the previous `HGET` + pipeline + `ZCARD/ZRANGE/ZREM/HDEL` round-trip chain.
  - Added `src/lib/leaderboard.redis.test.ts` to cover Redis-path behavior, including concurrent best-score retention and overflow trimming.
- Claim flow:
  - `src/lib/repo.ts`, `src/lib/repoRedis.ts`, and `src/lib/repoMemory.ts` now support `startClaimChallenge(...)` and richer challenge metadata (`unitId`, `secureSalt`) so `src/app/api/claim/start/route.ts` can create an availability-checked challenge in one repo step.
  - `src/app/api/claim/complete/route.ts` now uses challenge-carried unit metadata to avoid a redundant pre-claim unit fetch for new challenges while preserving server-side digest recomputation and atomic final claim.
  - `src/lib/repoRedis.ts` now resolves `findUnitByCodeHash(...)` in one Redis `EVAL` instead of two separate hash reads.
- Additional read-path reductions:
  - `src/lib/repoRedis.ts` now materializes owned character ids as a first-class Redis set, and `src/app/api/me/owned-character-ids/route.ts` uses that projection instead of rebuilding the response from the full ownership list.
  - `src/lib/repoRedis.ts` and `src/lib/repoMemory.ts` now expose a one-call claim verify preview, and `src/app/api/claim/verify/route.ts` uses it when available to collapse unit+character lookup into one repo read.
  - `src/lib/repoRedis.ts` and `src/lib/repoMemory.ts` now expose hydrated ownership+character reads so `src/app/me/page.tsx` and `src/app/u/[handle]/page.tsx` can fetch owned roster data in one repo call instead of composing ownership and character reads in the page layer.
  - `src/lib/repoRedis.ts` now resolves `getUserByHandle(...)` in one Redis call instead of `HGET` then `HGET`.
- Final claim/identifier reductions:
  - `src/lib/crypto/index.ts`, `src/app/api/claim/start/route.ts`, `src/app/api/claim/complete/route.ts`, and `src/app/claim/ClaimPageClient.tsx` now use a signed opaque challenge token so claim completion can validate locally and skip the route-level challenge fetch while still relying on the atomic claim script for one-time use.
  - `src/lib/repoRedis.ts`, `src/lib/repoMemory.ts`, `src/lib/repo.ts`, and `src/lib/characterLookup.ts` now support repo-level character identifier resolution so `/character/[id]` and the character API can avoid the old serial id/slug/name/series lookup chain.
- Verification:
  - `npm test` passes: 46/46 tests.
  - `npm run lint` passes with the same pre-existing `no-explicit-any` warnings.
  - `npm run build` passes.

## Global Impeccable Skill Install Plan (2026-03-09)

- [x] Confirm whether the request is app integration or Codex skill installation.
- [x] Install `pbakaus/impeccable` globally for Codex rather than in this repo.
- [x] Verify the skill files exist under the global Codex skills directory.
- [x] Document the result and any follow-up needed.

### Global Impeccable Skill Install Review (2026-03-09)

- Installed with `npx skills add pbakaus/impeccable -g -a codex -y`.
- The installer registered 18 universal Codex skills under `/Users/macbookpro/.agents/skills/`, including `teach-impeccable`.
- Verification:
  - Global skill directories exist under `/Users/macbookpro/.agents/skills/`.
  - `/Users/macbookpro/.agents/skills/teach-impeccable/SKILL.md` is present and readable.
- Follow-up:
  - Restart Codex to ensure the new global skills are loaded in fresh sessions.
  - The package also installed its own global `frontend-design` skill, which may take precedence over another skill with the same name.

## Frontend Design Skill Cleanup Plan (2026-03-09)

- [x] Locate both the legacy and newly installed `frontend-design` skill directories.
- [x] Remove the legacy Codex-local `frontend-design` skill copy.
- [x] Verify only the impeccable-installed `frontend-design` skill remains.
- [x] Document the cleanup result.

### Frontend Design Skill Cleanup Review (2026-03-09)

- The legacy active path `/Users/macbookpro/.codex/skills/frontend-design` was disabled by renaming it to `/Users/macbookpro/.codex/skills/frontend-design.disabled-20260309`.
- Exact-name verification now shows no active `frontend-design` skill under `/Users/macbookpro/.codex/skills/`.
- The only active `frontend-design` skill now resolves from `/Users/macbookpro/.agents/skills/frontend-design`, which is the impeccable-installed version.
- Follow-up:
  - Restart Codex so skill discovery refreshes against the updated global paths.

## Legacy Character Recovery Plan (2026-02-17)

- [x] Confirm root causes for `Character Not Found` on the reported roster names.
- [x] Add lore + deterministic art mappings for: Shadow Mantis, Storm Leviathan, Tidal Serpent, Aero Falcon, Aurora Stag, Frost Wolf, Vine Warden, Volt Lynx, Crystal Nymph, Quartz Sentinel, Terra Golem.
- [x] Patch character profile resolution to support both DB id and slug identifiers.
- [x] Ensure profile links use identifiers that always resolve.
- [x] Verify with lint and targeted route checks.
- [x] Document a review note with what changed and residual risks.

### Legacy Character Recovery Review (2026-02-17)

- Root causes:
  - Legacy characters still existed in persisted datasets, but they were no longer present in `src/data/characterLore.ts`, so UI fallback lore/art mapping could not enrich them.
  - `src/app/compare/CompareClient.tsx` generated slug-based profile URLs while `src/app/character/[id]/page.tsx` only resolved strict DB IDs.
- Fixes:
  - Added lore entries for all requested legacy names in `src/data/characterLore.ts` with deterministic non-placeholder art refs mapped to existing staged character art sets.
  - Added `src/lib/characterLookup.ts` and switched character page/API routes to resolve identifiers by ID, slug, name slug, and lore fallback.
  - Updated compare profile links to use DB IDs (`/character/${character.id}`) to avoid slug-only routing mismatches.
  - Increased roster fetch caps on compare/explore pages so expanded rosters remain visible.
- Verification:
  - `npm run test -- src/lib/characterLookup.test.ts` passes (4 tests).
  - `npm run lint` passes (warnings only, pre-existing).
  - `npm run build` passes.
- Residual risk:
  - Legacy entries currently reuse curated art packs from related active realms (deterministic and non-placeholder) rather than bespoke one-off generated art per character.

## Legacy Character Dedicated Art Plan (2026-02-17)

- [x] Generate dedicated portrait art for each restored legacy character using the image generation workflow.
- [x] Publish full per-character asset packs under `public/assets/characters/<slug>/` with required files (`signature`, `thumb`, `card`, `portrait`, `banner`, `sprite`).
- [x] Repoint legacy lore mappings so each character resolves to its own slug folder (no shared fallback packs).
- [x] Re-run targeted tests and production build verification.
- [x] Document outcomes and any remaining risk.

### Legacy Character Dedicated Art Review (2026-02-17)

- Generated 11 dedicated portrait sources with `$imagegen` batch flow into `output/imagegen/legacy-characters/raw/`.
- Created full asset packs for each slug:
  - `shadow-mantis`, `storm-leviathan`, `tidal-serpent`, `aero-falcon`, `aurora-stag`, `frost-wolf`, `vine-warden`, `volt-lynx`, `crystal-nymph`, `quartz-sentinel`, `terra-golem`.
- Updated `src/data/characterLore.ts` legacy entries to use direct slug art refs (for example `artRefsFor('shadow-mantis')`) instead of shared pack aliases.
- Verification:
  - `npm run test -- src/lib/characterLookup.test.ts` passes (4 tests).
  - `npm run build` passes.
- Residual risk:
  - Derived assets (`thumb`, `card`, `banner`, `sprite`) are currently generated from each portrait source via deterministic resizing/cropping; if you want stylistically distinct per-file variants, run an additional image pass per asset type.

- [x] Remove all user-facing 3D surfaces from home, character, and inventory experiences.
- [x] Redesign character profile page around static art, stats, and battle CTAs.
- [x] Expand roster dataset beyond initial beta set and wire deterministic local asset refs.
- [x] Add multiplayer arena route and client experience for real-time battle proof-of-concept.
- [x] Extend MMO token scope and server protocol to support arena mode and combat events.
- [x] Generate and stage low-quality proof-of-concept assets (character portraits + arena maps + sprites).
- [x] Update docs/copy that still referenced 3D viewer as a user-facing feature.
- [x] Add retention/game-loop upgrades inspired by top competitors (map rotation, mutators, daily missions, match reset target).
- [x] Stabilize quality gates for beta handoff (Vitest boundary fix, claim flow test reliability, build/lint pass).
## Battle Review Plan (2026-02-17)

- [x] Inspect `src/components/play/BattlePhaserGame.tsx` for correctness issues around end-state transitions, API hooks, and testing hooks.
- [x] Inspect `src/app/play/battle/page.tsx` for runtime bugs, memory leaks, and gameplay logic flaws.
- [x] Summarize findings with severity, reproduction notes, and suggested fixes.

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

## Fiber Optic Background Audit Plan (2026-02-18)

- [x] Audit `src/components/champion/FiberOpticBackground.tsx` for runtime bugs, animation edge cases, and browser compatibility gaps.
- [x] Audit `src/app/character/[id]/CharacterPageClient.tsx` integration behavior for env-gating, hydration safety, and reduced-motion handling.
- [x] Implement minimal, elegant fixes for any confirmed defects without broad UI refactors.
- [x] Verify with `npm run lint` and `npm run build`.
- [x] Document findings and residual risk in a review note.

## Runtime Audit Request (2026-02-18)

- [x] Inspect `/src/components/champion/FiberOpticBackground.tsx` for runtime bugs/edge cases introduced by the fiber optic background integration.
- [x] Inspect `/src/app/character/[id]/CharacterPageClient.tsx` for any integration regressions, reduced-motion gating, or hydration issues related to the new background.
- [ ] Summarize confirmed defects with file/line references, severity, and reproduction or reasoning.
- [ ] Capture verification status or residual risk in this review note.

### Fiber Optic Background Audit Review (2026-02-18)

- Findings and fixes:
  - `src/components/champion/FiberOpticBackground.tsx` previously created one `prefers-reduced-motion` listener per `FiberStrand` layer, multiplying subscriptions across all strands. Reduced-motion state is now resolved once at wrapper level and passed down.
  - Media-query change handling used only `addEventListener('change', ...)`; added compatibility fallback to `addListener/removeListener` for browsers that still expose the legacy API.
  - Fiber animation `dashOffset` was unbounded over time; offset now wraps in `[-1, 0]` to avoid long-session float drift.
  - When reduced motion is enabled, line materials now reset to deterministic static values and the canvas `frameloop` switches to `demand` so animation fully stops.
  - Line `resolution` now clamps to at least `1x1` to avoid invalid zero-dimension values during transient layout states.
  - Added WebGL capability guard and a local canvas error boundary so unsupported/broken WebGL environments degrade to no-3D instead of crashing the character route.
  - `src/app/character/[id]/CharacterPageClient.tsx` now parses `NEXT_PUBLIC_DISABLE_3D` explicitly (`1|true|yes|on`) instead of treating any non-empty string as disable-on.
  - Dynamic import for the fiber background now has a no-op fallback (`loading: null` + rejected import recovery) so chunk-load failures do not take down the page.
- Verification:
  - `npm run lint` passes (pre-existing unrelated warnings remain).
  - `npm run build` passes.
- Residual risk:
  - Fiber curve generation remains intentionally non-deterministic per mount (`Math.random`), so strand paths change between full remounts by design.
- [x] Verify with lint and a focused local roster data check; document review notes.

### Landing Character Art + Inactive Cleanup Review (2026-02-17)

- Root causes:
  - `src/components/landing/HorizontalCharacterShowcase.tsx` rendered text-only cards (no media layer), so character art could never appear.
  - Redis roster data includes legacy/inactive animal entries intermixed with active lore entries; landing page previously pulled first 8 rows raw by order.
  - Legacy rows used placeholder-only art refs, including `Blaze the Dragon`.

## Impeccable Install Plan (2026-03-09)

- [ ] Confirm the supported install flow for Codex in this repo.
- [ ] Install `pbakaus/impeccable` at the project level.
- [ ] Verify the generated skill directories/files are present and relevant to Codex.
- [ ] Document results and any follow-up in a review note.

## Repository Analysis Plan (2026-03-06)

- [x] Review project guidance, historical task notes, and current orchestrator context.
- [x] Inspect the main app routes, landing/claim/play/profile flows, and shared layout/navigation.
- [x] Inspect repository, auth, API, MMO, and config/runtime layers.
- [x] Verify the current quality gates and note any drift or failures.
- [x] Summarize the biggest gaps and a strategic ladder for continuous improvement.

### Repository Analysis Review (2026-03-06)

- Verification:
  - `npm test` passes (`9` files, `31` tests).
  - `npm run lint` passes with existing `no-explicit-any` warnings.
  - `npm run build` passes locally.
  - `npm run e2e` does not complete; Playwright times out waiting for its configured web server bootstrap.
- Biggest gaps:
  - Product narrative and IA drift: the landing page, README, and beta surfaces promise a broader, more mature product than the shipped flows actually support.
  - No real measurement loop: analytics are documented but not implemented, so funnel and retention work is guesswork.
  - Competitive/progression integrity is weak: score submission, some progression state, and daily mission tracking still trust the client too much.
  - Production runtime mode is inconsistent: some persistence paths silently fall back to memory while other routes hard-require Redis.
  - Auth is still a beta gate rather than a durable identity system, with dev-oriented escape hatches and weak secret discipline.
  - Realtime/gameplay architecture is still POC-grade: single-process in-memory state, shallow rooming, weak reconnect/resume semantics, and limited observability.
  - Quality protection is thin: narrow browser coverage, stale docs/config claims, no CI workflow, and fragile E2E startup.
- Recommended ladder:
  - 1. Tighten the product wedge and make marketing/copy match reality.
  - 2. Instrument the core funnel and add operational telemetry.
  - 3. Make production config deterministic and remove silent fallback behavior.
  - 4. Harden auth, secrets, score integrity, and redeem/rate-limit paths.
  - 5. Pick one flagship gameplay loop and deepen it with durable progression.
  - 6. Rebuild the safety net: CI, stronger integration/E2E coverage, and release smoke checks.

## Continuous Improvement Implementation Plan (2026-03-06)

- [x] Add SEO/shareability foundations across the App Router (`metadata`, `robots`, `sitemap`, `manifest`, character metadata).
- [x] Add lightweight first-party analytics for the main funnel and instrument key user actions.
- [x] Remove obvious trust/privacy issues and tighten a few user-facing UX/accessibility edges.
- [x] Repair Playwright startup drift and stale selectors so browser tests are usable again.
- [x] Verify with targeted tests, lint, build, and E2E where feasible.

### Continuous Improvement Implementation Review (2026-03-06)

- SEO/shareability:
  - Added a central site URL helper plus richer root metadata in `src/app/layout.tsx`.
  - Added `robots`, `sitemap`, and `manifest` routes.
  - Added route metadata for home, claim, explore, me, login/play/arena/plaza layouts, support/privacy, dynamic character pages, and public profiles.
- Analytics:
  - Added a first-party analytics ingestion route at `src/app/api/analytics/event/route.ts`.
  - Added lightweight client tracking helpers and a global page-view tracker.
  - Instrumented key funnel actions on home CTAs, login submit/success/failure, claim verify/complete/error, and runner score submission.
- Trust/privacy/UX:
  - Removed public email exposure from `/u/[handle]`.
  - Replaced dead footer placeholder links with real routes/contact paths.
  - Added basic support and privacy pages.
  - Tightened a few accessibility edges (`aria-label`s on explore controls and nav labeling).
- Browser safety net:
  - Switched Playwright web-server bootstrap to `next start` after build, with a more realistic timeout.
  - Rewrote the home spec around current UI selectors and fixed explore spotlight assertions to target visible content.
- Verification:
  - `npm run lint` passes with pre-existing warnings only.
  - `npm test` passes (`9` files, `31` tests).
  - `npm run build` passes.
  - `npm run e2e` passes (`18` tests).

## Progression Integrity Plan (2026-03-06)

- [x] Make runner leaderboards track-aware instead of mixing different songs into one board.
- [x] Bind leaderboard entries to authenticated users and only keep each user’s best daily run per board.
- [x] Move arena daily mission progress from browser-local storage to account-backed persistence.
- [x] Verify with targeted tests plus full lint, test, build, and e2e runs.

## Arena Authority Plan (2026-03-06)

- [x] Move arena mission credit off the client mutation API and onto server-observed WebSocket gameplay events.
- [x] Make match credit deduplicate per user per arena round so reconnects cannot farm daily progress.
- [x] Update the arena client/UI to stop mutating progress directly and only reflect server-derived progress.
- [x] Add targeted regression tests for authoritative arena progress attribution.
- [x] Verify with full lint, test, build, and e2e runs.

## Runner Attempt Tracking Plan (2026-03-06)

- [x] Persist server-side runner attempt records when score sessions are issued.
- [x] Accept runner progress checkpoints during a run and use them to validate final submissions.
- [x] Update the runner client to report checkpoint progress and flush a final checkpoint before score submission.
- [x] Add unit coverage for runner attempt lifecycle and validation helpers.
- [x] Verify inside the full lint, test, build, and e2e sweep.

### Progression Integrity Review (2026-03-06)

- Leaderboard integrity:
  - Updated `src/lib/leaderboard.ts` so runner boards are scoped per track, entries are bound to authenticated users, and each user only retains their best daily result for a given board.
  - Updated `src/app/api/score/route.ts` to stop trusting client-supplied leaderboard names and derive display names from authenticated user identity instead.
  - Wired the runner UI in `src/app/play/runner/RunnerClient.tsx`, `src/components/Runner.tsx`, and `src/components/TopRuns.tsx` so the leaderboard follows the currently selected track.
- Arena progression sync:
  - Added account-backed arena mission persistence in `src/lib/arenaProgressStore.ts` and `src/app/api/arena/daily-progress/route.ts`.
  - Aligned `src/components/ArenaClient.tsx` with the new server-backed mission path and added rollover handling so daily progress resets cleanly at the arena reset boundary.
- Mobile Explore reliability:
  - Simplified the mobile roster interaction in `src/app/explore/ExploreClient.tsx` so tappable roster rows are not competing with nested action buttons.
  - Hardened `e2e/explore.responsive.spec.ts` to wait for DOM readiness rather than full image-load completion, which was brittle on WebKit.
- Verification:
  - `npm test` passes (41 tests).
  - `npm run lint` passes (warnings only, pre-existing).
  - `npm run build` passes.
  - `npm run e2e` passes (18/18).
- Residual risk:
  - Leaderboards are materially more trustworthy, but full anti-cheat still requires server-authoritative gameplay state instead of score validation alone.

### Arena Authority Review (2026-03-06)

- Arena progression authority:
  - `server/mmo/plazaServer.ts` now records pulse, elimination, and match mission credit from authoritative arena WebSocket events instead of trusting browser POSTs.
  - Added `server/mmo/arenaMatchTracker.ts` so reconnecting users only count once per arena round before the next match reset.
  - `src/app/api/arena/daily-progress/route.ts` is now read-only; client mutation is explicitly rejected.
- Arena client:
  - `src/components/ArenaClient.tsx` no longer POSTs pulse/elimination/match events and instead reflects server-derived progress with optimistic UI only for server-issued combat/score events plus sync fetches on join/match-end.
- Verification:
  - Added regression coverage in `server/mmo/__tests__/arenaMatchTracker.test.ts` and `server/mmo/__tests__/plazaServer.test.ts`.

### Runner Attempt Tracking Review (2026-03-06)

- Runner score integrity:
  - `src/lib/scoreSession.ts` now persists server-side attempt records, derives track-specific minimum submit timing, and validates final submissions against recorded checkpoint progress.
  - Added `src/app/api/score/progress/route.ts` for authenticated runner checkpoint updates during a live run.
  - `src/app/api/score/session/route.ts` now creates attempt records when a runner session is issued, and `src/app/api/score/route.ts` now rejects high-score submissions that do not have enough tracked run progress.
- Runner client:
  - `src/components/Runner.tsx` now emits debounced checkpoint progress and a forced final checkpoint on run end.
  - `src/app/play/runner/RunnerClient.tsx` now reports those checkpoints and flushes the final checkpoint before score submission.
- Verification:
  - Added unit coverage in `src/lib/scoreSession.test.ts`.

## Runtime Hardening Plan (2026-03-06)

- [x] Make runtime mode deterministic across repo modules and remove unsafe production fallbacks.
- [x] Harden auth and secret handling so production does not inherit dev-oriented behavior.
- [x] Improve health/readiness visibility and add baseline CI.
- [x] Tighten score submission integrity beyond raw client-trusted POSTs.
- [x] Verify with lint, tests, build, and any targeted new checks.

### Runtime Hardening Review (2026-03-06)

- Runtime/config:
  - Added `src/lib/runtime.ts` to centralize environment detection, runtime diagnostics, and production-safe persistence rules.
  - Updated repo-backed modules (`src/lib/repo.ts`, `src/lib/rateLimit.ts`, `src/lib/leaderboard.ts`, `src/lib/betaChecklistStore.ts`, `src/lib/analyticsStore.ts`) so production no longer silently drops to in-memory stores.
- Auth/secrets:
  - Hardened `src/lib/auth.ts`, `src/lib/serverSession.ts`, and `src/lib/mmo/token.ts` so production fails closed at runtime instead of inheriting dev fallback secrets or anonymous session behavior.
  - Locked down dev-only auth helpers in `src/app/api/dev/login/route.ts` and `src/app/api/dev/user/route.ts` to non-production usage with `httpOnly` cookies.
- Operational visibility:
  - Expanded `src/app/api/health/route.ts` and `src/app/api/status/route.ts` to report degraded runtime/repo/redis states with proper `503` behavior.
  - Added baseline GitHub Actions verification in `.github/workflows/ci.yml`.
  - Removed `eslint.ignoreDuringBuilds` from `next.config.js` so release builds and CI use the same lint gate.
- Score integrity:
  - Added signed, short-lived, one-time score sessions in `src/lib/scoreSession.ts` and `src/app/api/score/session/route.ts`.
  - Updated `src/app/api/score/route.ts`, `src/app/play/runner/RunnerClient.tsx`, and `src/components/Runner.tsx` so runner submissions require a server-issued session token and stay within track-derived score ceilings.
- Verification:
  - `npm run lint` passes (warnings only, pre-existing).
  - `npm test` passes (33 tests).
  - `npm run build` passes.
  - `npm run e2e` passes (18/18).
- Residual risk:
  - MMO/plaza transport is still a single-runtime prototype and not horizontally scalable.
  - Score validation is now materially stronger, but fully authoritative gameplay would still require more server-side simulation than this pass introduced.

## MMO Hosted WS Runtime Fix Plan (2026-02-17)

- [x] Add shared WS URL resolver helpers so server and client paths resolve base URLs consistently.
- [x] Patch MMO token API to accept server-side `MMO_WS_URL` config, keep local auto-start behavior, and return resolved `wsBase`.
- [x] Update Plaza and Arena clients to prefer token-response `wsBase` and only then use local/public fallbacks.
- [x] Update env/docs guidance and verify with targeted tests, lint, and production build.

### MMO Hosted WS Runtime Fix Review (2026-02-17)

- Root cause:
  - Hosted token API gating in `src/app/api/mmo/token/route.ts` only considered `NEXT_PUBLIC_MMO_WS_URL`; if unset, it returned `plaza_unconfigured`.
  - Plaza/Arena clients only read `NEXT_PUBLIC_MMO_WS_URL` (build-time public env) plus localhost fallback, so hosted deployments without that build-time value could never connect.
- Fixes:
  - Added shared resolver utilities in `src/lib/mmo/wsUrl.ts` for configured URLs, local fallback URLs, and consistent normalization.
  - `src/app/api/mmo/token/route.ts` now treats `MMO_WS_URL` (server env) or `NEXT_PUBLIC_MMO_WS_URL` as valid hosted config and returns `wsBase` in token responses.
  - `src/components/PlazaClient.tsx` and `src/components/ArenaClient.tsx` now prefer `body.wsBase` from `/api/mmo/token`, with existing local fallback retained.
  - Added regression tests in `src/lib/mmo/wsUrl.test.ts`.
  - Documented hosted config in `.env.example` and `README.md`.
- Verification:
  - `npm run test -- src/lib/mmo/wsUrl.test.ts server/mmo/__tests__/plazaServer.test.ts` passes (10/10 tests).
  - `npm run lint` passes with pre-existing warnings only.
  - `npm run build` passes.
- Residual risk:
  - Hosted deployments still require an external WS endpoint; this fix removes the build-time env coupling but cannot provide a WS server on Vercel by itself.

## Play Battle Rebuild Plan (2026-02-17)

- [x] Audit the current `/play/battle` UI issues and define a replacement game loop focused on readability + fun.
- [x] Rebuild `src/app/play/battle/page.tsx` into a canvas-driven game with explicit controls and higher-contrast UI.
- [x] Add deterministic automation hooks (`window.render_game_to_text`, `window.advanceTime`) and fullscreen toggle support (`f` / `Esc`).
- [x] Validate gameplay and controls with the `$develop-web-game` Playwright client using action bursts and screenshot/state inspection.
- [x] Run project checks (`npm run lint`) and document a review summary with outcomes and residual risks.

### Play Battle Rebuild Review (2026-02-17)

- Replaced the previous low-contrast stat-card battle screen with a new single-canvas arcade loop (`Rift Pulse Rush`) in `src/app/play/battle/page.tsx`.
- Legibility fixes:
  - High-contrast side HUD (`bg-slate-900/950`, bright text) with clear button hierarchy and disabled states.
  - Removed white-on-light button/text combinations that made controls unreadable.
  - Verified control readability in sidebar capture (`output/web-game-battle-sidebar.png` equivalent capture via Playwright MCP).
- Gameplay upgrades:
  - Added movement, pulse shot, dash, shield, pause/resume, restart, wave escalation, enemy types, combo scoring, shard pickups, and timed win/lose transitions.
  - Added menu, live, pause, gameover, and victory presentation states.
- Deterministic test hooks:
  - `window.render_game_to_text()` now exports concise JSON game state with coordinate-system note.
  - `window.advanceTime(ms)` now steps the simulation deterministically for automation.
  - Fullscreen toggle supports `f` and browser `Esc`.
- Verification:
  - `npm run lint` passes (warnings are pre-existing and unrelated).
  - `$develop-web-game` Playwright client runs captured gameplay screenshots + state snapshots with no new game-loop console errors:
    - `output/web-game-battle-1/`
    - `output/web-game-battle-2/`
  - Additional control-sequence validation via Playwright MCP confirmed:
    - Dash cooldown engages (`dashCooldown > 0` after `E`).
    - Shield activation consumes shield and sets active timer (`Shift`).
    - Pause/resume transitions (`P`) update `mode` correctly.
    - Restart resets score/time/health.
    - Both defeat and victory end states are reachable and reflected in `render_game_to_text`.
- Residual risk:
  - Existing repo-level Next runtime issue causes occasional unrelated `500` resource console noise in manual browser sessions (`/favicon.ico` and route prefetch chunk requests); this is pre-existing and outside `battle` gameplay logic.

## Play Battle Phaser Upgrade Plan (2026-02-17)

- [x] Research a production-compatible browser game library that fits Next.js App Router constraints.
- [x] Replace the prior canvas implementation with a Phaser scene architecture that supports richer combat and clean UI controls.
- [x] Expose deterministic automation hooks (`window.render_game_to_text`, `window.advanceTime`) and resilient control APIs for scripted verification.
- [x] Validate controls/state transitions with `$develop-web-game` action bursts plus Playwright deterministic checks.
- [x] Run lint/build gates and document fixes for discovered regressions.

### Play Battle Phaser Upgrade Review (2026-02-17)

- Library choice:
  - Selected Phaser 3 (`phaser@3.90.0`) because official docs and templates explicitly support browser-first game loops and Next.js integration patterns.
  - Integrated via client-only dynamic import in `src/app/play/battle/page.tsx` to avoid SSR/hydration issues.
- Implementation:
  - Added `src/components/play/BattlePhaserGame.tsx` with a scene-driven combat loop, enemy archetypes, boss cadence, XP upgrades, abilities (dash/nova/shield), improved HUD readability, and robust run-state transitions.
  - Added button-level ability controls (`#dash-btn`, `#nova-btn`, `#shield-btn`) and start fallback queueing when scene boot is still in-flight.
- Regression fix from review:
  - Fixed Phaser boot `useEffect` dependency bug that could recreate the game instance whenever best score changed by switching scene HUD reads to refs (`bestScoreRef`) instead of closing over React score state.
  - Pause button is no longer blocked by stale disabled-state rendering; scene runtime now enforces pause validity.
- Verification:
  - `npm run lint -- --file src/components/play/BattlePhaserGame.tsx --file src/app/play/battle/page.tsx` passes with zero warnings/errors.
  - `npm run build` passes.
  - `$develop-web-game` Playwright client run completed against `/play/battle` with new artifacts under `output/web-game/` (`state-*.json`, `shot-*.png`), and visual inspection confirms gameplay rendering.
  - Deterministic Playwright evaluation confirmed run continuity after score growth (no boot-loop reset): mode remains `playing` while score/time advance.
- Residual risk:
  - Dev-runtime noise (`/favicon.ico` 500 and transient hot-update 404) remains in this repo and is not introduced by the Phaser battle code.

## Play Battle Next Sprint Plan (2026-02-17)

- [x] Stabilize runtime/dev ergonomics for battle iteration (guard start path, reduce noisy prefetch errors).
- [x] Add run-to-run progression/perk economy to deepen replay value.
- [x] Improve combat feedback with stronger hit/kill/level-up game feel cues.
- [x] Re-verify with `$develop-web-game` automation plus lint/build.
- [x] Document results and residual risks.

### Play Battle Next Sprint Review (2026-02-17)

- Stability upgrades:
  - Added guarded production launcher `scripts/start-guard.mjs` and routed `npm start` through it, so production boot now blocks when a repo-local dev server is running and auto-rebuilds if `.next` chunks are stale.
  - Reduced prefetch noise in shared shell links by disabling prefetch on primary nav/footer links in `src/components/AppNav.tsx` and `src/components/LayoutChrome.tsx`.
- Progression upgrades:
  - Added persistent run economy (`battle_phaser_meta_v1` localStorage) with credits, run count, highest wave, and permanent perk levels.
  - Added Ops Hangar perk system with purchasable permanent upgrades: Armor Core, Reactor Tuning, Bounty Protocol.
  - Added mutator system (`Standard`, `Overclocked`, `Glass`, `Swarm`) with run-to-run variation and score multipliers.
  - Added end-of-run credit payouts and surfaced progression in HUD + battle feed.
- Game-feel upgrades:
  - Added floating combat text, improved impact rings, wave/boss announcement bursts, level-up flash, and ability cue text (Dash/Nova/Aegis).
  - Added combo milestone surge events with bonus score/log feedback.
- Verification:
  - `npm run lint -- --file src/components/play/BattlePhaserGame.tsx --file src/components/AppNav.tsx --file src/components/LayoutChrome.tsx --file scripts/start-guard.mjs --file src/app/play/battle/page.tsx` passes.
  - `npm run build` passes.
  - `npm start -- --port 3400` now correctly blocks while dev server is running (guard behavior verified).
  - `$develop-web-game` automation passes with updated state output showing mutators, multipliers, and combat feedback fields in `output/web-game/state-*.json`.
  - Manual Playwright deterministic checks confirm:
    - credit payout after run end,
    - perk purchase reduces credits and increments perk level,
    - updated perk costs/economy progression reflect immediately in UI and render-state output.
- Residual risk:
  - Existing repo/runtime console noise (`/favicon.ico` 500 and intermittent RSC payload mismatch from stale browser/dev contexts) still appears outside core battle logic and can pollute automation error logs.

## Character Narrative Audit Plan (2026-02-18)

- [x] Catalog canonical character data files and confirm total entries.
- [x] Verify each profile has updated narrative fields (`descriptionHint`, `personality`, etc.) and flag placeholders/duplicates.
- [x] Collect counts, examples, and paths for reporting; note any remaining weak copy.

### Character Narrative Audit Review (2026-02-18)

- Canonical source verified at `src/data/characterLore.ts`, with assembled export from `coreCharacterLore` (10), `legacyCharacterLore` (11), and generated seed-driven entries (34), for 55 total profiles.
- Rewrite pass confirmed across profile narrative text: substantial `description` rewrites in handcrafted/legacy entries and upgraded `descriptionHint` copy powering generated descriptions.
- Quality checks found no placeholder markers (`placeholder`, `TODO`, `TBD`) and no duplicate `tagline`/`descriptionHint` literals.
- Verification commands run: `npm test`, `npm run lint`, and `npm run build` (all passing; lint reports existing non-blocking warnings).


## Localhost 500 Startup Recovery Plan (2026-02-17)

- [x] Reproduce `/` returning `500` on `npm start` and capture production stack traces.
- [x] Patch startup guard to detect broken `.next` server chunks beyond numeric `require()` references.
- [x] Patch startup guard to handle `EADDRINUSE` on the target start port with actionable behavior.
- [x] Re-verify `npm run start:kill-dev` serves `/` with HTTP `200`.

### Localhost 500 Startup Recovery Review (2026-02-17)

- Root cause confirmed in production startup logs: corrupted `.next` runtime references missing files (`./vendor-chunks/@swc.js`, `./9161.js`) caused route `500`s.
- `scripts/start-guard.mjs` now:
  - validates relative server `require(...)` references with a broader pattern;
  - validates webpack runtime chunk-map paths in `.next/server/webpack-runtime.js`;
  - rebuilds when any required chunk file is missing;
  - detects and optionally clears occupied start-port listeners (`--kill-dev`/`--force`) before `next start`.
- Verification: after guarded start, `curl -i http://localhost:3000/` returns `HTTP/1.1 200 OK` with full page HTML.

## Login Legibility Fix Plan (2026-02-17)

- [x] Audit `/login` text/input/button contrast against the light `cp-*` design system.
- [x] Refactor `src/app/login/page.tsx` to use consistent token-based foreground colors that match app chrome.
- [x] Verify with `npm run lint` and a quick visual check of the login page.
- [x] Add a short review note with outcomes and residual risk.

### Login Legibility Fix Review (2026-02-17)

- Root cause: `src/app/login/page.tsx` used `text-white` and translucent white foreground colors on light glass surfaces (`bg-white/*`), making headings, labels, body copy, and form fields low-contrast.
- Login page typography now uses design-system color tokens (`--cp-text-primary`, `--cp-text-secondary`, `--cp-text-muted`) across both hero and form panels, matching app chrome/readability.
- Form controls now use tokenized borders/text on solid light surfaces; error state uses readable red-on-light styling, and primary submit uses the shared `cp-cta-primary` pattern.
- Verification:
  - `npm run lint` passes (warnings are pre-existing and unrelated).
  - Fresh dev visual check captured at `output/login-legibility-after-fresh-dev.png`.
- Residual risk: no automated visual regression test exists for `/login`, so future copy/style edits could reintroduce low-contrast combinations without screenshot checks.

## Champion Profile Component Map (2026-02-17)

- [x] Identify the champion profile “/character” page entry point and folder structure.
- [x] Trace the sections responsible for performance metrics, identity highlights, and the gallery/asset set.
- [x] Document the file paths plus key props/state/style hooks used for hover interactions and tier tiles.

## Champion Profile Visual Polish Plan (2026-02-17)

- [x] Rework `CharacterStats` hover/tier tile treatment to remove wonky glow behavior and stabilize tier badge readability.
- [x] Redesign “Identity Highlights” in `CharacterPageClient` with stronger color accents, richer hierarchy, and more visual life.
- [x] Tighten “Asset Set / Character Gallery” so it occupies less space and no longer repeats identical-looking cards.
- [x] Verify with targeted lint checks and a quick visual pass of `/character/[id]`.
- [x] Add a review note with final behavior changes and residual risk.

### Champion Profile Visual Polish Review (2026-02-17)

- Performance metrics polish (`src/components/CharacterStats.tsx`):
  - Replaced overbright tier gradients with readable tier chips (`chipBg/chipBorder/chipText`) and kept tier labels consistent across stat values.
  - Calmed hover behavior: removed the heavy hover glow stack and switched to subtle lift + accent border + controlled shadow.
  - Kept existing layout/information hierarchy but tuned copy for concise tier descriptors.
- Identity highlights refresh (`src/app/character/[id]/CharacterPageClient.tsx`):
  - Added trait-specific color treatments (surface gradient, halo, chip styling) so each highlight card has distinct personality.
  - Switched layout from plain stacked rows to a two-column spotlight grid with hover lift and stronger label hierarchy.
- Gallery minimization (`src/app/character/[id]/CharacterPageClient.tsx`):
  - Converted the gallery from a full tile grid into a compact horizontal reel (`galleryPreview` limited to 5 items).
  - Added per-asset color accents and compact index labels to reduce repetition while preserving discoverability.
  - Added concise overflow note when extra assets are hidden.
- Verification:
  - `npm run lint -- --file src/components/CharacterStats.tsx --file 'src/app/character/[id]/CharacterPageClient.tsx'` passes (pre-existing `@next/next/no-img-element` warnings only).
  - `npm run build` passes.
  - Production visual spot-check completed for `/character/1febfca5-e98f-4b8b-aded-79b912db843f`; captures saved to:
    - `output/champion-profile-polish-metrics.png`
    - `output/champion-profile-polish-identity-gallery.png`
    - `output/champion-profile-polish-gallery.png`
- Residual risk:
  - Identity highlights still intentionally show fallback copy for characters missing trait metadata; only lore-backed characters render the new colorful highlight cards.

## Redis + Character Mapping Integrity Audit Plan (2026-02-17)

- [x] Audit all Redis-backed repository paths (`src/lib/redis.ts`, `src/lib/repoRedis.ts`, relevant API routes) for key schema consistency and fallback behavior.
- [x] Verify character ID/slug mapping correctness across claim, ownership, and MMO token/session payloads.
- [x] Run automated checks/tests for Redis repo + claim flow + mapping logic and fix any regressions.
- [x] Add integrity hardening where needed (validation/sanitization/defensive parsing) and keep compatibility with current data.
- [x] Document audit results, verified commands, and any residual risk in a review section.

### Redis + Character Mapping Integrity Audit Review (2026-02-17)

- Redis/data integrity audit (live Upstash with local `.env`) confirms key/index consistency:
  - `seeded=true`, `characters=25`, `units=505`, `unitByCodeHashEntries=505`, `users=10`, `ownershipEntries=10`.
  - No broken references found across units, ownerships, or user lookup hashes (`userByEmail`, `userByHandle`).
  - No malformed challenges; no expired unconsumed challenges at audit time.
- Mapping finding:
  - 15 persisted legacy character records have no `slug` and no sprite-path metadata (e.g., `Aero Falcon`, `Storm Leviathan`), so MMO token mapping could previously fall back to DB UUIDs and cause sprite path misses.
- Hardening shipped:
  - Added `src/lib/mmo/avatarId.ts` to normalize/resolve sprite-safe avatar IDs from slug, sprite path, and lore fallback (`withCharacterLore`).
  - Updated `src/app/api/mmo/token/route.ts` to emit only sprite-safe IDs; unresolved records now use a configurable safe fallback (`MMO_DEFAULT_AVATAR_ID`, default `neon-city`) instead of raw DB UUIDs.
  - Added `src/lib/mmo/avatarId.test.ts` for normalization, sprite-path parsing, lore fallback for legacy records, and null-path handling.
- Verification:
  - `npm test -- src/lib/mmo/avatarId.test.ts src/lib/repoRedis.test.ts src/app/api/claim/flow.test.ts src/app/api/redeem/route.test.ts`
  - `npm run lint -- --file src/app/api/mmo/token/route.ts --file src/lib/mmo/avatarId.ts --file src/lib/mmo/avatarId.test.ts`
  - `npm run build`
- Residual risk:
  - Mitigated by follow-up migration (`scripts/migrate-character-avatar-slugs.ts`); live Redis now reports zero unresolved avatar mappings.

## Legacy Character Slug Normalization Migration Plan (2026-02-17)

- [x] Add a one-time Redis migration script that backfills deterministic sprite-safe slugs/art refs for legacy characters missing avatar identity fields.
- [x] Support `--dry-run` preview output before applying writes.
- [x] Run dry-run against live Upstash data and verify exact records/slug targets.
- [x] Run migration apply mode and persist normalized character records.
- [x] Re-run integrity checks to confirm unresolved avatar mappings drop to zero and document results.

### Legacy Character Slug Normalization Migration Review (2026-02-17)

- Added one-time migration script: `scripts/migrate-character-avatar-slugs.ts`.
  - Targets only records in `charmxpals:characters` that still lack resolvable avatar identity (`slug` and sprite-path slug).
  - Backfills `slug` and full art refs (`signature`, `thumbnail`, `card`, `portrait`, `banner`, `full`, `sprite`) using explicit legacy-name mapping and deterministic fallback.
  - Supports safe preview mode by default (dry run); write mode requires `--apply`.
- Executed against live Upstash data:
  - Dry run: `npx ts-node --transpile-only --project tsconfig.scripts.json scripts/migrate-character-avatar-slugs.ts`
  - Apply: `npx ts-node --transpile-only --project tsconfig.scripts.json scripts/migrate-character-avatar-slugs.ts --apply`
  - Idempotency check: re-running dry run reports no unresolved records.
- Migration result:
  - Updated 15 legacy records (`Obsidian Panther`, `Tidal Serpent`, `Aero Falcon`, `Storm Leviathan`, `Frost Wolf`, `Volt Lynx`, `Terra Golem`, `Blaze the Dragon`, `Nova Kitsune`, `Pyro Beetle`, `Vine Warden`, `Aurora Stag`, `Quartz Sentinel`, `Shadow Mantis`, `Crystal Nymph`).
  - Post-migration Redis audit: `totalCharacters=25`, `unresolvedCharacters=0`, `ownershipCount=10`, `ownershipUnresolved=0`.
- Verification:
  - `npm test -- src/lib/mmo/avatarId.test.ts src/lib/repoRedis.test.ts src/app/api/claim/flow.test.ts`
  - `npm run lint -- --file scripts/migrate-character-avatar-slugs.ts --file src/app/api/mmo/token/route.ts --file src/lib/mmo/avatarId.ts`
  - `npm run build`

## Explore + Owned Profile UX Recovery Plan (2026-02-18)

- [x] Rework the stat-compare visualization in `src/app/compare/CompareClient.tsx` so it reads cleanly on both mobile and desktop and avoids misleading bar composition.
- [x] Improve compare row/card aesthetics with a consistent visual language (clear labels, balanced contrast, and stronger information hierarchy).
- [x] Fix owned-player profile image resolution in `src/components/CharacterCard.tsx` and `src/app/u/[handle]/page.tsx` so real character art is shown whenever any valid art ref/lore fallback exists.
- [x] Verify via targeted lint + build and document outcomes/residual risk in a review section.

### Explore + Owned Profile UX Recovery Review (2026-02-18)

- Compare stat lanes in `src/app/compare/CompareClient.tsx` now use a mirrored center-axis meter (left and right fills no longer stack on top of each other), with clearer value readouts and advantage chips per stat row.
- Compare copy and hierarchy were tightened so the stat section explains the visualization model directly and reads cleanly under heavy mismatch scenarios (for example when one side has `0` for a stat).
- Owned profile rendering now resolves art from the best available key in `src/components/CharacterCard.tsx` (`thumbnail`, `portrait`, `card`, `full`, `banner`, etc.) while avoiding placeholder-first selection.
- Player profile ownership pages (`src/app/u/[handle]/page.tsx`) now enrich characters through `withCharacterLore`, ensuring lore-backed artRefs are available when DB records are sparse; `src/app/me/page.tsx` was aligned to the same enrichment path for consistency.
- Verification:
  - `npm run lint -- --file src/app/compare/CompareClient.tsx --file src/components/CharacterCard.tsx --file 'src/app/u/[handle]/page.tsx' --file src/app/me/page.tsx`
  - `npm run build`
  - Manual runtime smoke check on local production server (`/compare`, `/u/demo`) via Playwright snapshot confirmed updated stat lanes and non-placeholder character art rendering.
- Residual risk:
  - `CharacterCard` still uses native `<img>` tags (existing repo pattern), so Next.js image-optimization warnings remain intentionally unchanged.

## Champion Profile Edge-Case Audit Plan (2026-02-18)

- [x] Audit new champion profile components for runtime/accessibility edge cases and data-shape resilience.
- [x] Patch confirmed issues with minimal, targeted edits in `CharacterPageClient` and `src/components/champion/*`.
- [x] Verify with lint + production build, then add an audit review note with residual risks.

### Champion Profile Edge-Case Audit Review (2026-02-18)

- Runtime/data hardening in `src/app/character/[id]/CharacterPageClient.tsx`:
  - Added stat normalization (`finite`, `0-100` clamp, integer rounding) before sorting/rendering to prevent `NaN` power totals and broken diff chips from malformed payloads.
  - Fixed section-nav mismatch by only exposing `Identity` as a tab when it renders as its own section (`#section-traits` fallback path for characters without lore text).
  - Added active-tab recovery so the nav always has a valid selected section after data changes.
  - Added a non-radar fallback message when fewer than 3 stats exist (instead of showing an empty radar canvas card).
  - Made overall diff chips neutral for exact-equal stats (no false red/down signal).
- Interaction/accessibility hardening in `src/components/champion/CharacterGallery.tsx`:
  - Added selected-index clamping when gallery item sets change.
  - Added full lightbox keyboard controls (`Escape`, `ArrowLeft`, `ArrowRight`) and Space/Enter activation on the preview surface.
  - Added body scroll-lock while lightbox is open.
- State consistency hardening in `src/components/champion/LoreCodex.tsx`:
  - Memoized lore entry parsing inputs and reset expanded accordion state when character lore content changes.
- Animation lifecycle hardening in `src/components/champion/StatBar.tsx`:
  - Added RAF cleanup to avoid lingering animation callbacks after unmount/update.
- Lint correctness fix in `src/components/champion/HexRadar.tsx`:
  - Replaced side-effect ternary expressions with explicit control flow to satisfy `no-unused-expressions`.
- Verification:
  - `npm run lint` (passes; warnings are pre-existing in unrelated areas).
  - `npm run build` (passes).
  - `npm test` (29/29 passing).
- Residual risk:
  - Accent-color alpha composition still assumes hex-like color strings in several style sites (for example ``${accentColor}15``); non-hex color tokens from data could reduce intended glow fidelity.

## Header/Footer Regression Fix Plan (2026-02-18)

- [x] Restore a light default background for general app content so legacy light-token pages remain readable.
- [x] Keep dark header/footer styling intact while fixing content-surface contrast regressions.
- [x] Offset champion profile sticky section navigation below the global sticky header.
- [x] Increase champion section anchor scroll margins to avoid section headings being hidden under stacked sticky chrome.
- [x] Verify with lint, build, and focused route checks (`/explore`, `/compare`, `/character/:id`).

### Header/Footer Regression Fix Review (2026-02-18)

- Updated `src/components/LayoutChrome.tsx` to use `bg-[var(--cp-bg)]` for the app wrapper and `main`, preserving dark header/footer while restoring readable default content contrast for light-token pages.
- Reverted global `body` background in `src/app/globals.css` to `var(--cp-bg)` to prevent dark-background bleed into light-theme surfaces.
- Updated `src/app/character/[id]/CharacterPageClient.tsx` sticky section nav from `top-0` to `top-14` so it no longer sits under the global sticky header.
- Increased section anchor offsets from `scroll-mt-16` to `scroll-mt-24` for lore/traits/stats/gallery to keep section starts visible after in-page tab navigation.
- Verification:
  - `npm run lint` (passes; warnings are pre-existing and unrelated).
  - `npm run build` (passes).
  - Manual Playwright smoke check on local dev server for `/explore`, `/compare`, and `/character/322ac6bd-4685-4027-90ce-38c4426dc9e5` confirms improved contrast and non-overlapping sticky navigation.

## Mobile Responsiveness + Explore Menu Overlap Plan (2026-02-18)

- [x] Reproduce and isolate mobile header menu persistence + overlap issues on `/explore`.
- [x] Patch mobile `AppNav` so the menu closes on link selection, outside taps, and route changes.
- [x] Resolve Explore mobile stacking conflicts between header menu and rarity filter controls/floating surfaces.
- [x] Improve Explore mobile text legibility, including dark-scheme readability for key labels and controls.
- [x] Verify with targeted lint + mobile viewport browser checks and document outcomes below.

### Mobile Responsiveness + Explore Menu Overlap Review (2026-02-18)

- Root cause:
  - `src/components/AppNav.tsx` used uncontrolled `<details>` for mobile nav, so it could stay open while users interacted with other sticky UI on Explore.
  - Explore filter controls were sticky on mobile (`sticky top-20`), creating a second floating layer under the header menu.
  - Explore small-text utility combinations (tight uppercase tracking at `text-xs`) reduced mobile readability, especially under dark color schemes.
- Fixes:
  - Reworked mobile nav in `src/components/AppNav.tsx` to controlled state with explicit close on route change, outside pointer tap, `Escape`, and link tap.
  - Updated Explore controls wrapper in `src/app/explore/ExploreClient.tsx` to be non-sticky on mobile and sticky only from `md` upward.
  - Improved Explore mobile legibility in `src/app/explore/ExploreClient.tsx` (larger description copy and readable section-description treatment on small screens).
  - Added scoped Explore styling in `src/app/globals.css`:
    - mobile horizontal-scroll-friendly rarity filter controls with larger tap/read targets;
    - dark-scheme contrast overrides limited to `.cp-explore-page` for panels/cards/controls.
- Verification:
  - `npm run lint -- --file src/components/AppNav.tsx --file src/app/explore/ExploreClient.tsx` (passes; existing `no-img-element` warnings only).
  - `npm run build -- --no-lint` (passes).
  - Mobile interaction smoke test via Playwright script (390x844) confirms:
    - menu closes after tapping Explore rarity controls,
    - menu closes after mobile nav link navigation,
    - Explore filter container is non-sticky on mobile (`position: relative`).
  - Dark-mode emulation check confirms Explore-specific variables/contrast are active (`prefers-color-scheme: dark`, readable text and surface colors).

## Arena Overhaul Bugfix Plan (2026-02-18)

- [x] Fix server/client arena map authority so rotation updates are pushed and local map switching cannot desync prediction.
- [x] Ensure arena pickup state is delivered reliably to all clients, including newly joined clients.
- [x] Fix elimination event payloads so death FX render at death position and add respawn FX position support.
- [x] Fix `inPowerZone` snapshot semantics so clients can clear zone state correctly.
- [x] Clean up `ArenaClient` lint errors introduced by the overhaul and verify with lint/test/build.

### Arena Overhaul Bugfix Review (2026-02-18)

- Server map authority fixes in `server/mmo/plazaServer.ts`:
  - Added `arena_rotation` event broadcast with full arena config payload on map rotation.
  - Repositioned all arena players to valid spawn points on rotation to prevent off-map/stuck states.
  - Used cached arena config for arena spawns/welcome data to keep map state consistent during connect/join.
- Pickup synchronization fixes:
  - Arena `state` snapshots now always include `pickups` so late-join clients never miss current pickup availability.
  - Added regression test in `server/mmo/__tests__/plazaServer.test.ts` to assert pickup snapshots are present in arena state updates.
- Combat/FX payload fixes:
  - Score events now include `victimPos` captured pre-respawn and `respawnPos` post-respawn.
  - Arena client now renders death FX at death position and respawn FX at respawn position.
- Power zone state correctness:
  - Arena snapshots now always send explicit boolean `inPowerZone` values (not omitted false values).
  - Client also updates local-player power-zone aura from predicted position for responsive visuals.
- Arena client robustness/UX fixes:
  - Added handling for `arena_rotation` to update map + arena config client-side.
  - Removed unsafe `any` pickup fade-in cast and fixed pickup draw-coordinate lint issue.
  - Disabled manual map switching UI to avoid client-side map desync from server authority.
- Verification:
  - `npm run lint` (passes; existing unrelated warnings remain).
  - `npm test` (passes; 30/30 tests).
  - `npm run build` (passes).

## Static Asset Strategy Audit Plan (2026-02-28)

- [x] Inventory static image/audio assets and quantify format + size distribution.
- [x] Detect WebP/AVIF coverage gaps and identify largest asset files.
- [x] Detect duplicate variants (exact content duplicates and same-base multi-format variants).
- [x] Produce prioritized migration strategy for Next.js asset optimization (critical -> optional).
- [x] Add audit review summary with findings and recommended rollout sequence.

### Static Asset Strategy Audit Review (2026-02-28)

- Scope and totals:
  - Scanned static media extensions across repo (excluding build/dependency outputs): 351 files, 824,128,646 bytes total.
  - `public/` dominates runtime payload: 345 files, 817,745,642 bytes.
- Format mix in `public/`:
  - `png`: 336 files, 806,180,112 bytes (98.59% of bytes).
  - `mp3`: 2 files, 11,560,630 bytes (1.41% of bytes).
  - `svg` + `ico`: 7 files, 4,900 bytes combined.
- WebP/AVIF coverage:
  - Raster image bases in `public/`: 336.
  - With sibling `.webp`: 0. With sibling `.avif`: 0. With both: 0.
  - No `.webp`/`.avif` references found in source/config; no `images.formats` config in `next.config.js`.
- Duplicate variant findings:
  - 56 exact-content duplicate groups (SHA-256), 277 files involved, 551,442,419 duplicated bytes.
  - In `public/assets/characters`, all 55 character folders have 5 identical files (`banner/card/portrait/sprite/thumb`): 551,363,644 duplicated bytes.
  - This duplicate waste is 67.42% of all bytes currently under `public/`.
  - No same-base multi-format variants found (0 bases with multiple raster formats).
- Largest files (runtime-relevant):
  - `public/audio/pulsegrid/sunshine.mp3` (6.50 MB, ~284s, 192 kbps).
  - `public/audio/pulsegrid/luwan-house.mp3` (4.52 MB, ~148s, 256 kbps).
  - Many character PNGs in the 2.4-3.1 MB range each; dimensions are predominantly `1024x1536` (275 files) and `1536x1024` (58 files).
- Serving strategy observations:
  - Source uses native `<img>` broadly and only one `next/image`, which is explicitly `unoptimized`; this bypasses automatic format/size optimization.
  - Art refs and sprite parsing hardcode `.png` paths/regex, increasing migration coupling.

## Backend/API Runtime Performance Audit Plan (2026-02-28)

- [x] Map API route request paths and identify hot call chains into auth/session, repo, Redis, and rate limiting.
- [x] Audit Redis access patterns for round-trip count, batching opportunities, and algorithmic inefficiencies.
- [x] Audit auth/session and rate-limit overhead for unnecessary per-request cost.
- [x] Identify synchronous/blocking work and server-side caching opportunities across backend/runtime paths.
- [x] Deliver prioritized findings with file references and practical remediations.
- [x] Add a review note summarizing evidence and residual risk.

### Backend/API Runtime Performance Audit Review (2026-02-28)

- Scope covered:
  - All API route handlers under `src/app/api/**/route.ts` plus shared runtime paths in `src/lib/repo*.ts`, `src/lib/rateLimit.ts`, `src/lib/serverSession.ts`, `src/lib/leaderboard.ts`, and `server/mmo/plazaServer.ts`.
- Highest-impact bottlenecks found:
  - Character lookup path does full roster scans with repeated `hvals` + sort operations.
  - Claim completion path uses multiple pre-validation Redis reads before the final atomic mutation.
  - MMO token mint path does repeated per-request ownership fetch/parse and character hydration.
- Runtime/caching observations:
  - Read-heavy GET paths lack response caching directives and server-side memoization.
  - Rate-limit memory fallback has unbounded key retention and inconsistent IP normalization in one route.
  - A dev status endpoint performs synchronous filesystem reads on-request.
- Residual risk:
  - As roster size and ownership volume grow, current O(n) and O(n^2)-like lookup paths will increase p95 latency and Redis egress disproportionately without indexing/caching changes.

## Frontend Performance Audit Plan (2026-02-28)

- [x] Map App Router client/server boundaries and identify unnecessary client-rendered route shells.
- [x] Inspect bundle composition for shared-chunk pressure, heavy dependencies, and route-level code splitting.
- [x] Audit dynamic import usage and whether heavy modules are isolated to user-intent paths.
- [x] Audit image usage patterns (`next/image`, eager loading, raw `<img>` usage, and asset size distribution).
- [x] Identify hydration/render bottlenecks in high-frequency interactive components.
- [x] Deliver prioritized P0/P1/P2 risk list with file references and concrete optimization recommendations.
- [x] Add audit review summary.

### Frontend Performance Audit Review (2026-02-28)

- Evidence gathered from source inspection plus production build output (`npm run build`) and emitted chunk manifests.
- Key findings include:
  - Root layout-wide client/auth wrapper inflates shared client JS and hydration cost across all routes.
  - Very large image assets are served as raw PNGs (many 2-3 MB each; `public/assets/characters` totals ~757 MB) with multiple eager/raw image usages.
  - Rich lore dataset and realtime/game surfaces place avoidable pressure on client bundle parse/render paths.
- No code changes were applied as part of this audit; recommendations are documented in the final report.

## 2026-02-28 - Performance Phase 1 (Image Delivery)

### Plan
- [ ] Configure Next image optimization defaults (formats + cache TTL).
- [ ] Migrate core UI image surfaces from `<img>` to `next/image` where safe.
- [ ] Remove explicit image optimizer bypass (`unoptimized`) and eager loads on non-critical surfaces.
- [ ] Prefer lower-cost art variants in roster/list/card contexts.
- [ ] Validate via production build and spot-check for type/runtime regressions.

### Progress
- [x] Configure Next image optimization defaults (formats + cache TTL).
- [x] Migrate core UI image surfaces from `<img>` to `next/image` where safe.
- [x] Remove explicit image optimizer bypass (`unoptimized`) and eager loads on non-critical surfaces.
- [x] Prefer lower-cost art variants in roster/list/card contexts.
- [x] Validate via production build and spot-check for type/runtime regressions.

### Review
- `npm run test`: pass (9 files, 30 tests).
- `npm run build`: pass.
- `npm run lint`: pass with existing pre-existing `no-explicit-any` warnings in unrelated files.
- Net result: image delivery now uses Next optimization across core surfaces, `unoptimized` removal in compare avatar, and sprite ref parsing is extension-agnostic for future WebP/AVIF migration.


## 2026-02-28 - Performance Phase 2 (Asset Pipeline + Dedup)

### Plan
- [ ] Add an automated asset optimizer script to generate role-specific image sizes and next-gen formats.
- [ ] Update character art reference generators to prefer WebP (with PNG compatibility assets retained).
- [ ] Update hardcoded fallback paths and arena map/sprite loaders to use WebP-first sources.
- [ ] Run optimizer against current `public/assets` and measure size impact.
- [ ] Re-run tests/build/lint and document results.

### Progress
- [x] Add an automated asset optimizer script to generate role-specific image sizes and next-gen formats.
- [x] Update character art reference generators to prefer WebP (with PNG compatibility assets retained).
- [x] Update hardcoded fallback paths and arena map/sprite loaders to use WebP-first sources.
- [x] Run optimizer against current `public/assets` and measure size impact.
- [x] Re-run tests/build/lint and document results.

### Review
- Added `scripts/optimize-assets.py` and `npm run assets:optimize`.
- Optimizer output: `public` asset footprint reduced from `779.86 MiB` to `353.90 MiB` (`-425.96 MiB`).
- Runtime image format coverage after run: `336` WebP files and `336` AVIF files generated.
- PNG compatibility assets remain in place but resized/compressed and no longer identical-role duplicates.
- Validation:
  - `npm run test`: pass (30/30)
  - `npm run lint`: pass with pre-existing warnings in unrelated files
  - `npm run build`: pass


## 2026-02-28 - Performance Phase 3 (Redis Character Indexing)

### Plan
- [x] Add indexed character lookup APIs to repo contract (`slug`, `nameSlug`, `codeSeries`).
- [x] Implement Redis character indexes and ordered ID list to avoid `hvals + parse + sort` on every list call.
- [x] Update identifier resolution to use O(1) repo lookups before fallback pagination scan.
- [x] Keep memory repo parity and update tests/stubs.
- [x] Validate with lint/test/build.

### Review
- Added Redis keys for character indexes and order list in `repoRedis` and seeded/populated index structures.
- Added lazy index rebuild guard (`characterIndexVersion`) for existing seeded deployments.
- `listCharacters` now reads paged IDs from Redis list + `hmget` by ID order instead of full hash scans.
- `resolveCharacterByIdentifier` now checks id -> slug -> nameSlug -> codeSeries via repo methods before fallback scan.
- Validation:
  - `npm run lint`: pass with pre-existing warnings only
  - `npm run test`: pass (30/30)
  - `npm run build`: pass

## 2026-02-28 - Performance Phase 4 (Token + Runtime Overhead)

### Plan
- [x] Add a repo-level owned-avatar lookup (`listOwnedAvatarIdsByUser`) with Redis short-TTL caching and claim-path invalidation.
- [x] Switch `/api/mmo/token` ownership hydration to the cached repo API and normalize rate-limit IP extraction.
- [x] Bound memory fallback growth in `rateLimit` by sweeping expired buckets periodically.
- [x] Replace synchronous filesystem reads in `/api/style/status` with async reads plus a short in-process cache.
- [x] Add short CDN cache headers on read-heavy public GET endpoints (`/api/character/[id]`, `/api/score`).
- [x] Validate with lint/test/build.

### Review
- Added `listOwnedAvatarIdsByUser` to repo contract + memory/Redis implementations.
- Redis ownership writes now include `avatarId` when claim data is created, and invalidate per-user avatar cache on new ownership claims.
- MMO token minting no longer hydrates full owned-character records on each call; it uses cached avatar IDs from repo, with fallback avatar handling preserved.
- `src/lib/rateLimit.ts` now sweeps expired in-memory buckets every fixed interval to prevent unbounded map growth when Redis is unavailable.
- `src/app/api/style/status/route.ts` now uses `fs/promises` with a 30-second in-process cache instead of per-request sync filesystem reads.
- Added response caching headers:
  - `/api/character/[id]`: `s-maxage=60`, `stale-while-revalidate=300`
  - `/api/score` GET: `s-maxage=10`, `stale-while-revalidate=30`
- Validation:
  - `npm run lint`: pass with pre-existing `no-explicit-any` warnings only
  - `npm run test`: pass (30/30)
  - `npm run build`: pass

## 2026-02-28 - Performance Phase 5 (Identifier Miss Path)

### Plan
- [x] Remove paginated full-roster fallback scans from identifier resolution now that id/slug/nameSlug/codeSeries indexes are in place.
- [x] Add a regression test that fails if `resolveCharacterByIdentifier` falls back to `listCharacters` on unknown identifiers.
- [x] Validate with lint/test/build.

### Review
- `src/lib/characterLookup.ts` no longer performs `listCharacters` pagination loops for unknown identifiers.
- Unknown identifiers now resolve in O(1) lookup attempts + lore fallback only, preventing expensive repeated Redis/list scans on 404-like traffic.
- Added test coverage in `src/lib/characterLookup.test.ts` to ensure paginated scan is not reintroduced.
- Validation:
  - `npm run lint`: pass with pre-existing warnings only
  - `npm run test`: pass (31/31)
  - `npm run build`: pass

## 2026-02-28 - Performance Phase 6 (Session Scope + Layout Shell)

### Plan
- [x] Remove global `SessionProvider` wrapping the entire app shell in root layout.
- [x] Scope session provider usage to routes that require `useSession` (`/claim`, `/login`).
- [x] Refactor layout chrome away from `useSession` and remove `next-auth/react` dependency from the always-loaded header path.
- [x] Validate with lint/test/build and capture bundle impact notes.

### Review
- `src/app/layout.tsx` no longer wraps all routes in `AuthSessionProvider`.
- `src/app/claim/page.tsx` and `src/app/login/page.tsx` now provide local session context only where `useSession` is used.
- `src/components/LayoutChrome.tsx` was simplified to a non-session-aware shell.
- Added `src/components/HeaderAuthControls.tsx` with lightweight session probing (`/api/auth/session`) and direct signout flow (`/api/auth/csrf` + `/api/auth/signout`) so root shell no longer imports `next-auth/react`.
- Validation:
  - `npm run lint`: pass with pre-existing warnings only
  - `npm run test`: pass (31/31)
  - `npm run build`: pass
- Bundle note:
  - Shared first-load JS remains `87.4 kB` at current build granularity, but global session hydration scope is reduced and auth client deps are no longer on the root chrome import path.

## 2026-02-28 - Performance Phase 7 (Header Nav De-JS)

### Plan
- [x] Convert `AppNav` from client component to server-rendered markup (no React hooks/client runtime).
- [x] Keep desktop + mobile header navigation functional without route-level JS state.
- [x] Validate with lint/test/build and confirm `AppNav` is no longer in client module manifests.

### Review
- `src/components/AppNav.tsx` no longer uses `usePathname`, `useState`, `useEffect`, or `use client`.
- Mobile menu now uses native `<details>/<summary>` behavior instead of JS-managed open/close state.
- Validation:
  - `npm run lint`: pass with pre-existing warnings only
  - `npm run test`: pass (31/31)
  - `npm run build`: pass
- Manifest evidence:
  - `AppNav` entry is removed from `.next` client module manifests after this change; only `HeaderAuthControls` remains as the root-shell auth client island.

## Leaderboard + Arena Progress Integrity Plan (2026-03-06)

- [x] Partition runner leaderboards by track and bind submissions to authenticated users instead of client-supplied names.
- [x] Preserve only each user's best run per board/day so repeated submissions do not crowd out the leaderboard.
- [x] Add a server-backed arena daily progress store + API so mission progress is account-owned instead of localStorage-only.
- [x] Update runner and arena clients to consume the hardened leaderboard/progress paths.
- [x] Add targeted tests and verify with lint, tests, build, and e2e.

### Leaderboard + Arena Progress Integrity Review (2026-03-06)

- Leaderboards:
  - `src/lib/leaderboard.ts` now stores runner results per track/day and keeps only the best entry per authenticated user on a given board.
  - `src/app/api/score/route.ts` now resolves leaderboard names from authenticated user identity instead of trusting client-submitted names.
  - `src/components/TopRuns.tsx` and `src/app/play/runner/RunnerClient.tsx` now request/render track-specific runner boards.
- Arena progress:
  - Added authenticated arena progress sync in `src/app/api/arena/daily-progress/route.ts`.
  - `src/components/ArenaClient.tsx` now updates daily mission progress from server-backed records instead of browser-local totals, using server-observed arena events for match/elimination/pulse progression.
  - `src/lib/arenaProgress.ts` and `src/lib/arenaProgressStore.ts` now provide shared date-key/event helpers plus persistence wrappers and test helpers.
- Build/test hardening:
  - `package.json` build now clears `.next` before `next build`, matching the clean-build path that avoids the repo’s intermittent stale-cache rename failure.
  - `playwright.config.ts` now uses `npm run build` so E2E startup follows the same verified build path.
  - Added regression coverage in `src/lib/leaderboard.test.ts` and `src/lib/arenaProgressStore.test.ts`.
- Verification:
  - `npm run lint` passes (warnings only, pre-existing).
  - `npm test` passes (37/37).
  - `npm run build` passes.
  - `npm run e2e` passes (18/18).
- Residual risk:
  - Arena mission progress is now account-owned, but event attribution is still client-initiated for progress sync rather than fully authored by the MMO server.
  - Playwright still showed one transient iPhone `/explore` timeout on the first run before passing cleanly on rerun, so the mobile E2E harness likely still has some instability outside these changes.
