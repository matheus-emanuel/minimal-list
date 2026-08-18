# BRAINSTORM: Site Redesign — Elegant Public Certification Tracker

> Exploratory session to clarify intent and approach before requirements capture

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | SITE_REDESIGN |
| **Date** | 2026-08-17 |
| **Author** | brainstorm-agent |
| **Status** | ✅ Complete (Defined) |

---

## Initial Idea

**Raw Input:** Redesign the existing "minimal-list" course/certification tracker to be visually elegant and professional (currently plain/ugly), with light/dark mode (default dark), matching auth UX patterns (forgot password, show password, remember password) from the user's other app `caixa-forte-app`. Add a 3-state interest-tracking button per row, JSON export for regular users, official badge images per certification (auto-resolved from the internet with provider-logo fallback, admin-overridable), a public per-user badge wall ("Mural de Badges"), custom public profile pages, and reordering for sysadmin-managed rows. Also requested: create a new sysadmin account for "Leonardo."

**Context Gathered:**
- This is **not greenfield** — `minimal-list` is a working Next.js 15 + Supabase app ("Course Tracker") already in production (Vercel + a live Supabase project), with a prior SDD cycle archived at `.claude/sdd/archive/COURSE_TRACKER/`.
- Current stack: Next.js 15 (App Router), React 19, Tailwind **v3** (config-based), `@supabase/ssr`, Zod validation, Vitest + Playwright.
- Data model already has: `profiles` (role: `user`/`sysadmin`, `display_name`, `avatar_url`), `courses` (title, url, category, tags, description), `completions` (boolean-style join table user↔course), `badge_posts` + `badge_reactions` (community photo-upload feed with likes/reports, rate-limited to 10/24h), Supabase Storage bucket `badges`.
- Current UI is bare Tailwind utility classes, no dark mode, no design tokens, no forgot-password/show-password/remember-password flow, single boolean completion checkbox (auth-only).
- Sysadmin promotion today is **manual** (direct DB update) — confirmed by inline SQL comments; no "matheus" reference exists anywhere in the repo (consistent with manual, out-of-band admin creation).
- The user's other app, `caixa-forte-app` (same author, separate repo at `/home/leochalhoub/caixa-forte-app`), has exactly the referenced patterns: Tailwind **v4** (`@import "tailwindcss"`, `@custom-variant dark`), CSS-variable light/dark tokens, Geist fonts, shadcn-style `Button`/`Input`/`Label` primitives, a `LoginForm` with "Esqueci minha senha" link, "Mostrar senha" checkbox, and a "Lembrar minha senha" checkbox that stores the **plaintext password in localStorage** (flagged to the user as a real risk; user explicitly confirmed keeping the same behavior).
- Live Supabase project confirmed at `escxwiyaofjbeklzrhol.supabase.co` (via `.env.local`, which is correctly gitignored).
- **Action taken during this session (explicitly authorized by user):** Found `leochalhoub@hotmail.com` already existed in the live Supabase project as an abandoned, unconfirmed signup (created 2026-08-07, never logged in). Updated it via the Supabase Admin API: set the requested password, confirmed the email, set `display_name = 'Leonardo'`, and promoted `profiles.role` to `sysadmin`. Account is live and usable now.

**Technical Context Observed (for Define):**

| Aspect | Observation | Implication |
|--------|-------------|-------------|
| Likely Location | `app/`, `lib/actions/`, `lib/supabase/`, `supabase/migrations/` | Existing Next.js App Router structure to extend, not replace |
| Relevant KB Domains | `supabase` (RLS, storage, auth patterns) | Ground RLS policy design and storage bucket setup in KB during /design |
| IaC Patterns | Supabase CLI migrations (`supabase/migrations/000N_*.sql`), numbered sequentially | New schema changes continue this numbering (`0007_*.sql` onward) |
| Reference Codebase | `/home/leochalhoub/caixa-forte-app` (same author) | Source of truth for design tokens, auth UX components, footer pattern — copy mechanism, not just look |

---

