# DESIGN: Site Redesign — Elegant Provider Badge-Giving Training Tracker

> Technical design for implementing SITE_REDESIGN

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | SITE_REDESIGN |
| **Date** | 2026-08-17 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_SITE_REDESIGN.md](./DEFINE_SITE_REDESIGN.md) |
| **Status** | ✅ Complete (Built) |

---

## Architecture Overview

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                              │
│   Anonymous visitor ───────────────────────────────┐                       │
│   Regular user      ───────────────────────────────┤                       │
│   Sysadmin          ───────────────────────────────┤                       │
└──────────────────────────────────────────────────┬─┴───────────────────────┘
                                                     │ HTTPS
                                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                 VERCEL (Next.js 15 App Router, src/ layout)                │
│                                                                             │
│  src/middleware.ts ── refreshes Supabase session cookie every request     │
│  Theme init (inline <script>, pre-paint) ── reads theme cookie, sets      │
│    .dark on <html> before first paint (no FOUC, no dependency)            │
│  CookieConsent (client component, mounted in root layout)                 │
│                                                                             │
│  ┌───────────────┐ ┌────────────────┐ ┌───────────────┐ ┌──────────────┐ │
│  │ Public routes  │ │ Auth routes     │ │ Account routes│ │ Admin routes │ │
│  │ /  /badges     │ │ /login /signup  │ │ /perfil        │ │ /admin       │ │
│  │ /u/[username]  │ │ /esqueci-senha  │ │ (own profile)  │ │ /admin/     │ │
│  │ /privacidade   │ │ /redefinir-senha│ │                │ │  reports    │ │
│  │ (SSR, public)  │ │ /auth/callback  │ │ (auth guard)   │ │ (role guard)│ │
│  └───────┬────────┘ └────────┬────────┘ └───────┬────────┘ └──────┬───────┘ │
│          │                   │                   │                │        │
│          └───────────────────┴─────────┬─────────┴────────────────┘        │
│                                         ▼                                  │
│                     Server Actions (src/lib/actions/*.ts)                  │
│    setCompletionStatus · createSession/updateSession/deleteSession/       │
│    moveSessionUp/Down · createCourse/updateCourse/deleteCourse/           │
│    moveCourseUp/Down · updateProfile · createBadgePost/toggleReaction/    │
│    reportPost  (Zod validation → Supabase client scoped to caller session)│
└───────────────────────────┬─────────────────────────────────────────────┬─┘
                             │ Supabase JS client (user JWT, RLS enforced) │
                             ▼                                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                 SUPABASE                                   │
│  ┌─────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │ Postgres (RLS on ALL tables) │  │ Storage                          │   │
│  │ profiles (+username)         │  │  "badges" (user-uploaded Mural   │   │
│  │ sessions (NEW)                │  │   photos, folder-scoped RLS)     │   │
│  │ courses (+session_id,         │  │  "course-badges" (NEW — official │   │
│  │   sort_order, badge_image)    │  │   badge images, sysadmin write,  │   │
│  │ completions (+status)         │  │   public read)                   │   │
│  │ badge_posts · badge_reactions │  └──────────────────────────────────┘   │
│  │ badge_reports                 │  ┌──────────────────────────────────┐   │
│  │ mural_entries (NEW, view)     │  │ Auth (email/password only,       │   │
│  │ is_sysadmin() SECURITY        │  │  email confirmations OFF,        │   │
│  │  DEFINER helper (existing)    │  │  password-reset flow enabled)    │   │
│  └───────────────────────────────┘  └──────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Theme system | Dark-default, persistent light/dark toggle, zero flash-of-wrong-theme | CSS custom properties (`@theme inline`, `.dark` class) + one inline pre-paint `<script>`, no runtime dependency |
| Design primitives | `Button`/`Input`/`Label`/`Card`, ported pixel-for-pixel from `caixa-forte-app` | Tailwind v4 + inline styles, `src/components/ui/` |
| Sessions | Admin-managed grouping entity (was free-text `category`), reorderable | New `sessions` table, Server Actions, admin UI |
| Interest tracking | 3-state cycle per row (neutral → interested → done → neutral) | `completions.status` column, client component + Server Action |
| Badge images | Official image per row, resolved at content-authoring time | `courses.badge_image_path` (Supabase Storage `course-badges` bucket), admin upload field |
| Mural de Badges | Public feed: real user photos (unchanged) + auto-entries for "done" rows, always synced to the row's current badge | New `mural_entries` Postgres view (UNION), existing `badge_posts`/`badge_reactions` untouched |
| Public profiles | `/u/{username}`, self-customizable | `profiles.username` (new, unique), new route |
| Auth UX | Forgot password, show password, remember password (plaintext, as confirmed), no-confirmation signup | Ported from `caixa-forte-app`'s `_form.tsx` pattern + Supabase Auth config change |
| Cookie consent | LGPD/GDPR banner, ported pattern | `src/components/cookie-consent.tsx`, localStorage, links to `/privacidade` |
| Footer | Credits authors "Matheus Emanuel e Leonardo Chalhoub," links the public GitHub repo (`https://github.com/matheus-emanuel/minimal-list`), states new admin accounts are author-created only | `src/components/footer.tsx`, ported layout pattern from `caixa-forte-app` |
| JSON export | Client-side export of the user's own list | No new endpoint — built from data already fetched for the page |

---

## Key Decisions

### Decision 1: `sessions` becomes a normalized table, not a free-text column

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-17 |

**Context:** DEFINE's Open Question left this unresolved: the BRAINSTORM confirmed sessions stay a single flat grouping level (no separate `providers` table), but sysadmins must be able to create, rename, delete, and **reorder** sessions themselves — which a free-text column copied onto every row cannot support (there is no single place to rename "Databricks - Fundamentos" once, or to give it a stable sort position independent of row content).

**Choice:** A new `public.sessions` table (`id uuid`, `name text unique`, `sort_order int`), with `public.courses.session_id` as a foreign key replacing the old `category text` column.

**Rationale:** Matches the DEFINE goal verbatim ("Sysadmins can create, edit, delete, and reorder sessions... and the rows inside each session") — that is CRUD + reorder on sessions as first-class entities, which only a real table supports. It also fixes a latent data-integrity gap: today, renaming a category means updating every row's string field individually with no atomicity or typo protection.

**Alternatives Rejected:**
1. Keep `category text`, add a separate `session_order` lookup table keyed by the string — rejected: two sources of truth for the same concept (the string on `courses`, the order in the lookup table) can drift; a rename still requires a multi-row `UPDATE`.
2. Add a `sort_order` column to a distinct-values view over `category` — rejected: Postgres views can't hold independent per-value state (sort position) without a backing table anyway; this is the same idea with extra indirection.

**Consequences:**
- One additional migration to backfill: existing distinct `category` values become `sessions` rows (alphabetical `sort_order`), then `courses.session_id` is populated by matching name, then `category` is dropped.
- Every `courses` query that grouped by `category` now joins `sessions` — negligible cost at this scale (a few dozen sessions).

---

### Decision 2: 3-state tracking is a `status` column on the existing `completions` table, not a new table

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-17 |

**Context:** The interest button must cycle neutral → interested → done → neutral. Today, `completions` is a pure join table (row exists = done, row absent = not done).

**Choice:** Add `status text not null check (status in ('interested', 'done'))` to `completions`. Neutral state is still "no row" (matching DEFINE Assumption A-005 and the existing delete-on-unmark behavior in `toggleCompletion`). The unique constraint stays `(user_id, course_id)`.

**Rationale:** Reuses the existing table, RLS policies, and delete-on-reset semantics wholesale — only the write path changes (from upsert-with-implicit-true to upsert-with-explicit-status). This is the smallest change that satisfies the goal; a second table would duplicate the RLS policies and the unique constraint for no added value.

**Alternatives Rejected:**
1. A new `interests` table alongside `completions` — rejected: doubles the RLS surface and the join-table logic for a feature that's really "the same row, one more field."
2. An integer "cycle position" column (0/1/2) instead of a text enum — rejected: `status` as text is self-documenting in every query and every RLS policy; an integer needs a comment everywhere it's read.

**Consequences:**
- `toggleCompletion` is replaced by `setCompletionStatus(courseId, status: 'interested' | 'done' | null)` — `null` deletes the row, matching today's delete-on-off path exactly.
- The Mural's "done" trigger condition becomes `status = 'done'` instead of "row exists."

---

### Decision 3: Badge image resolution is an authoring-time, human(+Claude)-assisted workflow — never application code

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-17 |

**Context:** The DEFINE goal says a sysadmin (in practice, working with a Claude Code session, per the brainstorm) tries to find the exact official badge online, falls back to the provider's logo, and can always manually upload an override. DEFINE's Constraint is explicit: **no new runtime external API dependency**, and badge lookup must happen "only when a sysadmin authors/edits a row."

**Choice:** The running Next.js application never performs a web search. `courses.badge_image_path` is just a Storage object path, set exactly one way: the sysadmin uploads an image file through the admin course form (same upload mechanism as the existing Mural photo upload, pointed at the new `course-badges` bucket instead). Finding the *right* image — searching for the official badge, falling back to a provider logo — is a curation step performed by whoever is adding the row (the sysadmin, typically assisted by a Claude Code session doing the actual web lookup with its own tools), **before** that upload happens. This is a documented workflow, not a feature of the deployed app.

**Rationale:** A deployed Next.js app on Vercel has no image-search API available to it for free, and adding one would violate the DEFINE constraint outright (cost, rate limits, an external dependency on every future row-add). Treating the lookup as an editorial step means the application code is trivial (one file upload field) and 100% within budget — the "intelligence" lives in the curation workflow, exactly like `docs/certifications-backlog.md` already is a human(+Claude)-curated list, not a scraper.

**Alternatives Rejected:**
1. A Server Action that calls an image-search API (Bing/Google Custom Search, Clearbit logo API) when a row is saved — rejected outright by the DEFINE constraint; also the exact "Approach C" the BRAINSTORM already rejected.
2. A queued background job that searches asynchronously after row creation — rejected: still an external API dependency, just deferred; doesn't change the cost/rate-limit problem, only its timing.

**Consequences:**
- `CLAUDE.md`'s Content Curation section must document this workflow explicitly (added in Build): when a Claude Code session adds a new row, it searches for the badge, downloads/verifies the image, and uploads it via the admin flow (or a one-off authenticated script) as part of that same session — not a separate manual follow-up.
- If no image is ever manually set, `badge_image_path` is nullable and the UI falls back to a generic placeholder — this is the one honest gap versus "100% of rows have a badge" until curation catches up; acceptable per DEFINE Assumption A-001.

---

### Decision 4: Mural "auto-entries" are a Postgres view (owner-privilege projection), not materialized rows

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-17 |

**Context:** Marking a row "done" must make an entry appear on the public Mural using that row's *current* badge image — and if a sysadmin later changes the row's badge, every existing Mural entry for it must reflect the new image with no sync step. The `completions` table itself is **not** publicly readable (existing RLS: own rows only) — but a "done" row's existence needs to become public exactly at the moment it's marked done.

**Choice:** A new `public.mural_entries` view:

```sql
SELECT ... FROM public.badge_posts               -- real, manual uploads (unchanged)
UNION ALL
SELECT ... FROM public.completions c
  JOIN public.courses co ON co.id = c.course_id
  WHERE c.status = 'done'
    AND NOT EXISTS (                              -- don't double-show a course the
      SELECT 1 FROM public.badge_posts bp          -- user already posted a real photo for
      WHERE bp.user_id = c.user_id AND bp.course_id = c.course_id
    )
```

The view selects only the columns the Mural needs to display (author, course title, image, timestamp) — never the full `completions` row. It is owned by a role whose privileges are used for the view's own table access (Postgres's default view-execution model, not `security_invoker`), so it can read all of `completions` to build the "done" projection while the underlying table's RLS still fully protects direct queries against `completions` itself. `GRANT SELECT ON public.mural_entries TO anon, authenticated;` makes the view itself publicly readable — this base `GRANT` is required by the same rule Decision 1 of `DESIGN_COURSE_TRACKER.md` already established for every table in this schema.

**Rationale:** A view is a live query — "today's badge image" is read at Mural-render time by definition, with zero synchronization code. This is the only approach that satisfies both halves of the requirement (public visibility of a row that's otherwise private, and automatic staleness-free updates) with no triggers, no copy, no cache to invalidate.

**Alternatives Rejected:**
1. A trigger that inserts a `badge_posts` row when `completions.status` becomes `'done'`, copying the current `badge_image_path` — rejected: the copy goes stale the moment a sysadmin updates the row's badge; would need a second trigger on `courses` to cascade the update to every existing auto-post, adding real complexity DEFINE explicitly didn't ask for.
2. Compute the union in the Next.js Server Component with two separate queries — rejected: works, but duplicates the "don't double-count a course the user already posted about" de-duplication logic in application code instead of SQL, and any other future consumer (an API route, a different page) would have to reimplement it. A view is the single source of truth.

**Consequences:**
- The view's owner-privilege read of `completions` is a deliberate, narrow exception to "every table's RLS is the only path to its data" — documented here and in Security Considerations so a future reader doesn't mistake it for an oversight.
- Reporting/moderation (`badge_reports`) only ever targets real `badge_posts` rows (unchanged) — an auto-entry has no post `id` to report against; the UI must not render a report action on synthetic entries.

---

### Decision 5: Signup with no email confirmation is a Supabase Auth **configuration** change, not application code

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-17 |

**Context:** DEFINE requires self-serve signup to complete with zero email-confirmation step. Today's `signUp()` call already exists in `src/app/(auth)/signup/page.tsx`; whether a confirmation email is required is controlled entirely by the Supabase Auth project setting, not by application code.

**Choice:** Set `enable_confirmations = false` under `[auth.email]` in `supabase/config.toml` (local dev), and disable "Confirm email" in the remote Supabase project's Auth settings (Authentication → Providers → Email). No change to `signUp()` itself beyond adding the `name` field to `options.data`.

**Rationale:** This is the officially supported Supabase mechanism for this exact requirement — there's no code-level way to "skip" confirmation when the project requires it, and conversely no code is needed once the project doesn't. Matches the simplicity ladder: a native platform feature (project config) beats any home-rolled workaround.

**Alternatives Rejected:**
1. Auto-confirm the user server-side via a Server Action calling the Admin API right after signup — rejected: needs the service role key in a request-time code path, which the existing `CLAUDE.md` convention (and DESIGN_COURSE_TRACKER.md's Security Considerations) explicitly forbids; also strictly more code than a one-line config flip.

**Consequences:**
- This must be flagged clearly in the Build report as a **manual step in the remote Supabase dashboard** — it is not captured by a migration file, so it will not "just apply" via `supabase db push`.

---

### Decision 6: Theme system uses CSS custom properties + one inline script — no theming library

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-17 |

**Context:** Need dark-default, persistent, flash-free light/dark theming, matching `caixa-forte-app` exactly (per the DEFINE goal and the already-adopted Tailwind v4 migration).

**Choice:** Port `caixa-forte-app`'s exact mechanism: CSS custom properties for every token (`--color-canvas`, `--color-strong`, etc.), redefined under a `.dark` class selector, wired through Tailwind v4's `@theme inline`. Persistence is a `theme` cookie (readable server-side, so SSR can render the right `color-scheme` immediately) set by a tiny inline `<script>` in `<head>` that runs before first paint — no `next-themes` or similar package.

**Rationale:** `caixa-forte-app` already solved this exact problem, including the accessibility details (`prefers-reduced-motion`, native-control `color-scheme` matching) — reusing it is Approach A from the BRAINSTORM, already user-confirmed. Adding a theming dependency would be a new package for something 25 lines of vanilla CSS/JS already does, failing the simplicity ladder's "already-installed dependency before new" and "native platform feature" rungs (there is no installed theming dependency, and CSS variables are the native mechanism).

**Alternatives Rejected:**
1. `next-themes` npm package — rejected: solves the same problem `caixa-forte-app`'s hand-rolled approach already solves, at the cost of a new dependency for a small, well-understood piece of code.
2. Theme in `localStorage` only, no cookie — rejected: causes a flash on first server-rendered paint (server doesn't know the preference) unless paired with the same inline pre-paint script anyway; a cookie lets the server render the correct `<html class="dark">` directly. The inline script still runs as a fast-path/fallback for localStorage-only cases (e.g., cookie blocked).

**Consequences:**
- One new small file (`src/lib/theme.ts`) shared by the pre-paint script, the toggle component, and (for SSR) `layout.tsx`.

---

### Decision 7: Username handling reuses the existing column-level `GRANT` pattern, not a new authorization mechanism

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-17 |

**Context:** `profiles.username` must be self-editable by its owner but never let a user overwrite someone else's, and must never allow writing `role` (already solved by Decision 2 of `DESIGN_COURSE_TRACKER.md`).

**Choice:** Add `username citext unique not null` to `profiles`. Extend the existing `GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;` to `GRANT UPDATE (display_name, avatar_url, username) ON public.profiles TO authenticated;` — no new policy needed, the existing `profiles: own update` RLS policy (`auth.uid() = id`) already covers it. Uniqueness is enforced by the column's own `UNIQUE` constraint (case-insensitive via `citext`), which Postgres checks atomically — no race condition between a client-side check and the write.

**Rationale:** This is exactly the mechanism `DESIGN_COURSE_TRACKER.md` Decision 2 already established for `display_name`/`avatar_url` — reuse it rather than inventing a parallel one. `citext` (already a common Postgres extension, no new dependency) makes "Alice" and "alice" collide as the same username, matching normal user expectations without application-level normalization code.

**Alternatives Rejected:**
1. Application-level uniqueness check (`SELECT` then `INSERT`) before allowing a username change — rejected: TOCTOU race between two users claiming the same name simultaneously; the DB constraint is the only race-free guarantee, matching this project's established "DB is the real boundary" principle.
2. Plain `text` with a separate `lower(username)` unique index — rejected: `citext` does the same thing as a first-class type, so every query and RLS policy reads naturally without needing to remember to wrap comparisons in `lower()`.

**Consequences:**
- The Server Action that maps the DB's unique-violation error (Postgres code `23505`) to the friendly inline error required by AT-008.
- `citext` extension must be enabled once (`CREATE EXTENSION IF NOT EXISTS citext;`) in the same migration.

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `supabase/migrations/0007_sessions.sql` | Create | `sessions` table (id, name, sort_order) + RLS (public read, sysadmin write via `is_sysadmin()`) | @agentspec:cloud:supabase-specialist | None |
| 2 | `supabase/migrations/0008_courses_session_and_sort.sql` | Create | Adds `session_id` FK + `sort_order` to `courses`; backfills `sessions` from distinct `category` values, links rows, drops `category` | @agentspec:cloud:supabase-specialist | 1 |
| 3 | `supabase/migrations/0009_completions_status.sql` | Create | Adds `status` check column to `completions` (Decision 2), backfills existing rows to `'done'` | @agentspec:cloud:supabase-specialist | None |
| 4 | `supabase/migrations/0010_course_badges.sql` | Create | Adds `badge_image_path` to `courses`; creates `course-badges` Storage bucket (public read, sysadmin write) + RLS | @agentspec:cloud:supabase-specialist | 2 |
| 5 | `supabase/migrations/0011_profiles_username.sql` | Create | `citext` extension, `username` column + unique constraint, extends column-level `GRANT` (Decision 7) | @agentspec:cloud:supabase-specialist | None |
| 6 | `supabase/migrations/0012_mural_entries_view.sql` | Create | `mural_entries` view (Decision 4) + `GRANT SELECT` to `anon, authenticated` | @agentspec:cloud:supabase-specialist | 3, 4 |
| 7 | `supabase/config.toml` | Modify | `[auth.email] enable_confirmations = false` (Decision 5, local dev) | @general | None |
| 8 | `src/lib/supabase/types.ts` | Modify (generated) | Regenerate via `npm run db:types` against migrations 1–6 | @agentspec:cloud:supabase-specialist | 1–6 |
| 9 | `package.json` | Modify | Tailwind v3 → v4 (`tailwindcss` v4, add `@tailwindcss/postcss`, drop `autoprefixer`) | @general | None |
| 10 | `src/config/postcss.config.mjs` | Modify | Swap plugin to `@tailwindcss/postcss` | @general | 9 |
| 11 | `src/config/tailwind.config.ts` | Delete | Tailwind v4 config lives in CSS (`@theme`), file no longer needed | @general | 9 |
| 12 | `src/app/globals.css` | Modify | Full v4 token rewrite (Decision 6), ported from `caixa-forte-app` | @general | 9, 10, 11 |
| 13 | `src/lib/theme.ts` | Create | Theme cookie constants + read/write helpers shared by init script, toggle, SSR (Decision 6) | @general | None |
| 14 | `src/lib/validation/schemas.ts` | Modify | `SessionSchema`, updated `CourseSchema` (session_id, badge, sort_order), `SetCompletionStatusSchema`, `ProfileSchema` (username/display_name/avatar) | @general | None |
| 15 | `src/lib/actions/sessions.ts` | Create | `createSession`, `updateSession`, `deleteSession`, `moveSessionUp`, `moveSessionDown` | @general | 1, 14 |
| 16 | `src/lib/actions/courses.ts` | Modify | `session_id`/`badge_image_path` fields, `moveCourseUp`, `moveCourseDown`, badge upload wiring | @general | 2, 4, 14 |
| 17 | `src/lib/actions/completions.ts` | Modify | Replaces `toggleCompletion` with `setCompletionStatus` (Decision 2) | @general | 3, 14 |
| 18 | `src/lib/actions/profile.ts` | Create | `updateProfile` (name/photo/username), maps Postgres `23505` → friendly "username taken" error (Decision 7, AT-008) | @general | 5, 14 |
| 19 | `src/components/ui/button.tsx` | Create | Ported `Button` primitive (variants) from `caixa-forte-app` | @general | 12 |
| 20 | `src/components/ui/input.tsx` | Create | Ported `Input` primitive | @general | 12 |
| 21 | `src/components/ui/label.tsx` | Create | Ported `Label` primitive | @general | 12 |
| 22 | `src/components/ui/card.tsx` | Create | Ported `Card` primitive (spacious session containers) | @general | 12 |
| 23 | `src/components/theme-toggle.tsx` | Create | Light/dark switch, writes theme cookie + `.dark` class | @general | 13 |
| 24 | `src/components/cookie-consent.tsx` | Create | Ported LGPD/GDPR banner pattern, minimal-list-accurate copy, links to `/privacidade` | @general | 19 |
| 25 | `src/components/footer.tsx` | Create | Ported footer pattern: credits "Matheus Emanuel e Leonardo Chalhoub" as authors, links the public GitHub repo (`https://github.com/matheus-emanuel/minimal-list`), "new admins created by authors" message, Termos/Privacidade links | @general | 12 |
| 26 | `src/components/user-menu.tsx` | Create | "Olá {name}" greeting with email fallback + set-name prompt (AT-010), Perfil link, Log Out | @general | 12 |
| 27 | `src/components/badge-image.tsx` | Create | Shared badge `<img>` wrapper with placeholder fallback | @general | 12 |
| 28 | `src/components/interest-button.tsx` | Create | 3-state cycle button (Decision 2, AT-003) | @general | 17 |
| 29 | `src/components/reorder-arrows.tsx` | Create | Shared up/down control for admin session + row reorder | @general | 12 |
| 30 | `src/app/layout.tsx` | Modify | Pre-paint theme script, Geist fonts, `UserMenu`, `Footer`, `CookieConsent` mount, `lang="pt-BR"` | @general | 13, 23, 24, 25, 26 |
| 31 | `src/app/page.tsx` | Modify | Spacious card-per-session public list, `InterestButton`, `BadgeImage`, links to sessions grouping | @general | 22, 27, 28 |
| 32 | `src/app/(auth)/login/_form.tsx` | Create | Split from `page.tsx`; ported caixa-forte pattern: "Esqueci minha senha," "Mostrar senha," "Salvar senha" (plaintext, as confirmed) | @general | 19, 20, 21 |
| 33 | `src/app/(auth)/login/page.tsx` | Modify | pt-BR copy, renders `_form.tsx` | @general | 32 |
| 34 | `src/app/(auth)/signup/page.tsx` | Modify | Adds name field, pt-BR copy, no-confirmation flow (Decision 5) | @general | 19, 20, 21 |
| 35 | `src/app/esqueci-senha/page.tsx` | Create | Request password reset (`resetPasswordForEmail`) | @general | 19, 20 |
| 36 | `src/app/redefinir-senha/page.tsx` | Create | Set new password, completes the Supabase reset flow | @general | 19, 20 |
| 37 | `src/app/perfil/page.tsx` | Create | Name/photo/username settings form (AT-008), regular-user rights messaging | @general | 18, 19, 20, 21 |
| 38 | `src/app/u/[username]/page.tsx` | Create | Public profile: user's done rows with badge icons | @general | 27 |
| 39 | `src/app/privacidade/page.tsx` | Create | Accurate Privacy Policy copy (per DEFINE's Content accuracy constraint) | @general | None |
| 40 | `src/app/admin/page.tsx` | Modify | Sessions list with reorder, nested course management | @general | 15, 29 |
| 41 | `src/app/admin/session-form.tsx` | Create | Create/edit/delete a session | @general | 15, 19, 20 |
| 42 | `src/app/admin/course-form.tsx` | Modify | Session picker, badge upload field, reorder arrows | @general | 16, 29 |
| 43 | `src/app/badges/page.tsx` | Modify | Queries `mural_entries` view instead of `badge_posts` directly (Decision 4) | @general | 6 |
| 44 | `src/app/badges/badge-feed.tsx` | Modify | Renders manual + synthetic entries uniformly; hides report action on synthetic entries | @general | 43 |
| 45 | `tests/rls/sessions.test.ts` | Create | Public read, sysadmin-only write | @agentspec:cloud:supabase-specialist | 1 |
| 46 | `tests/rls/completions.test.ts` | Modify | `status` enum cases: interested, done, delete-on-reset | @agentspec:cloud:supabase-specialist | 3 |
| 47 | `tests/rls/profiles.test.ts` | Modify | Username uniqueness (DB-level), self-update grant covers new column | @agentspec:cloud:supabase-specialist | 5 |
| 48 | `tests/rls/mural-entries.test.ts` | Create | Public read of the view; manual + synthetic rows both present; no duplicate when both exist | @agentspec:cloud:supabase-specialist | 6 |
| 49 | `tests/e2e/theme.spec.ts` | Create | AT-001: dark default, toggle persists | @general | 23, 30 |
| 50 | `tests/e2e/course-tracking.spec.ts` | Modify | AT-003: 3-state cycle | @general | 28, 31 |
| 51 | `tests/e2e/admin.spec.ts` | Modify | AT-004: session/row CRUD + reorder | @general | 40, 41, 42 |
| 52 | `tests/e2e/signup.spec.ts` | Create | AT-002: signup with zero confirmation step | @general | 34 |
| 53 | `tests/e2e/profile.spec.ts` | Create | AT-008 (username collision), AT-010 (greeting fallback) | @general | 37, 26 |
| 54 | `tests/e2e/export.spec.ts` | Create | AT-007: JSON export completeness | @general | 31 |
| 55 | `tests/e2e/cookie-consent.spec.ts` | Create | AT-011: consent persistence | @general | 24 |
| 56 | `tests/e2e/badges.spec.ts` | Modify | AT-005 (badge resolution), AT-006 (mural live sync) | @general | 43, 44 |

**Total Files:** 56

---

## Agent Assignment Rationale

> Agents discovered from `${CLAUDE_PLUGIN_ROOT}/agents/` — Build phase invokes matched specialists.

| Agent | Files Assigned | Why This Agent |
|-------|----------------|-----------------|
| `@agentspec:cloud:supabase-specialist` | 1–6, 8, 45–48 | Live Supabase MCP access; specializes in RLS policy design, Storage bucket config, and Postgres views — exactly the schema/security-critical half of this feature, same split `DESIGN_COURSE_TRACKER.md` already used successfully |
| `@general` (build-agent, direct execution) | 7, 9–44, 49–56 | Next.js App Router pages/components, Server Actions, Tailwind config, and Playwright tests have no dedicated frontend specialist in the current agent roster — handled directly by the build phase using the patterns below, matching precedent |

**Agent Discovery:**
- Scanned: `${CLAUDE_PLUGIN_ROOT}/agents/**/*.md`
- Matched by: KB domain (`supabase`) for schema/security/storage files; no match found for Next.js App Router UI code or Tailwind, so those stay with general build execution — consistent with `DESIGN_COURSE_TRACKER.md`'s prior finding

---

## Code Patterns

### Pattern 1: Reorder via `sort_order` swap-with-neighbor (sessions and courses)

```sql
-- One column, reused by every reorderable table
alter table public.sessions add column sort_order int not null default 0;
```

```typescript
// src/lib/actions/sessions.ts — same shape reused for courses
'use server'

export async function moveSessionUp(sessionId: string) {
  const supabase = await createServerClient()

  const { data: current } = await supabase
    .from('sessions')
    .select('id, sort_order')
    .eq('id', sessionId)
    .single()
  if (!current) return { error: 'not_found' as const }

  const { data: neighbor } = await supabase
    .from('sessions')
    .select('id, sort_order')
    .lt('sort_order', current.sort_order)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!neighbor) return { ok: true, error: undefined } // already first

  // Swap — RLS (sysadmin write) enforces who may call this either way.
  await supabase.from('sessions').update({ sort_order: neighbor.sort_order }).eq('id', current.id)
  await supabase.from('sessions').update({ sort_order: current.sort_order }).eq('id', neighbor.id)

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, error: undefined }
}
```

### Pattern 2: `mural_entries` view (Decision 4)

```sql
create view public.mural_entries as
select
  bp.id,
  bp.user_id,
  bp.course_id,
  bp.image_path as image_path,       -- from Storage bucket "badges"
  'manual'::text as source,
  bp.caption,
  bp.created_at
