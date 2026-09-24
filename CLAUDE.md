@AGENTS.md

# Amron (oem-mobile)

Universal Expo Router app — **one codebase serves both the web admin/manager
UI and the mobile floor-worker app**, not two separate apps (see
`app.json`/route groups; several screens have `.web.tsx` variants where the
UI genuinely differs). Talks to the `amron-api` Flask backend (separate
repo) — see that repo's `CLAUDE.md` for the API side, especially its RBAC
section, since permission checks there gate what these screens can
actually do regardless of what the UI shows/hides.

## Structure

- `src/app/(protected)/...` — Expo Router file-based routes. `admin/`,
  `manager/`, `quality/`, `dispatch/`, `floor-worker/` per role area.
  `src/config/navigation.ts` is the single source of truth for the sidebar.
- `src/services/*.ts` — one file per API domain, thin wrappers around
  `src/services/api.ts` (axios instance with the JWT interceptor).
- `src/components/common/` — shared UI: `SearchBar`, `SortableHeaderCell`,
  `AppButton`, etc.
- `src/utils/useSearch.ts` / `useSortable.ts` — the app's standard pattern
  for list screens: free-text search across all fields + click-a-column-
  header sort. Use these (not a one-off implementation) on any new table.

## RBAC on the frontend

`user.modules` (from login/`/auth/me`) is the allowed-routes list for the
current user. `src/utils/moduleAccess.ts` + `RequireModuleAccess` component
use it to hide nav links / unmount screen content — but this is UX only.
**The backend's `permission_required` is the real enforcement** — a hidden
nav link doesn't mean the API is actually blocked, and vice versa a shown
link doesn't guarantee the API allows it if the two get out of sync. Check
both sides when changing access to something.

## No automated test suite

Verify with `npx tsc --noEmit` on touched files at minimum. Test through
the running app (`npm run web` is the fastest loop, no device needed)
over assuming a change works from reading it.

## After finishing any task

Always end with:
1. A list of every file you changed, with one line on what changed in each.
2. Plain step-by-step instructions for how I can test the change myself
   (what command to run, what screen or URL to open, what I should see).
Keep it short and assume I'm not an expert.