## Discovery Questions & Answers

| # | Question | Answer | Impact |
|---|----------|--------|--------|
| 1 | Keep, drop, or extend the existing community "Mural de Badges" (photo-upload feed)? | Keep it, and bring "real badges" via link or upload | Mural stays, gains an auto-populated official-badge layer |
| 2 | Where should the official badge image/link live — per-certification or per-user-post? | Admin-managed per row; Claude/admin resolves the exact badge online, falls back to provider logo, admin can manually override with an upload | New `badge_image_url` field on the courses/rows table, resolved at content-authoring time (not live at request time) |
| 3 | Does "Badges tab always has something" refer to the personal list or the community Mural? | The community Mural — never empty for anyone who completed at least one row | Mural becomes public + auto-populated per completed row, not just manual uploads |
| 4 | How do auto-fetched official badges combine with user-uploaded photos in the Mural? | Marking a row "done" auto-creates a Mural entry (name + badge image, official or provider-logo) for that user; if admin later updates the row's badge, the user's Mural entry updates too (live reference, not a copy) | Mural entries for completions must be computed/joined live against the row's current badge image, not materialized as a static copy |
| 5 | Public or private Mural entries? | Public — shared feed, same as today | Existing `badge_posts` RLS (public read) extends to auto-generated entries |
| 6 | Public profile: default route and customization? | Default route = username; user can customize a unique path in "Perfil"; must guarantee uniqueness | New `profiles.username` column (unique), profile page, path-collision handling needed |
| 7 | How to avoid username colliding with real routes (`/login`, `/admin`, etc.)? | Move all profile pages under a `/u/` prefix instead of site root | Eliminates reserved-word list entirely; `/u/{username}` route |
| 8 | Provider/session data model — real two-level hierarchy or flat? | Flat — rename `category` to `session`, no separate `providers` table | Simpler migration: rename/relabel existing column, no new table |
| 9 | Replace the boolean completion checkbox with the 3-state cycle button? | Yes — full replacement | `completions` table needs a status dimension (`interested` / `done`), not just boolean presence |
| 10 | Reorder mechanism for sessions and rows? | Up/down arrow buttons (not drag-and-drop) | Simpler UI, no drag library dependency, needs persisted `sort_order` column(s) |
| 11 | Remember-password behavior — same risky plaintext-localStorage as caixa-forte, or safer (native browser password manager)? | Same as caixa-forte (explicitly informed of the risk, user confirmed) | Ported as-is from caixa-forte's `LoginForm` pattern |
| 12 | JSON export scope? | Full snapshot: title, link, session, status, badge, timestamp | Export must join across courses + completions + badge image, not just raw completion rows |
| 13 | When to create the Leonardo sysadmin account? | Immediately, using the live service role key | Done during this brainstorm session (see Context Gathered) |
| 14 | Should the main page fit in one viewport? | No — corrected mid-session: full list will scroll; must still be elegant at any length | Removes the "fits one screen" constraint from the original ask; design focuses on scroll quality, not viewport-fitting |
| 15 | List page density given it will scroll? | Spacious — card-like sessions, generous whitespace, premium feel over dense scanning | Layout approach: card/section-based sessions, not a compact table |
| 16 | Design system approach — upgrade to Tailwind v4 + reuse caixa-forte's actual components, or stay on v3 and hand-roll? | Upgrade to Tailwind v4, reuse caixa-forte's tokens/components/dark-mode mechanism directly | Real dependency upgrade required; `tailwind.config.ts` → CSS-based v4 config |

**Minimum Questions:** 3 (far exceeded — 16 asked given the scope of a full site redesign plus new feature surface)

---

## Sample Data Inventory

