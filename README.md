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
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Passwordless (email OTP/magic link)
- **Analytics**: PostHog

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Option A — No‑DB preview (default):
   - Ensure `DATABASE_URL` is unset or set `USE_MEMORY_DB=1` in your env.
   - Start dev server: `npm run dev`.
   - Use codes like `CHARM-XPAL-001` on `/claim`.
   - Visiting `/claim` or hitting `/api/dev/user` will set a `cp_user` cookie to simulate a profile; your inventory appears at `/me` and owned badges show in listings.
   - Dev login: go to `/login` and sign in with username `admin` / password `admin` (configurable via `DEV_AUTH_USER` / `DEV_AUTH_PASS`, and only enabled outside production unless `DEV_AUTH_ENABLED=1`).
4. Option B — Postgres locally:
   - Copy env: `cp .env.example .env` and adjust values if needed
   - Start DB: `npm run db:up`
   - Migrate: `npm run prisma:migrate`
   - Seed: `npm run seed`
   - Start dev server: `npm run dev`

## Orchestrator (Project Plan)

- Live plan page: `/orchestrator` (dev banner links to it)
- Source of truth: `orchestrator/plan.json`
- CLI summary: `npm run orchestrator`

Update statuses in `orchestrator/plan.json` after each meaningful change to keep the team aligned on what's next.

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
