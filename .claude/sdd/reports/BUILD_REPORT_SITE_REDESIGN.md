# BUILD REPORT: Site Redesign

> Implementation report for SITE_REDESIGN

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | SITE_REDESIGN |
| **Date** | 2026-08-18 |
| **Author** | build-agent |
| **DEFINE** | [DEFINE_SITE_REDESIGN.md](../features/DEFINE_SITE_REDESIGN.md) |
| **DESIGN** | [DESIGN_SITE_REDESIGN.md](../features/DESIGN_SITE_REDESIGN.md) |
| **Status** | Complete |

---

## Summary

| Metric | Value |
|--------|-------|
| **Files Changed** | 54 |
| **Migrations Applied** | 11 (0007–0017) |
| **RLS Tests Passing** | 26/26 |
| **Lint** | Clean |
| **Build** | Clean (typecheck + production build) |

---

## What Was Built

Beyond the original 56-file DESIGN manifest, this build went through substantial live iteration directly against the running app, driven by feedback while the user watched it work locally:

**Schema (11 migrations, `supabase/migrations/0007`–`0017`):**
- `sessions` table (replaces `courses.category`), sysadmin CRUD + reorder
- `courses.session_id`/`sort_order`/`badge_image_path`
- `completions.status` (`interested`/`done`) for the 3-state tracking button
- `course-badges` Storage bucket (official badge images, sysadmin write / public read)
- `profiles.username` (unique, auto-generated on signup)
- `mural_entries` view (real posts + live auto-entries for "done" rows)
- `sessions.badge_image_path` — a **provider-level logo fallback**, inherited by every course in that session with no badge of its own (added after live testing showed courses without a specific badge showed nothing at all)
- Two real bugs caught and fixed via live testing (see Issues Encountered)

**Provider logo curation:** Databricks, HackerRank, Oracle, and Scrum Alliance logos sourced (Simple Icons CDN + Wikimedia Commons) and uploaded to `course-badges/providers/*.svg`, assigned per session as the fallback badge — satisfies "the Mural always has something" without any runtime image-search dependency (DESIGN Decision 3).

**Frontend:** Tailwind v4 migration (tokens ported from `caixa-forte-app`), `next-themes` for dark-default theming (see Deviations), full auth flow (login/signup/forgot-password/reset-password matching the caixa-forte pattern), cookie consent, footer with author credits + GitHub link + version, public profiles at `/u/{username}`, JSON export, and — added live per user direction — inline session/course management (create, rename, delete, **merge**, reorder, edit) directly on the public list for sysadmins, a search/filter bar (name/tag/provider), and a copy-link button per row.

---

## Verification Results

### Lint
`npm run lint` — clean, zero errors.

### Type Check + Build
`npm run build` — compiles, typechecks, and generates all 13 routes successfully.

### Tests
`npm run test` (Vitest, RLS integration against a real local Postgres via `supabase start`):

```text
✓ tests/rls/sessions.test.ts (3 tests)
✓ tests/rls/courses.test.ts (3 tests)
✓ tests/rls/badges.test.ts (4 tests)
✓ tests/rls/mural-entries.test.ts (4 tests)
✓ tests/rls/completions.test.ts (5 tests)
✓ tests/rls/profiles.test.ts (7 tests)

Test Files  6 passed (6)
     Tests  26 passed (26)
```

**Status:** ✅ 26/26 Pass

No new e2e Playwright specs were written this build (rows 49–56 of the DESIGN manifest) — the acceptance surface was instead verified live, iteratively, against the running local app. This is a real gap versus the DESIGN's testing strategy — see Deviations.

---

## Issues Encountered

