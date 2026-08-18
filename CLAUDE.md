# minimal-list

Public provider badge-giving training tracker. Next.js 15 (App Router) + Supabase, deployed on Vercel. Full narrative docs live in [README.md](README.md); this file is project-specific context for coding agents working in this repo.

Coding discipline (think first, simplicity-ladder, surgical diffs, goal-driven verification) is inherited from the user's global `~/.claude/CLAUDE.md`, sourced from https://github.com/leonardochalhoub/claude-best-practices — not repeated here.

## What this is

A curated, public list of free, badge-giving training from official providers (Databricks, Oracle Cloud, HackerRank, Scrum, and growing) — the kind whose badge is worth putting on LinkedIn. Anyone can browse; a self-serve account lets a visitor track their own interested/completed rows (3-state: neutral → interested → done); sysadmin accounts (created only by the site's authors — never via self-serve signup) manage sessions and rows, inline on the main page, with no separate deploy needed for content changes.

## Stack

- Next.js 15, React 19, TypeScript
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — Postgres, Auth, Storage
- Tailwind CSS v4 (CSS-native config, no `tailwind.config.ts`), `next-themes` for dark-default theming, Radix primitives (`react-slot`, `react-label`) + `class-variance-authority` for the shadcn-style `src/components/ui/` primitives (ported from `caixa-forte-app`)
- Zod validation
- Vitest (RLS integration tests, `tests/rls/`) — Playwright is installed and configured (`tests/e2e/`) but no specs exist yet for the SITE_REDESIGN feature; see Testing requirement below

## Conventions specific to this repo

- **RLS is the real enforcement boundary, not app code.** Every table (and view!) needs both a base `GRANT` *and* an RLS policy — Postgres denies before a policy is ever evaluated if the base `GRANT` is missing, including for `service_role`. This bug class has been caught twice now: once for base tables (original build), once for the `mural_entries` view (migration `0017`). Don't reintroduce it — when you add a table or view, grant `anon`/`authenticated` *and* `service_role` explicitly.
- **`public.is_sysadmin()`** (`SECURITY DEFINER`, in `supabase/migrations/0001_profiles_and_roles.sql`) is the one helper every admin-only RLS policy calls. Reuse it — don't hand-roll a role check.
- **Migrations are sequential and additive**: `supabase/migrations/000N_*.sql`, currently through `0017`. Never edit an already-applied migration; add a new one — including to fix a bug in a migration from earlier in the *same* build, once it's been applied anywhere (local disposable resets don't count as "applied" for this rule; a migration that only ever existed locally in one session can still be edited directly).
- **`sort_order` columns default to `0` and rely on `ORDER BY sort_order, name` for tie-breaking** (alphabetical until a sysadmin manually reorders). The up/down reorder Server Actions find a neighbor via strict `</>` comparison — if you ever seed or backfill a `sort_order` column, give rows *distinct* sequential values, not the shared default, or reordering will silently no-op. `assign_next_session_sort_order()`/`assign_next_course_sort_order()` triggers handle this automatically for new rows.
- **Badge images fall back from course → session.** `courses.badge_image_path` is the specific/official badge; `sessions.badge_image_path` is a provider-level logo (e.g. the Databricks logo) inherited by every course in that session with no badge of its own. Every read path must `coalesce(course.badge_image_path, session.badge_image_path)` — see `src/app/page.tsx` and the `mural_entries` view for the pattern. Badge resolution itself (finding the right image) is an authoring-time, human/Claude-assisted curation step, never a runtime API call — see the Content curation section below.
- **Sysadmin promotion is manual**, by direct `UPDATE public.profiles SET role = 'sysadmin' ...` (or the Supabase Admin API) — never exposed in the app UI. This is deliberate: the footer must say new admin accounts are created only by the site's authors, and that has to stay true.
- **Local dev never touches the real Supabase project.** `.env.development.local` (gitignored, git-ignored via the existing `.env*.local` pattern) points `npm run dev` at the disposable local Supabase stack (`supabase start`); `.env.local` holds the real project's credentials for scripts/CI. Next.js loads `.env.development.local` with higher precedence than `.env.local` for `next dev` specifically — but only if you *don't* also `source .env.local` in the shell before running `npm run dev`, since shell-exported vars win over Next's own file loading. Run `npm run dev` bare (no `source .env.local` first) for local work against the local DB.
- **Don't run `npm run build` while `npm run dev` is also running** — both share the `.next` cache and can corrupt it, producing a 500 on the dev server. Stop `dev` first, or use a separate `.next` dir if you ever need both concurrently.
- Source lives under `src/` (Next.js src-directory layout — `src/app/`, `src/lib/`, `src/components/`, `src/middleware.ts`); only tool-required config stays at repo root. Server Actions live in `src/lib/actions/`, one file per resource, each returning `{ ok, error }` — mirror this shape for new actions, don't introduce a different response contract.
- Shared UI lives in `src/components/` (primitives in `src/components/ui/`, feature components like `session-form.tsx`, `course-row.tsx`, `training-list.tsx` at the top level) — used by both the public home page and `/admin`. `/admin` still exists and works (session/course CRUD) but isn't linked in the nav anymore; all of that management is inline on `/` for sysadmins now.
- Test-runner configs live in `tests/` (`tests/playwright.config.ts`, `tests/vitest.config.ts`), invoked via `npm run test`/`npm run test:e2e` — always use the npm scripts, not `npx vitest`/`npx playwright test` directly, since the config isn't at the default root location.
- `.env.local` holds real secrets (including `SUPABASE_SERVICE_ROLE_KEY`) and is gitignored — verified correct, keep it that way. Any one-off admin script that needs the service role key runs uncommitted, sourcing `.env.local` directly.

