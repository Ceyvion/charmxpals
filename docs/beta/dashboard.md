# Beta Dashboard – Wave 1 UX Notes

This doc is the quick reference for what testers see on `/me` and how to adjust the experience without diving through components. Pair it with `docs/beta/WAVE1.md` when you onboard a new cohort.

## Welcome Panel

- **Component:** `src/components/BetaWelcome.tsx`
- **Config source:** `src/lib/betaDashboard.ts`
- **What testers see:** wave badge, mission statement, goal/focus chips, latest patch summary, roster stats, newest pal callout, mission density (checklist progress), highlights, and key resources.

### Updating copy & links

1. Edit `src/lib/betaDashboard.ts`.
   - `waveLabel`, `missionStatement`, `velocityGoal`, `weeklyFocus` drive the hero copy.
   - `patch` controls the right-hand summary and the “Read notes” link.
   - `highlights`, `focusAreas`, and `resources` render the three card grids.
2. Keep `id` values stable so analytics and persisted UI state stay aligned.
3. After editing, run `npm run lint` to catch typos in object keys or imports.

### Personal stats

The welcome panel now personalises:

- `Owned pals` — calculated from `listOwnershipsByUser`.
- `Last sync` — newest claim timestamp.
- `Newest pal` — latest character ownership.
- `Beta missions` — percent complete + last sync time pulled from the checklist store (see below).

If the API is unreachable, the panel falls back to device-local progress and marks sync status accordingly.

## Checklist

- **Component:** `src/components/BetaChecklist.tsx`
- **Task source:** `src/data/betaChecklist.ts`
- **API:** `GET/POST /api/beta-checklist`
- **Persistence:** Upstash Redis (`beta:checklist:<userId>`) when Redis env vars are present, otherwise an in-memory map for dev. The client also mirrors the latest payload into `localStorage` as an offline fallback.

### How it works

1. On mount, the client hydrates from server-provided progress and then re-requests `/api/beta-checklist` to ensure the latest state.
2. Every toggle or reset issues a `POST` with the full progress map. The server sanitises unknown task ids before writing.
3. Responses return `{ progress, updatedAtIso }`. The updated payload flows back into the welcome panel so testers immediately see the percent change.

### Adding or reordering missions

1. Edit `src/data/betaChecklist.ts`.
2. Keep `id` values immutable once shipped; create a new task id instead of reusing an old one.
3. Update highlights in `src/lib/betaDashboard.ts` if you want the hero panel to spotlight a new task.
4. If you remove a task, leave a TODO comment or migration note because stored progress will still include the old id until the next reset.

## API Cheatsheet

| Method | Path | Body | Response | Notes |
| --- | --- | --- | --- | --- |
| `GET` | `/api/beta-checklist` | – | `{ success, record? }` | Requires an authenticated session. `record` is `null` when no missions are stored. |
| `POST` | `/api/beta-checklist` | `{ progress: Record<string, boolean> }` | `{ success, record }` | Sanitises unknown keys; `record.updatedAtIso` is server time. |

## Resource Links

The welcome panel’s resource list is defined in `src/lib/betaDashboard.ts`. Prefer linking to doc pages in this folder or the orchestrator so testers always land on the latest context. If you need to expose an external sheet (latency logging, bug template, etc.), make sure the share permissions allow testers to view/edit before updating the link.

## Deployment Checklist

1. Update `src/lib/betaDashboard.ts` and/or `src/data/betaChecklist.ts`.
2. Regenerate screenshots if you need them for docs (drop into `public/beta/`).
3. Run `npm run lint`.
4. Update `docs/beta/WAVE1.md` with any tester-facing changes and add a short note in the orchestrator plan if needed.