| # | Issue | Resolution |
|---|-------|------------|
| 1 | `npm run dev` was reading `.env.local`, pointing the entire app at the **real production** Supabase project (which had none of the new migrations) — the public list rendered empty | Added `.env.development.local` (gitignored, Next.js loads it with higher precedence for `next dev` only) pointing at the local disposable Supabase instance |
| 2 | Reorder buttons silently did nothing | Every session/course shared the same default `sort_order = 0`; the swap-neighbor algorithm needs distinct values. Migration 0013 backfilled real sequential values and added triggers so new rows auto-assign to the end |
| 3 | Mural showed nothing for a completed row | The `mural_entries` view required `badge_image_path is not null` before showing an entry at all — the opposite of "always shows something." Removed the filter (0014) and added the session-level logo fallback (0015/0016) |
| 4 | `mural_entries` returned `permission denied` for `service_role` | The view's `GRANT SELECT` only listed `anon, authenticated` — same class of gap the original build already caught once for base tables. Fixed in 0017 |
| 5 | `next build` run while `next dev` was also running corrupted the shared `.next` cache, causing a 500 | Killed both, cleared `.next`, restarted a single clean `next dev` |
| 6 | User's browser session became stale after repeated `supabase db reset` calls (each one recreates `auth.users` with new IDs) | Instructed a fresh log-out/log-in rather than just a page refresh |

---

## Autonomous Decisions

| # | Decision Point | Options Considered | Chose | Rationale |
|---|----------------|--------------------|-------|-----------|
| 1 | Theming mechanism | DESIGN Decision 6 specified a hand-rolled inline script (no dependency), reasoning it matched caixa-forte's "mechanism" | Adopted `next-themes` instead | Checking `caixa-forte-app`'s actual `theme-provider.tsx` (not just its CSS) showed it uses `next-themes` — porting "the actual mechanism" (the BRAINSTORM's own stated goal) meant including it. It's a ~1KB single-purpose dependency; configured `defaultTheme="dark"`, `enableSystem={false}` to match this project's dark-default requirement (vs. caixa-forte's `system` default) |
| 2 | `courses.category` → `courses.session_id` requires updating `seed.sql` and two existing RLS test files, not in the DESIGN manifest | Update them vs. leave the seed/tests broken | Updated `seed.sql`, `tests/rls/courses.test.ts`, `tests/rls/completions.test.ts` | Direct, unavoidable consequence of Decision 1; leaving them broken would fail the project's own 100%-coverage requirement |
| 3 | Shared `SessionForm`/`SessionHeader`/`CourseForm` components lived under `src/app/admin/` | Duplicate for the main-page inline UI vs. relocate | Moved `session-form.tsx` to `src/components/` (shared); `course-form.tsx` stayed in `admin/` and is imported from both `course-row.tsx` and `admin/page.tsx` | Reuse over duplication; the admin page and the main page's sysadmin view now share the exact same edit/create forms |
| 4 | User asked for "merge sessions," not in DESIGN or DEFINE | Add a new Server Action + UI, or defer | Implemented `mergeSessionInto()` (reassigns courses, then deletes the empty source session) + a "Mesclar" control in `SessionHeader` | Small, well-scoped, directly requested; also gives `deleteSession` a real recovery path now that it's `ON DELETE RESTRICT` against non-empty sessions |
| 5 | `deleteSession` on a session with courses hits a Postgres FK violation (`23503`), contradicting the original confirm-dialog copy ("...and everything inside it") | Cascade-delete courses, or block with a clear message | Block, with `session_has_courses` mapped to a friendly inline error pointing at merge | Matches this project's established principle that the DB constraint is the real guarantee — losing a session's courses silently is a worse failure mode than an admin having to merge first |
| 6 | Public photo-upload form on `/badges` (`BadgeUploadForm`) became redundant once official per-row badges auto-populate the Mural | Keep both upload paths, or remove the manual one from the page | Removed `BadgeUploadForm` and its now-dead file from `/badges`; left `createBadgePost` (the Server Action) and the underlying `badge_posts` schema/RLS/tests untouched | Explicit user direction: badge image management belongs in each row's Edit form only. Didn't delete the backend capability itself since no one asked for that and it's still a working, tested feature that could resurface elsewhere |
| 7 | `/badges` (Mural) requires login | DEFINE didn't specify this either way | Added an auth redirect | Explicit user direction mid-build |

---

## Deviations from Design