| Type | Location | Count | Notes |
|------|----------|-------|-------|
| Seed certification data | `supabase/seed.sql` (sourced from `Cursos indicados.md`) | 24 rows across 8 categories | Real production content — Databricks, Oracle, HackerRank, Scrum; each has a real training URL. Confirms every row already has a link, satisfying "all rows must have links" |
| Auth UX reference | `caixa-forte-app/app/(auth)/login/_form.tsx`, `page.tsx` | 1 full login form + page | Ground truth for forgot-password link, show-password checkbox, remember-password checkbox (including its plaintext-storage mechanism) |
| Design token reference | `caixa-forte-app/app/globals.css` | Full light + dark token set | Ground truth for the exact CSS variables, Tailwind v4 `@theme inline` wiring, Geist font stack, reduced-motion handling |
| Footer reference | `caixa-forte-app/components/footer.tsx` | 1 component | Ground truth for "created by author" messaging, version/release stamp pattern, contact links |
| Existing schema | `supabase/migrations/0001`–`0006` | 6 migrations | Ground truth for current RLS conventions (`is_sysadmin()` SECURITY DEFINER helper, base GRANT + policy layering) that new migrations must follow |

**How samples will be used:**
- `caixa-forte-app` components are copied and adapted (not reinvented) for login, footer, and the token system — Define/Design should reference exact file paths above.
- Existing RLS/migration conventions in `supabase/migrations/0001-0006` are the pattern new tables (`badge_posts` extension, `completions` status column, `profiles.username`) must follow, per this codebase's established `is_sysadmin()` helper.

---

## Approaches Explored

### Approach A: Tailwind v4 + shadcn-style primitives, ported directly from caixa-forte ⭐ Recommended (Confidence 0.85)

**Description:** Migrate `minimal-list` from Tailwind v3 (config-based) to v4 (`@import "tailwindcss"`, CSS-variable tokens, `@custom-variant dark`), and port the same Button/Input/Label/Card primitives, Geist fonts, and dark-mode toggle mechanism caixa-forte already uses in production.

**Pros:**
- Reuses working, already-validated patterns instead of re-deriving the same look from scratch
- Guarantees visual/UX consistency with the user's other app
- caixa-forte's tokens already solve accessibility concerns (reduced-motion, `color-scheme` matching, contrast-checked palettes)

**Cons:**
- Real dependency upgrade — `tailwind.config.ts` and existing utility classes need migration
- Slightly more upfront file churn than patching v3 in place

**Why Recommended:** User explicitly pointed at caixa-forte as the reference source (KB evidence level: codebase pattern match, 0.85 confidence — validated further by minimal-list having almost no existing style investment to preserve, since current UI is bare utility classes with no dark mode at all). User confirmed this approach directly (Discovery Q16).

---

### Approach B: Stay on Tailwind v3, hand-roll CSS variables for dark mode

**Description:** Keep the current config-based Tailwind v3 setup; manually add CSS custom properties for light/dark tokens; build one-off styled components without adopting a shared primitive library.

**Pros:**
- No dependency version upgrade risk
- Smaller diff against current `tailwind.config.ts`

**Cons:**
- Have to rebuild the dark-mode toggle mechanism, token system, and accessible form primitives from scratch instead of reusing tested code
- Higher risk of visual/UX drift from the caixa-forte reference the user explicitly asked to match

**Why Not Recommended:** User rejected this in favor of Approach A (Discovery Q16).

---

### Approach C: Live badge image resolution (per-request API call) — considered and rejected

**Description:** Instead of resolving official badge images at content-authoring time, call an external image-search API (Bing/Google Custom Search, Clearbit logo API) live whenever a row or badge page renders.

**Pros:** Always fresh, no manual curation step.

**Cons:** Adds an external API dependency, cost, rate limits, and failure modes to every page render of a small personal/team site; badge images for certifications rarely change once found.

**Why Not Recommended:** Fails the simplicity ladder — a one-time editorial lookup (done when the admin adds/edits a row) achieves the same user-visible outcome ("Badges tab always has something") with zero runtime dependency. User's own answer (Discovery Q2 — "Claude tries to find... Admin can manually upload") confirms this is an authoring-time action, not a runtime service.

---

## Data Engineering Context

Not applicable — this is a small-scale content-managed application (tens to low hundreds of rows), not a data pipeline. Schema changes are captured as ordinary Supabase migrations, not modeled here.

