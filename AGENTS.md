# Repository Guidelines

## Project Structure & Module Organization
- Source: `src` (Next.js App Router in `src/app`; API routes in `src/app/api/<name>/route.ts`).
- Utilities: `src/lib` (e.g., `redis.ts`, `crypto.ts`).
- Public assets: `public/`.
- Config: `next.config.js`, `tailwind.config.js`, `eslint.config.mjs`, `tsconfig*.json`.
- Tests: place next to sources as `*.test.ts(x)` or in `__tests__/`.

## Build, Test, and Development Commands
- `npm run dev`: Start local Next.js dev server.
- `npm run build`: Create production build.
- `npm start`: Serve the built app.
- `npm run lint`: Lint with Next/ESLint rules; fix before PRs.
- `npm run orchestrator`: Print the current plan and next actions.

## Coding Style & Naming Conventions
- Language: TypeScript; indentation: 2 spaces; keep modules small and focused.
- Components/pages: PascalCase; route segments are folder‑based in `src/app`.
- Files: use `.tsx` for React components, `.ts` for libraries.
- Formatting: Prettier via editor; resolve all ESLint warnings/errors before commit.

## Testing Guidelines
- No suite yet: prefer Jest + React Testing Library for UI; Vitest/Jest for libs.
- Location: tests adjacent to code (`Component.test.tsx`) or in `__tests__/`.
- Focus: meaningful unit coverage for `src/lib` and critical page logic; mock the repo layer/Redis client where appropriate.
- Scripts: add `npm test` when introducing a runner; keep it fast and deterministic.

## Commit & Pull Request Guidelines
- Commits: use Conventional Commits (e.g., `feat: add claim flow`, `fix: handle null user`).
- PRs: include clear description, linked issues, test steps, screenshots/GIFs for UI changes, and notes on DB migrations.

## Security & Configuration Tips
- Env: copy `.env.example` to `.env`. Required: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CODE_HASH_SECRET` (used for claim/seed hashing).
- Secrets: never commit them. Treat Upstash tokens like prod credentials; rotate if compromised.

## Orchestrator
- Source of truth: `orchestrator/plan.json`; UI at `/orchestrator`.
- After meaningful changes, update the relevant task status in the orchestrator.
