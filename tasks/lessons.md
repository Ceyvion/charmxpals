# Lessons

- For long image batches, start with `--concurrency 1` when org limits are low to avoid repeated 429 failures and wasted retries.
- Avoid placing sensitive keys in chat; rotate immediately and use local keychain-backed environment loading.
- If `ts-node` script execution fails with unknown `.ts` extension, run with explicit project config:
  - `npx ts-node --transpile-only --project tsconfig.scripts.json <script>`
- When theme direction changes to light surfaces, avoid `text-white/*` on `cp-panel` or translucent white backgrounds; prefer `--cp-text-primary/secondary/muted` tokens and validate with a screenshot before closing.
- If a Next.js route bundles `ws` and plaza handshakes time out with `bufferUtil.unmask is not a function`, force `WS_NO_BUFFER_UTIL=1` before loading `ws` (or externalize `ws`) to avoid broken bufferutil runtime paths.
- If a module reads `process.env` at top-level defaults, load `.env` before importing that module; loading env after static import will preserve stale fallback secrets and can trigger `invalid_token` auth failures.
- When running a standalone WS server alongside Next dev, set `MMO_AUTO_START=0` (or use `npm run dev:plaza`) so `/api/mmo/token` does not attempt a second bind on `:8787` and crash with `EADDRINUSE`.
- When clients render assets from path patterns (for example `/assets/characters/<id>/sprite.png`), do not pass DB UUIDs through realtime payloads; normalize to slug-style avatar IDs (or include explicit asset refs) at token/session boundaries.
- Tailwind content scanning will treat bracketed `dev:plaza`-style tokens in non-UI files as arbitrary utilities and emit invalid CSS declarations; avoid bracketed log tags in scanned files.
- For Tailwind arbitrary grid column values, use underscore-separated track list (spaces) rather than commas, or generated `grid-template-columns` will be invalid in browsers.
- In React + game-engine integrations (Phaser/canvas), never include evolving HUD score state in the engine boot `useEffect` dependencies; use refs/bridge callbacks for live values so score updates do not tear down and recreate the running game.