---

## Selected Approach

| Attribute | Value |
|-----------|-------|
| **Chosen** | Approach A (Tailwind v4 + ported caixa-forte primitives) for the design system; badge images resolved at authoring time (rejecting Approach C); Mural entries computed live via join, not materialized on completion (see Key Decisions) |
| **User Confirmation** | 2026-08-17, explicit answers to Discovery Q16 (design system) and Q2/Q4 (badge sourcing timing and live-sync behavior) |
| **Reasoning** | Direct reuse of a working, already-validated reference beats re-deriving the same result; avoids new runtime dependencies for a small site |

---

## Key Decisions Made

| # | Decision | Rationale | Alternative Rejected |
|---|----------|-----------|----------------------|
| 1 | Upgrade to Tailwind v4, port caixa-forte's token/component system | Direct reuse of validated patterns; user explicitly requested matching that app | Hand-rolling v3-based dark mode (Approach B) |
| 2 | Official badge images resolved at row authoring time (web lookup with provider-logo fallback, admin-overridable upload), not fetched live per-request | No runtime API dependency, cost, or failure surface for a small site; matches user's own description of the workflow | Live per-request image-search API (Approach C) |
| 3 | Mural "auto-post" for completed rows is computed via a live join against the row's current badge image, not copied into a materialized `badge_posts` row | Guarantees the user's stated requirement — admin updates a row's badge, every user's Mural entry updates automatically, with zero sync logic needed | Trigger that materializes a `badge_posts` row on completion (would need extra sync logic to stay current) |
| 4 | Flat `session` field (renamed from `category`), no separate `providers` table | User explicitly rejected the two-level hierarchy as unnecessary | Provider → Session → Row three-tier model |
| 5 | Reorder via up/down arrow buttons with persisted `sort_order` | User preference; simpler and fully accessible, no drag-and-drop dependency | Drag-and-drop reordering |
| 6 | Public profile pages under `/u/{username}` prefix | Eliminates route-collision risk entirely (vs. root-level usernames colliding with `/login`, `/admin`, etc.) | Root-level username routes + reserved-word blocklist |
| 7 | Remember-password checkbox stores the real password in localStorage, matching caixa-forte exactly | User was explicitly warned of the risk and confirmed wanting the same behavior anyway | Safer variant using native browser password-manager autofill only |
| 8 | Leonardo's sysadmin account created immediately during this session via Supabase Admin API (found and repaired an existing abandoned signup rather than creating a duplicate) | User explicitly authorized "now"; service role key was available in gitignored `.env.local` | Deferring to Build phase or manual dashboard creation |
| 9 | Main page is not constrained to fit one viewport | User corrected this mid-session: the full list will necessarily scroll | Original "fit to screen" framing from the raw request |

---

## Features Removed (YAGNI)

| Feature Suggested | Reason Removed | Can Add Later? |
|-------------------|----------------|----------------|
| Magic-link ("Link mágico") login mode, present in the current login page | Not part of the caixa-forte reference the user asked to match; adds a second auth mode with no signal the user wants it kept; simpler single password-based flow (+ forgot password) matches the reference exactly | Yes — the current implementation already exists in git history and can be reintroduced without schema changes |
| Two-level Provider → Session → Row hierarchy | User explicitly said no; flat renamed field solves the stated need | Yes — a future migration could split `session` into `provider`+`session` if the catalog grows large enough to need it |
| Drag-and-drop reordering | User explicitly chose up/down arrows instead | Yes — `sort_order` column supports either UX; swapping to drag-and-drop later doesn't require a schema change |
| Live per-request badge image search API | Fails simplicity ladder for a small site; authoring-time resolution meets the same user-visible goal | Yes — could be added later as an admin-side "re-check for a better badge" button without changing the storage model |
| Badge provenance/source tracking column (how an image was found — official/provider-logo/manual) | Not requested; admin can already tell by re-checking or re-uploading; adds a column with no consumer | Yes — trivial to add later if auditing becomes a need |
| Root-level username routes with a reserved-word blocklist | User chose the `/u/` prefix instead, which removes the entire problem class | N/A — superseded, not deferred |

