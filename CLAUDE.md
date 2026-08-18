# minimal-list

Public provider badge-giving training tracker. Next.js 15 (App Router) + Supabase, deployed on Vercel. Full narrative docs live in [README.md](README.md); this file is project-specific context for coding agents working in this repo.

Coding discipline (think first, simplicity-ladder, surgical diffs, goal-driven verification) is inherited from the user's global `~/.claude/CLAUDE.md`, sourced from https://github.com/leonardochalhoub/claude-best-practices — not repeated here.

## What this is

A curated, public list of free, badge-giving training from official providers (Databricks, Oracle Cloud, HackerRank, Scrum, and growing) — the kind whose badge is worth putting on LinkedIn. Anyone can browse; a self-serve account lets a visitor track their own interested/completed rows; sysadmin accounts (created only by the site's authors — never via self-serve signup) manage the content.

## Stack

- Next.js 15, React 19, TypeScript
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — Postgres, Auth, Storage
- Tailwind CSS, Zod validation
- Vitest (unit/RLS integration), Playwright (e2e)

## Conventions specific to this repo

- **RLS is the real enforcement boundary, not app code.** Every table needs both a base `GRANT` *and* an RLS policy — Postgres denies before a policy is ever evaluated if the base `GRANT` is missing, including for `service_role`. This exact bug class was caught once already (see `.claude/sdd/archive/COURSE_TRACKER/BUILD_REPORT_COURSE_TRACKER.md`); don't reintroduce it.
- **`public.is_sysadmin()`** (`SECURITY DEFINER`, in `supabase/migrations/0001_profiles_and_roles.sql`) is the one helper every admin-only RLS policy calls. Reuse it — don't hand-roll a role check.
- **Migrations are sequential and additive**: `supabase/migrations/000N_*.sql`. Next one is `0007_*`. Never edit an already-applied migration; add a new one.
- **Sysadmin promotion is manual**, by direct `UPDATE public.profiles SET role = 'sysadmin' ...` (or the Supabase Admin API) — never exposed in the app UI. This is deliberate: the footer must say new admin accounts are created only by the site's authors, and that has to stay true.
- Source lives under `src/` (Next.js src-directory layout — `src/app/`, `src/lib/`, `src/middleware.ts`); only tool-required config stays at repo root. Server Actions live in `src/lib/actions/`, one file per resource, each returning `{ ok, error }` — mirror this shape for new actions, don't introduce a different response contract.
- Test-runner configs live in `tests/` (`tests/playwright.config.ts`, `tests/vitest.config.ts`), invoked via `npm run test`/`npm run test:e2e` — always use the npm scripts, not `npx vitest`/`npx playwright test` directly, since the config isn't at the default root location.
- `.env.local` holds real secrets (including `SUPABASE_SERVICE_ROLE_KEY`) and is gitignored — verified correct, keep it that way. Any one-off admin script that needs the service role key runs uncommitted, sourcing `.env.local` directly.

## SDD workflow state

This project uses the SDD workflow (`/brainstorm` → `/define` → `/design` → `/build` → `/ship`):

- `.claude/sdd/archive/COURSE_TRACKER/` — the original build, shipped 2026-08-06.
- `.claude/sdd/features/` — in-flight work. Currently **SITE_REDESIGN** (visual + feature redesign: dark/light theme, 3-state row tracking, official badges, public profiles, sysadmin reorder) is at `DESIGN_SITE_REDESIGN.md`, ready for `/build`.

Check `.claude/sdd/features/` before starting new work — an in-progress DEFINE or DESIGN doc for the same area means the decisions are already made; don't re-derive them.

## Testing requirement

This project must always maintain **100% unit and integration test coverage**, using the existing stack: Vitest for unit tests and RLS integration tests (`tests/rls/`, run against a real local Postgres via `supabase start`), Playwright for end-to-end tests (`tests/e2e/`). Every new Server Action, RLS policy, and page must ship with tests in the same change — don't defer coverage to a follow-up.

## Content curation

`docs/certifications-backlog.md` is the running list of providers/trainings to add (checked = already in `supabase/seed.sql`, unchecked = still to source). Update it when adding rows so it stays a trustworthy backlog, not a stale artifact.

## Commands

```bash
npm run dev        # local dev server
npm run lint        # eslint
npm run test        # vitest (unit + RLS integration — needs `supabase start` first)
npm run test:e2e    # playwright
npm run db:types    # regenerate src/lib/supabase/types.ts from the local DB
```