from public.badge_posts bp
union all
select
  null::uuid as id,
  c.user_id,
  c.course_id,
  co.badge_image_path as image_path, -- from Storage bucket "course-badges"
  'auto'::text as source,
  null::text as caption,
  c.created_at
from public.completions c
join public.courses co on co.id = c.course_id
where c.status = 'done'
  and not exists (
    select 1 from public.badge_posts bp
    where bp.user_id = c.user_id and bp.course_id = c.course_id
  );

grant select on public.mural_entries to anon, authenticated;
-- No RLS on a view — the underlying tables' privileges plus this explicit
-- GRANT are the full access story here (Decision 4).
```

### Pattern 3: 3-state completion cycle (client + Server Action)

```typescript
// src/components/interest-button.tsx
type Status = 'neutral' | 'interested' | 'done'
const NEXT: Record<Status, Status> = { neutral: 'interested', interested: 'done', done: 'neutral' }

function handleClick() {
  const next = NEXT[status]
  setStatus(next) // optimistic
  startTransition(async () => {
    const result = await setCompletionStatus(courseId, next === 'neutral' ? null : next)
    if (result.error) setStatus(status) // rollback on failure
  })
}
```

```typescript
// src/lib/actions/completions.ts
export async function setCompletionStatus(courseId: string, status: 'interested' | 'done' | null) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' as const }

  if (status === null) {
    const { error } = await supabase.from('completions').delete()
      .eq('user_id', user.id).eq('course_id', courseId)
    if (error) return toActionError(error)
  } else {
    const { error } = await supabase.from('completions')
      .upsert({ user_id: user.id, course_id: courseId, status }, { onConflict: 'user_id,course_id' })
    if (error) return toActionError(error)
  }
  revalidatePath('/')
  return { ok: true, error: undefined }
}
```

### Pattern 4: Pre-paint theme script (Decision 6, no dependency)

```typescript
// src/lib/theme.ts
export const THEME_COOKIE = 'theme'
export type Theme = 'dark' | 'light'