---

## Incremental Validations

| Section | Presented | User Feedback | Adjusted? |
|---------|-----------|---------------|-----------|
| Badge tab meaning (personal list vs. community Mural) | ✅ | Corrected — it's the community Mural, not personal list | Yes — re-scoped the entire badge-sourcing/Mural design around the public feed |
| Mural content mix (official badges + user photos) | ✅ | Clarified — completion auto-creates a public entry using the row's live badge image | Yes — settled on live-join computation over materialized rows |
| Main page viewport constraint | ✅ | Corrected mid-session — list will scroll, must stay elegant regardless | Yes — dropped "fit to screen" as a design constraint |
| List page density (spacious vs. dense) | ✅ | Confirmed — spacious, card-like, premium feel | No adjustment needed, direct answer |

**Minimum Validations:** 2 (met — 4 completed, including one live correction mid-session)

---

## Suggested Requirements for /define

### Problem Statement (Draft)
`minimal-list` is a functionally complete but visually plain certification-tracker site; it needs an elegant, professional, fully responsive light/dark redesign plus new features (3-state interest tracking, official per-certification badges, a richer public Mural, custom public profiles, sysadmin reordering) built on patterns already proven in the user's other app, `caixa-forte-app`.

### Target Users (Draft)
| User | Pain Point |
|------|------------|
| Public/anonymous visitor | Current site looks unpolished; wants to browse certifications and see real badge imagery without needing an account |
| Regular signed-up user | Wants a low-friction personal tracker (interested/done per row), a public profile/Mural to show off progress, and a full JSON export of their data |
| Sysadmin (content manager, e.g. Leonardo/Matheus) | Needs to manage sessions and rows (create/edit/delete/reorder) without touching the database directly, and to control badge imagery per row |

### Success Criteria (Draft)
- [ ] Site renders correctly and elegantly in both dark (default) and light mode, with a working toggle
- [ ] Site is fully responsive on mobile, tablet, and desktop
- [ ] Login/signup UX matches caixa-forte's referenced patterns: forgot password, show-password, remember-password (with the same accepted risk profile)
- [ ] Regular users can sign up without email confirmation, track rows via the 3-state button, and export their full list as JSON
- [ ] Every row displays a real badge image (official or provider-logo fallback), admin-overridable
- [ ] Sysadmins can create/edit/delete/reorder sessions and rows via up/down controls, default alphabetical
- [ ] Public Mural shows an entry for every row a user has marked "done," always in sync with the row's current badge image
- [ ] Public profile pages live at `/u/{username}`, customizable and guaranteed unique
- [ ] Footer clearly states new admin accounts are only created by the site's authors
- [ ] Leonardo's sysadmin account is confirmed working (already done during this session)

### Constraints Identified
- Must build on the existing Supabase schema/RLS conventions (`is_sysadmin()` helper, base-GRANT + policy layering) rather than introducing a new authorization pattern
- Must not introduce a new runtime external API dependency for badge images
- `.env.local` (service role key, etc.) must remain gitignored — already confirmed correct

### Out of Scope (Confirmed)
- Two-level Provider → Session → Row hierarchy (flat `session` field instead)
- Drag-and-drop reordering (up/down arrows instead)
- Magic-link login mode
- Private per-user badge walls (Mural is public)
- Badge image provenance tracking
- Live per-request badge image search API

---

## Session Summary

| Metric | Value |
|--------|-------|
| Questions Asked | 16 |
| Approaches Explored | 3 (2 for design system, 1 rejected for badge sourcing) |
| Features Removed (YAGNI) | 6 |
| Validations Completed | 4 |
| Duration | ~1 session, includes one live infra action (sysadmin account creation) |

---

## Next Step

**Ready for:** `/define .claude/sdd/features/BRAINSTORM_SITE_REDESIGN.md`
