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
- When guarding Next.js startup against `.next` corruption, validate webpack runtime chunk-map paths (for example `./vendor-chunks/@swc.js`, `./9161.js`) in addition to static `require(...)` paths, or production can still boot with hidden broken chunks and return `500`.
- For dynamic profile routes, resolve both DB IDs and slugs (plus name-slug fallback) before returning 404, otherwise UI links from different surfaces can intermittently hit `Character Not Found` despite valid roster entries.
- If the user asks for proper art for each character, do not stop at shared fallback mappings; generate and publish dedicated slug asset folders so each profile has unique files.
- On mobile headers, avoid uncontrolled `<details>` menus when pages have sticky controls; use controlled nav state that closes on outside taps, route changes, and item taps, and keep secondary sticky/floating bars disabled on small screens to prevent layered menu collisions.
- When a user says "install this" for an agent skill/package, confirm whether they mean project-scoped installation or global installation for the agent itself before changing the repo.
- When a user asks to make a deployment fix live, do not stop at a side branch commit; fast-forward or otherwise land the verified fix on `main` before handing off.