// Inlined into <head> by src/app/layout.tsx via dangerouslySetInnerHTML —
// runs before first paint, so there is no flash of the wrong theme.
export const themeInitScript = `
(function () {
  var m = document.cookie.match(/(?:^|; )theme=(dark|light)/);
  var theme = m ? m[1] : 'dark'; // dark is the default, per DEFINE
  document.documentElement.classList.toggle('dark', theme === 'dark');
})();
`
```

### Pattern 5: Username self-update with friendly collision error (Decision 7)

```sql
create extension if not exists citext;
alter table public.profiles add column username citext unique not null default gen_random_uuid()::text;
-- default is a placeholder only for the backfill instant; every row gets a
-- real value in the same migration before the NOT NULL is enforced going forward.

grant update (display_name, avatar_url, username) on public.profiles to authenticated;
-- Existing "profiles: own update" policy (auth.uid() = id) already covers this —
-- no new RLS policy needed (Decision 7).
```

```typescript
// src/lib/actions/profile.ts
function toActionError(error: { code?: string; message: string }) {
  if (error.code === '23505') return { error: 'username_taken' as const } // AT-008
  if (error.code === '42501') return { error: 'not_authorized' as const }
  return { error: error.message }
}
```

### Pattern 6: Tailwind v4 tokens (ported from `caixa-forte-app`, Decision 6)

```css
/* src/app/globals.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

:root {
  --color-canvas: #dcdce0;
  --color-strong: #000000;
  /* ...full light palette, see caixa-forte-app/app/globals.css for the source values */
}
.dark {
  --color-canvas: #09090b;
  --color-strong: #e4e4e7;
  /* ...full dark palette */
}
@theme inline {
  --color-canvas: var(--color-canvas);
  --color-strong: var(--color-strong);
  --font-sans: var(--font-geist-sans), system-ui, sans-serif;
}
```

---

## Data Flow

```text
Interest cycle (AT-003):
1. Usuário logado clica no InterestButton de uma linha
   │
   ▼
