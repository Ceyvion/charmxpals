# Physical-Digital Collectibles Platform

Welcome to CharmPals, a platform that links physical collectibles to digital experiences with strong anti-fraud measures and creator-friendly growth loops.

## Features

- **Claim & Verify**: Securely claim your physical collectible with a unique code.
- **Digital Twin**: View your character's stats, rarity, and unlockables.
- **My Pals Inventory**: See your owned pals in one place (dev cookie-backed until auth lands).
- **3D Viewer**: Animated 3D character models on each character page and in My Pals.
- **Mini-Games**: Play exciting mini-games with your collectibles.
- **Customization**: Unlock skins, badges, and nameplates.
- **Compare & Leaderboards**: Compare characters and compete on leaderboards.
- **Social**: Connect with friends and invite them to the platform.
- **Anti-Fraud**: Robust measures to prevent code duplication and fraud.

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API routes, Upstash Redis (with an in-memory fallback for local preview)
- **Data Store**: Upstash Redis (serverless REST API)
- **Authentication**: Passwordless (email OTP/magic link)
- **Analytics**: PostHog

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables:
   - Copy the sample: `cp .env.example .env`.
   - Update `CODE_HASH_SECRET` to a value you control (it must match whatever was used when hashing claim codes).
   - Keep `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` pointed at your Upstash database (the provided defaults match the shared demo instance).
   - Optional: set `USE_MEMORY_DB=1` to run entirely in-memory without touching Redis.
4. Start the app: `npm run dev`.
   - Use `CHARM-XPAL-001`, `CHARM-XPAL-002`, etc. on `/claim` to test the flow.
   - Visiting `/claim` or hitting `/api/dev/user` will set a `cp_user` cookie to simulate a profile; your inventory appears at `/me` and owned badges show in listings.
   - Dev login: go to `/login` and sign in with username `admin` / password `admin` (configurable via `DEV_AUTH_USER` / `DEV_AUTH_PASS`, only enable in production if you understand the risk).
   - Import additional claim codes from CSVs with `npm run import:cxp -- --file path/to/codes.csv --set "Wave Name"` (requires valid Upstash credentials and `CODE_HASH_SECRET`).

## Orchestrator (Project Plan)

- Live plan page: `/orchestrator` (dev banner links to it)
- Source of truth: `orchestrator/plan.json`
- CLI summary: `npm run orchestrator`

Update statuses in `orchestrator/plan.json` after each meaningful change to keep the team aligned on what's next.

## MMO (Social Plaza)

- Docs: see `docs/mmo/FEATURE_SPEC.md` and `docs/mmo/TECH_RFC.md` for scope and architecture.
- Token API: `GET /api/mmo/token` mints a short-lived WebSocket token for the real-time server.
  - Requires a dev user (`/api/dev/user`) or real ownership in production.
  - Env: set `MMO_WS_SECRET` in `.env`.
- Dev server:
  - Install deps (ws): `npm install`
  - Start MMO WS: `npm run mmo:server` (listens on `ws://localhost:8787`)
  - Start Next.js: `npm run dev`
  - Open app: `/plaza` (or via Play → Plaza)

## Brand & Color

- Trend research summary: `docs/brand/COLOR_RESEARCH_2025.md` (sources: WGSN, Pantone, Adobe, Pinterest, 99designs).
- Current UI palette: Future Dusk base with Transcendent Pink / Digital Lavender / Aquatic Awe accents.

## Collectible Scanning

- High-level flow and schema live in `docs/collectibles/SCANNING_PLAN.md`.
- Upcoming work: extend `PhysicalUnit`, add `ScanEvent`/`ScanSession`, and wire `/api/scan/*` endpoints.

## Recent UX Changes

- Unified header/footer across routes for a more connected feel.
- Added `/me` inventory page ("My Pals").
- Dev user endpoint now sets a lightweight `cp_user` cookie (no real auth yet).
- Explore/Home surfaces ownership badges on cards when available.
- Character pages and My Pals now include an inline 3D viewer (client-only, no extra deps).
- Added dev login (`/login`) and profile pages (`/u/[handle]`), plus `/logout` for convenience.

## MVP Features

1. Claim flow (QR/NFC)
2. Character pages
3. First mini-game
4. Basic social features
5. Analytics and admin dashboard
