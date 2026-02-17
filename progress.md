Original prompt: you need to use all skills and research aavailbibe and make this game 10 more fun as well as legible, as you can see the buttons are messed up. think about a new game in its place if you can make this ame aweesome. use the [$develop-web-game](/Users/macbookpro/.codex/skills/develop-web-game/SKILL.md) web game dev skill to help you

## 2026-02-17

- Started focused rebuild of `/play/battle` around a new canvas game loop to solve legibility and broken control/button clarity.
- Plan: replace low-contrast card UI with high-contrast HUD + single canvas arena.
- Must include: deterministic `window.render_game_to_text`, `window.advanceTime(ms)`, and fullscreen toggle with `f` + `Esc`.
- Validation approach: run `$WEB_GAME_CLIENT` action bursts after each meaningful implementation chunk, inspect screenshot + render text + console errors.

### TODO

- Implement new game logic + rendering with readable controls and button states.
- Wire keyboard controls for movement, dash, pulse shot, shield, pause, restart.
- Add clear menu/start screen and post-run summary.
- Run Playwright loop with multiple scenarios and fix issues.
- Record final findings + residual risks for handoff.

## 2026-02-17 - Implementation chunk 1

- Fully replaced `src/app/play/battle/page.tsx` with a new canvas game: `Rift Pulse Rush`.
- Added high-contrast side panel and fixed-button hierarchy (`Start Run`, `Pause/Resume`, `Restart`, fullscreen toggle), replacing washed-out white-on-light controls.
- Implemented gameplay loop: movement, pulse shots, enemy spawn waves, shard pickups, combo scoring, dash (`E`), shield (`Shift`), pause (`P`), restart (`R`), and timed win/lose states.
- Added required test hooks:
  - `window.render_game_to_text()` with concise JSON state output + coordinate note.
  - `window.advanceTime(ms)` deterministic stepping for Playwright.
  - Fullscreen control on `F` with `Esc` exit support.
- Next step: lint + Playwright action burst validation and screenshot/state inspection.

## 2026-02-17 - Verification chunk 2

- `npm run lint` passes (warnings only, pre-existing unrelated files).
- Ran `$WEB_GAME_CLIENT` against `http://localhost:3200/play/battle`:
  - Scenario 1 (`output/web-game-battle-1/`): movement + pulse bursts verified, no game-loop console errors, state JSON emitted each iteration.
  - Scenario 2 (`output/web-game-battle-2/`): multi-direction movement + pulse checks verified, no game-loop console errors, state JSON emitted.
- Visually inspected latest gameplay screenshots:
  - `/Users/macbookpro/Desktop/charmxpals/output/web-game-battle-1/shot-4.png`
  - `/Users/macbookpro/Desktop/charmxpals/output/web-game-battle-2/shot-2.png`
- Additional manual control testing via Playwright:
  - Dash (`E`) sets non-zero cooldown.
  - Shield (`Shift`) activates and consumes shield meter.
  - Pause/resume (`P`) transitions correctly.
  - Restart resets score/time/health.
  - Both gameover and victory states validated via deterministic stepping + key simulation.
- Sidebar/control readability validated from Playwright element screenshot (stage clear state): controls/buttons are now legible and high-contrast.
- Final quick smoke run on default dev server (`http://localhost:3000`) with `$WEB_GAME_CLIENT`:
  - output: `/Users/macbookpro/Desktop/charmxpals/output/web-game-battle-final/`
  - state hook output confirmed present, no new game-loop console errors emitted.
- Saved sidebar legibility artifact at:
  - `/Users/macbookpro/Desktop/charmxpals/output/web-game-battle-sidebar.png`

### Remaining TODO / Next-agent suggestions

- Optional polish: add varied enemy telegraph FX/audio cues for stronger “fun” feedback loops.
- Optional bugfix pass outside this task: investigate existing repo-level Next runtime `500` noise seen on some dev prefetch/favicon requests.

## 2026-02-17 - Implementation chunk 3 (Phaser rewrite)