2. Componente atualiza estado local otimisticamente (neutral→interested→done→neutral)
   │
   ▼
3. Server Action `setCompletionStatus` valida input, pega sessão do usuário
   │
   ▼
4. Upsert (status='interested'|'done') ou delete (neutral) em `completions`
   │  RLS confirma auth.uid() = user_id
   ▼
5. revalidatePath('/') — se status virou 'done', a linha passa a existir em
   `mural_entries` na próxima leitura, sem nenhum passo extra

Sysadmin adds a row with a badge (AT-005):
1. Sysadmin (com uma sessão Claude Code, tipicamente) pesquisa o badge oficial
   da certificação na internet — passo editorial, fora do app (Decision 3)
   │
   ▼
2. Sysadmin abre /admin, cria a sessão (se necessária) e a linha, fazendo
   upload da imagem encontrada no campo de badge do formulário
   │
   ▼
3. Server Action `createCourse` grava `badge_image_path` apontando pro
   Storage bucket "course-badges" — nenhuma chamada de rede adicional
   │
   ▼
4. Toda leitura futura da linha (lista pública, mural, exportação JSON)
   já mostra o badge — sem lookup em tempo de request

Mural live sync (AT-006):
1. Sysadmin edita a linha e troca `badge_image_path` para uma imagem nova
   │
   ▼