## SDD workflow state

This project uses the SDD workflow (`/brainstorm` → `/define` → `/design` → `/build` → `/ship`):

- `.claude/sdd/archive/COURSE_TRACKER/` — the original build, shipped 2026-08-06.
- `.claude/sdd/features/` — **SITE_REDESIGN** is built, merged (PR #1), and deployed to production (`.claude/sdd/reports/BUILD_REPORT_SITE_REDESIGN.md`) — all migrations pushed to the real Supabase project, provider logos uploaded, email auto-confirm enabled. One flagged gap: no Playwright e2e specs were written — verification was done live against the running app instead. Not yet `/ship`ped (archived).

Check `.claude/sdd/features/` before starting new work — an in-progress DEFINE or DESIGN doc for the same area means the decisions are already made; don't re-derive them.

## Testing requirement

This project must always maintain **100% unit and integration test coverage**, using the existing stack: Vitest for RLS integration tests (`tests/rls/`, run against a real local Postgres via `supabase start`), Playwright for end-to-end tests (`tests/e2e/`). Every new Server Action and RLS policy must ship with an RLS test in the same change. **Known gap:** SITE_REDESIGN's user-facing flows (theme, 3-state tracking, sysadmin CRUD/reorder/merge, signup, profile, export, cookie consent) have no Playwright specs yet — they were verified by hand. Writing `tests/e2e/*.spec.ts` for these is the top follow-up before considering this feature fully covered.

## Content curation

- `docs/certifications-backlog.md` is the running list of providers/trainings to add (checked = already in `supabase/seed.sql`, unchecked = still to source). Update it when adding rows so it stays a trustworthy backlog, not a stale artifact.
- Badge images live in Supabase Storage bucket `course-badges`. Provider-level logos are at `course-badges/providers/{provider}.svg` (currently: `databricks`, `hackerrank`, `oracle`, `scrum`), assigned to `sessions.badge_image_path`. When adding a new provider/session, either upload a real logo the same way (`storage/v1/object/course-badges/providers/{name}.svg` via the Admin API/service role key) and set it on the session, or leave it null and rows will show a generic placeholder until curated — never wire a live image-search API into the app itself.
- On a fresh local `supabase db reset`, Storage objects are wiped (they're not part of `seed.sql`) — re-upload the provider logos before testing anything badge-related locally.

## Commands

```bash
npm run dev        # local dev server — run bare (don't `source .env.local` first) to hit the local Supabase instance
npm run lint        # eslint
npm run test        # vitest (RLS integration — needs `supabase start` first)
npm run test:e2e    # playwright (no specs yet for SITE_REDESIGN — see Testing requirement)
npm run db:types    # regenerate src/lib/supabase/types.ts from the local DB — re-run after every new migration
```
