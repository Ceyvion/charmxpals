# Beta Exit Tonight Checklist

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