2. `mural_entries` é uma view — não guarda cópia da imagem
   │
   ▼
3. Próxima vez que qualquer usuário abre /badges, a entrada automática
   daquela linha já mostra a imagem nova — join lido na hora, sem cache
```

---

## Integration Points

| External System | Integration Type | Authentication |
|-----------------|-------------------|-----------------|
| Supabase Postgres | `@supabase/supabase-js` via `@supabase/ssr` | User JWT; RLS enforced per request; `mural_entries` view is the one deliberate owner-privilege exception (Decision 4) |
| Supabase Auth | `@supabase/ssr` (`signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser`) | Email/password only (magic link dropped per DEFINE Out of Scope); email confirmations disabled (Decision 5) |
| Supabase Storage | `supabase.storage.from('badges')` (unchanged) + `supabase.storage.from('course-badges')` (new) | Same user JWT; `badges` stays folder-scoped per user, `course-badges` is sysadmin-write/public-read |
| Vercel | Git-based deploy, Next.js first-party integration | N/A (build-time env vars only) |
| Google Fonts (Geist) | `next/font/google` (bundled at build time, no runtime fetch) | N/A |

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal |
|-----------|-------|-------|-------|----------------|
| RLS/Integration | Every new/changed policy: sessions read/write, completions status transitions, profiles username uniqueness + grant, mural_entries public read | `tests/rls/*.test.ts` | Vitest + `supabase-js` against local `supabase start`, multiple real test users | 100% of policies (per project-wide `CLAUDE.md` testing requirement) |
| Unit | Zod schemas (session, course, profile, completion status) | `src/lib/validation/*.test.ts` | Vitest | 100% (per project-wide testing requirement) |
| E2E | AT-001 through AT-011 | `tests/e2e/*.spec.ts` | Playwright against local dev server | Every acceptance test in DEFINE_SITE_REDESIGN.md |

**Local RLS testing setup:** unchanged from `DESIGN_COURSE_TRACKER.md` — `supabase start` provides the real local Postgres/Auth/Storage instance; no cloud project needed to run the full suite.

**Note on the project's "100% coverage" requirement (`CLAUDE.md`):** every Server Action listed in the File Manifest ships with a corresponding RLS test (for its policy) and/or e2e test (for its user-facing flow) in the same manifest — Build must not defer any of rows 45–56 to a follow-up change.

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|---------------------|--------|
| RLS policy denial (Postgres `42501`) | Server Action catches, returns `{error: 'not_authorized'}` (unchanged pattern) | No |
| Username collision (Postgres `23505`) | Server Action returns `{error: 'username_taken'}`; `/perfil` shows inline error (AT-008) | No |
| Password reset link expired/invalid | Supabase returns an auth error; `/redefinir-senha` shows "Link expirado, peça um novo" | No (user-initiated: request a new link) |
| Badge image missing (`badge_image_path is null`) | `BadgeImage` component renders a generic placeholder, never a broken `<img>` | N/A |
| Optimistic interest-cycle update fails | Client rolls back to the pre-click state (Pattern 3) | No (user can click again) |
| Cookie consent localStorage blocked (privacy mode) | Banner falls back to showing every visit — degraded but never blocks the site | N/A |

---

## Configuration

| Config Key | Type | Default | Description |
|------------|------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | string | — | Unchanged from `DESIGN_COURSE_TRACKER.md` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | — | Unchanged |
| `SUPABASE_SERVICE_ROLE_KEY` | string | — | Unchanged — server-only, never in runtime request paths |
| `[auth.email].enable_confirmations` | boolean (Supabase config) | `false` | Decision 5 — set in `supabase/config.toml` locally; must also be disabled in the remote project's dashboard |

---

## Security Considerations

- Every new table (`sessions`) follows the existing base-`GRANT`-plus-RLS pattern established in `DESIGN_COURSE_TRACKER.md` — public read, sysadmin-only write via `is_sysadmin()`.
- **`mural_entries` is a deliberate, narrow exception**: it reads across all users' `completions` rows via view-owner privilege to build a public projection (Decision 4). This must never be widened — the view selects only display-safe columns, never the full `completions` row, and RLS on `completions` itself is untouched (still own-rows-only for direct queries).
- `username` uniqueness is enforced by a DB constraint (`citext unique`), not an application-level check — closes the TOCTOU race two simultaneous signups/renames could otherwise hit.
- Role self-escalation protection (column-level `GRANT` excluding `role`, from `DESIGN_COURSE_TRACKER.md` Decision 2) is unchanged and still the only way `profiles.role` can be written.
- The `course-badges` Storage bucket is sysadmin-write/public-read — unlike `badges` (folder-scoped per user), there is no per-user write path, since only sysadmins add official badge images.
- No new runtime external API calls are introduced anywhere in this design (Decision 3) — badge resolution is 100% authoring-time.
- Cookie consent and the remember-password checkbox both write to `localStorage`/cookies client-side only — no new server-side storage of consent state, and the remember-password plaintext-storage risk is the user's own explicitly-confirmed, documented trade-off (DEFINE, not re-litigated here).
- `SUPABASE_SERVICE_ROLE_KEY` usage remains confined to one-off offline scripts (e.g., the Leonardo sysadmin account creation already performed this session) — never a Server Action or route handler.

---

## Observability

| Aspect | Implementation |
|--------|------------------|
| Logging | Unchanged: `console.error` in Server Actions on Supabase errors (Vercel Function Logs, free tier) |
| Metrics | Unchanged: Vercel Web Analytics + Supabase Dashboard, both free tier |
| Tracing | None — not justified at this scale (unchanged from `DESIGN_COURSE_TRACKER.md`) |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-17 | design-agent | Initial version, derived from DEFINE_SITE_REDESIGN.md v1.1 |

---

## Next Step

**Ready for:** `/build .claude/sdd/features/DESIGN_SITE_REDESIGN.md`