- Replaced the prior custom canvas implementation with a Phaser 3 architecture for `/play/battle`.
- Added dependency: `phaser@3.90.0`.
- Added new client component: `src/components/play/BattlePhaserGame.tsx`.
- Updated route to dynamic client-only render (`ssr: false`): `src/app/play/battle/page.tsx`.
- Gameplay upgrades shipped:
  - Distinct enemy archetypes and boss cadence.
  - XP + level-up upgrade selection flow.
  - Active abilities wired to keyboard and sidebar buttons (dash, nova, shield).
  - More legible HUD hierarchy and state-specific banner messaging.
  - Deterministic automation hooks preserved (`window.render_game_to_text`, `window.advanceTime`).

## 2026-02-17 - Verification chunk 4 (post-review fix)

- Code-review pass found a reset bug: Phaser boot `useEffect` re-ran when `bestScore` changed.
- Fix applied:
  - Added `bestScoreRef` / `bestComboRef` for scene-bridge reads.
  - Updated `onBest` bridge callback to mutate refs + React state safely.
  - Removed score-state dependency from engine boot lifecycle.
- Verification:
  - `npm run lint -- --file src/components/play/BattlePhaserGame.tsx --file src/app/play/battle/page.tsx` passes with zero warnings/errors.
  - `npm run build` passes.
  - `$WEB_GAME_CLIENT` run succeeded on `/play/battle`; artifacts in `output/web-game/` (`shot-0..3.png`, `state-0..3.json`, `errors-0.json`).
  - Manual Playwright deterministic check confirms run continues while score increases (no game re-bootstrap on score changes).

### Updated TODO / Next-agent suggestions

- Investigate and fix recurring `/favicon.ico` 500 in dev runtime; currently unrelated but noisy for browser automation logs.
- Optional polish: add stronger VFX/audio feedback for level-up and boss phase transitions.

## 2026-02-17 - Implementation chunk 5 (stability + progression + feel)

- Stability:
  - Added `scripts/start-guard.mjs` and switched `npm start` to use it.
  - Guard now blocks production start when `next dev` is active in this repo and auto-rebuilds if `.next` chunks are stale/missing.
  - Disabled prefetch on shell nav/footer links to reduce background route fetch noise while testing battle mode.
- Progression:
  - Added persistent meta progression storage key: `battle_phaser_meta_v1`.
  - Added credits/runs/highest-wave tracking and permanent perks:
    - Armor Core (base HP boost),
    - Reactor Tuning (energy economy),
    - Bounty Protocol (score/credit multipliers).
  - Added run mutators with unique pacing/scoring profiles (`Standard`, `Overclocked`, `Glass`, `Swarm`).
  - Added end-of-run credit payouts + Ops Hangar sidebar purchase UI.
- Game feel:
  - Added floating combat text for damage, score gains, abilities, level-ups, waves, and boss pressure.
  - Added richer ring impacts, level-up flash, and combo surge bonuses/logging.
  - Extended `render_game_to_text` with mutator/meta/scoreMultiplier/floatTexts for deterministic testing.

## 2026-02-17 - Verification chunk 6

- Checks:
  - `npm run lint -- --file src/components/play/BattlePhaserGame.tsx --file src/components/AppNav.tsx --file src/components/LayoutChrome.tsx --file scripts/start-guard.mjs --file src/app/play/battle/page.tsx` passes.
  - `npm run build` passes.
  - `npm start -- --port 3400` correctly blocks when dev is already running (expected guard behavior).
- `$develop-web-game` loop:
  - Ran automation against `/play/battle` and inspected `output/web-game/shot-*.png` + `state-*.json`.
  - Confirmed mutator fields, score multiplier, ability feedback states, and float text telemetry are present.
- Manual deterministic checks (Playwright MCP):
  - Simulated full runs via `window.advanceTime(...)`.
  - Confirmed credits increase after run end.
  - Confirmed perk purchase updates meta (credits decrease + perk level increments) and UI immediately reflects new buy cost.

### Latest TODO / Next-agent suggestions

- If needed, tune progression economy values further after user playtesting feedback (credits-per-run and cost curve are now intentionally faster).
- Optional next polish: add lightweight procedural audio stingers for wave start, level-up, and boss spawn events.