| Deviation | Reason | Impact |
|-----------|--------|--------|
| Theming uses `next-themes`, not a hand-rolled script (DESIGN Decision 6) | See Autonomous Decision 1 | One new small dependency; behavior is equivalent or better (battle-tested hydration handling) |
| `sessions.badge_image_path` added (not in DESIGN) | Live testing showed per-course-only badges left most rows with no image at all until manually curated one-by-one | One more migration (0015/0016); this is the mechanism that actually fulfills "the Mural always has something" |
| `mergeSessionInto` added (not in DESIGN or DEFINE) | Direct user request mid-build | New Server Action + UI; no schema change beyond what 0007/0008 already provide |
| Playwright e2e specs (manifest rows 49–56) not written | Time was spent instead on live iterative verification against the running app per direct, continuous user feedback | **Real gap** — acceptance criteria were confirmed by hand, not captured as regression tests. Flagged for a follow-up pass before this is considered fully "shippable" test-coverage-wise |
| Inline sysadmin session/course management on the main page (not just `/admin`) | Direct user request mid-build ("I want options for reordering right in the list") | `/admin` still works but is no longer linked in the nav; all of session/course CRUD + reorder + merge is now also inline on `/` |
| "Admin" nav link removed | Direct user request | `/admin` route still exists and still works, just not linked |

---

## Blockers

None. One manual step remains outside this build's scope (matches DESIGN Decision 5): disabling "Confirm email" in the **remote** Supabase project's Auth dashboard — already set correctly in local `supabase/config.toml`, but the remote project's dashboard setting was never touched this session (no migrations were pushed to production).

---

## Acceptance Test Verification

| ID | Scenario | Status | Evidence |
|----|----------|--------|----------|
| AT-001 | Theme default and persistence | ✅ Verified live | `next-themes`, `defaultTheme="dark"`, confirmed via manual toggle + reload during the session |
| AT-002 | Regular signup, no confirmation | ✅ Verified live | `enable_confirmations = false` locally; signup flow tested end-to-end |
| AT-003 | 3-state row cycle | ✅ Verified live | Interest button cycles neutral→interested (yellow)→done (green)→neutral; DB write confirmed directly via API |
| AT-004 | Sysadmin row management | ✅ Verified live | Create/edit/delete/reorder for both sessions and courses, now inline on the main page |
| AT-005 | Badge resolution at authoring time | ✅ Verified live | Provider logos curated and uploaded this session; session-level fallback confirmed |
| AT-006 | Mural auto-post and live badge sync | ✅ Fixed and re-verified | Two real bugs found and fixed (Issues #3, #4) before confirming this works |
| AT-007 | JSON export completeness | ⚠️ Built, not independently re-verified after later changes | `ExportButton` wired to real data; not re-clicked after the last few edits |
| AT-008 | Username uniqueness | ✅ Verified via RLS test | `tests/rls/profiles.test.ts` |
| AT-009 | Regular-user permission clarity | ✅ Built | No content-management controls render for non-sysadmins in `TrainingList`/`CourseRow` |
| AT-010 | Greeting fallback | ✅ Built | `UserMenu` falls back to email + prompts to set a name |
| AT-011 | Cookie consent persistence | ✅ Built, not re-verified live this session | localStorage-based, same pattern as the reference apps |

---

## Final Status

### Overall: 🔄 IN PROGRESS (functionally complete, test-coverage gap flagged)

**Completion Checklist:**

- [x] All manifest schema/backend tasks completed (plus follow-on fixes found via live testing)
- [x] Lint clean
- [x] Build clean (typecheck + production build)
- [x] All RLS tests pass (26/26)
- [ ] Playwright e2e specs (DESIGN manifest rows 49–56) — **not written**
- [x] No blocking issues for local development
- [x] Acceptance tests verified live (see table above); not all captured as automated regression tests
- [ ] Remote Supabase project still needs migrations pushed + "Confirm email" disabled before this is live in production

---

## Next Step

Recommended: a follow-up pass to write the missing Playwright specs before `/ship`, then push migrations to the remote project and flip the email-confirmation setting there. If the user wants to ship now regardless, `/ship .claude/sdd/features/DEFINE_SITE_REDESIGN.md`.
