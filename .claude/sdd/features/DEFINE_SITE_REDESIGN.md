# DEFINE: Site Redesign — Elegant Provider Badge-Giving Training Tracker

> Redesign minimal-list into an elegant, responsive, dark-default light/dark site with richer per-row tracking, official badges, public profiles, and sysadmin content management — built on patterns proven in caixa-forte-app.

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | SITE_REDESIGN |
| **Date** | 2026-08-17 |
| **Author** | define-agent |
| **Status** | ✅ Complete (Built) |
| **Clarity Score** | 14/15 |

---

## Problem Statement

`minimal-list` is a functionally complete but visually plain Next.js/Supabase certification tracker — no dark mode, no design tokens, a bare boolean completion checkbox, no real badge imagery, and an auth flow missing forgot-password/show-password/remember-password conveniences — and it needs to become an elegant, professional, fully responsive public site that matches the UX quality of the author's other app, `caixa-forte-app`, while adding richer per-row interest tracking, official certification badges, and public user profiles.

---

## Target Users

| User | Role | Pain Point |
|------|------|------------|
| Public/anonymous visitor | Unauthenticated browser | Site currently looks unpolished (plain utility-class styling, no theme); wants to browse certifications and see real badge imagery without creating an account |
| Regular signed-up user | Self-serve account holder, near-zero privileges | Wants a frictionless personal tracker (interested/done per row), a public profile to show progress, and a full export of their data — while it must stay obvious their account can only manage their own list, nothing else |
| Sysadmin (content manager) | Manually promoted, e.g. Matheus, Leonardo (`leochalhoub@hotmail.com`, already provisioned) | Needs to manage sessions and rows (create/edit/delete/reorder) and control badge imagery per row, entirely through the UI — no direct DB access for routine content work |

---

## Goals

What success looks like (prioritized):

| Priority | Goal |
|----------|------|
| **MUST** | Ship a light/dark theme system (default dark, persistent toggle) using Tailwind v4 and design tokens/components ported from `caixa-forte-app` |
| **MUST** | Site is fully responsive across mobile, tablet, and desktop with no horizontal scroll and touch-friendly controls |
| **MUST** | Login page matches the caixa-forte reference: "Esqueci minha senha," "Mostrar senha," and "Salvar senha" (remember-password, plaintext-in-localStorage as explicitly confirmed) |
| **MUST** | Regular users can sign up with email + password + name, with no email-confirmation step required |
| **MUST** | Replace the boolean completion checkbox with a 3-state per-row cycle button: neutral → interested → done → neutral |
| **MUST** | Sysadmins can create, edit, delete, and reorder sessions (the row-grouping entity, renamed from `category`) and the rows inside each session, entirely via the admin UI |
| **MUST** | Default sort order is alphabetical (A-Z) for both sessions and rows, with sysadmin-controlled manual override via up/down arrows |
| **MUST** | Every row displays a working external training link (already enforced by the existing NOT NULL constraint on `courses.url`) |
| **MUST** | Every row displays a badge image — official image if found, provider-logo fallback otherwise, sysadmin-overridable via manual upload — resolved when the row is authored, not fetched live per page view |
| **MUST** | Public "Mural de Badges" gains an auto-populated entry for every row a user marks "done," always reflecting that row's current badge image; the existing manual photo-upload feed (likes, reports) is preserved unchanged |
| **MUST** | Public profile pages live at `/u/{username}`; username defaults on signup and is sysadmin/self-customizable to any unique, unclaimed value |
| **MUST** | Users can set their display name and photo on a "Perfil" page; the top-right menu shows "Olá {name}" (falling back to email, with an elegant prompt to set a name if missing), a Perfil link, and Log Out |
| **MUST** | A regular user can export their full tracked list as a single JSON file (title, link, session, status, badge image URL, timestamp per row) |
| **MUST** | Footer clearly states that new sysadmin/content-manager accounts are created only by the site's authors |
| **MUST** | Cookie-consent banner (LGPD/GDPR-style), matching the proven pattern already shipped in the author's other apps (`caixa-forte-app`, `amazing-school-app`, `foco-contabil`, `careconnect`): fixed bottom banner, "Aceitar tudo" / "Só essenciais" choice, decision persisted client-side so it never reappears once decided, links to a real Privacy Policy page |
| **SHOULD** | Regular-user UI clearly and professionally communicates that the account's only capability is managing their own list — no other rights |
| **COULD** | None deferred to this cycle beyond what's listed in Out of Scope |

**Priority Guide:**
- **MUST** = MVP fails without this
- **SHOULD** = Important, but workaround exists
- **COULD** = Nice-to-have, cut first if needed

---

## Success Criteria

Measurable outcomes:

- [ ] Dark mode is the default on first visit; the light/dark toggle choice persists across reloads (cookie or localStorage)
- [ ] Site renders with zero horizontal scroll and tap targets ≥44px at viewport widths from 320px to 1920px
- [ ] Text/background combinations meet WCAG AA contrast (≥4.5:1 for body text) in both light and dark themes
- [ ] 100% of certification rows resolve to a non-empty, working external link (enforced at the DB layer)
- [ ] 100% of certification rows resolve to a non-blank badge image (official match, provider-logo fallback, or admin upload — never a broken/missing image)
- [ ] Sysadmin can create, edit, delete, or reorder a session or row in ≤4 UI actions each
- [ ] Regular-user signup completes in a single form submission with zero email-confirmation redirect
- [ ] JSON export file contains exactly the rows currently shown in the user's list, one object per row, with all 5 required fields present
- [ ] A Mural entry exists for 100% of a user's "done" rows, and reflects a row's badge image update within one page load of an admin change (no manual sync/cache-bust step)
- [ ] Username collisions are rejected at signup and at profile-rename time with a clear inline error, 0 duplicate usernames possible by construction (DB unique constraint)
- [ ] Cookie-consent banner shows on first visit for 100% of visitors (authenticated or not), never reappears once a choice is recorded, and its Privacy Policy link resolves to a real page (not a 404)

---

## Acceptance Tests

| ID | Scenario | Given | When | Then |
|----|----------|-------|------|------|
| AT-001 | Theme default and persistence | A first-time visitor with no stored theme preference | They load the site, then toggle to light mode and reload | Initial render is dark mode; after toggling and reloading, light mode persists |
| AT-002 | Regular signup, no confirmation | A visitor on the signup page | They submit a valid email, password, and name | An account is created and the user is signed in immediately, with no email-confirmation step |
| AT-003 | 3-state row cycle | A signed-in user viewing a row in its default (neutral) state | They click the interest button three times in a row | State transitions neutral → interested → done → neutral, and the "done" state is what creates the Mural entry |
| AT-004 | Sysadmin row management | A signed-in sysadmin on the admin page | They create a new row inside an existing session, then edit its title, then delete it | Each operation succeeds via UI only, with no direct DB access, and reordering via up/down arrows updates the row's position for all visitors |
| AT-005 | Badge resolution at authoring time | A sysadmin creates a new row for a certification with a well-known official badge | They save the row | The row is saved with a resolved badge image (official or provider-logo fallback) without any additional runtime lookup on page render |
| AT-006 | Mural auto-post and live badge sync | A user has marked a row "done," which is reflected on their Mural entry | A sysadmin later updates that row's badge image | The user's existing Mural entry displays the new badge image on next view, with no new post created and no manual resync action |
| AT-007 | JSON export completeness | A user has 5 rows across 3 sessions, mixed interested/done statuses | They click "Export JSON" | The downloaded file contains exactly 5 objects, each with title, link, session, status, badge image URL, and timestamp |
| AT-008 | Username uniqueness | A username `alice` is already claimed | A different user attempts to set their profile username to `alice` | The rename is rejected with a clear inline error; their profile URL remains unchanged |
| AT-009 | Regular-user permission clarity | A regular user viewing their own profile or account area | They look for any content-management controls (create/edit/delete rows) | No such controls are visible or reachable; UI text clearly states their account only manages their personal list |
| AT-010 | Greeting fallback | A signed-in user who has never set a display name | They view the top-right menu | It reads "Olá {email}" with an elegant, visible prompt/link to set a name in Perfil |
| AT-011 | Cookie consent persistence | A first-time visitor with no stored consent decision | They click "Aceitar tudo" (or "Só essenciais"), then reload or navigate to another route | The banner does not reappear; the decision persists across reloads and navigation |

---

## Out of Scope

Explicitly NOT included in this feature:

- Two-level Provider → Session → Row hierarchy (a separate `providers` table) — sessions remain the single grouping level, per explicit brainstorm decision
- Drag-and-drop reordering — up/down arrow buttons only
- Magic-link ("Link mágico") login mode — dropped in favor of matching caixa-forte's single password-based flow + forgot password
- Private, per-user-only badge walls — the Mural stays fully public, matching today's behavior
- Badge image provenance/source tracking (how an image was found) — not requested, no consumer identified
- Live, per-request badge image search API calls — badge resolution happens only when a sysadmin authors/edits a row
- Root-level username routes with a reserved-word blocklist — superseded by the `/u/{username}` prefix decision, which removes the collision problem entirely
- Any change to the existing manual badge-photo-upload feed's rate limiting, likes, or reporting mechanics — preserved as-is

---

## Constraints

| Type | Constraint | Impact |
|------|------------|--------|
| Technical | Must build on the existing Supabase RLS conventions (`is_sysadmin()` SECURITY DEFINER helper, base GRANT + policy layering established in migrations 0001–0006) | New tables/columns (username, sort_order, badge image, completion status) follow the same pattern rather than introducing a new authorization model |
| Language | All user-facing site copy must be 100% pt-BR (labels, buttons, errors, empty states, footer, emails) — a small set of established English loanwords is acceptable where that's the natural term (e.g. "Badges") | Every new UI string authored in Design/Build must be Portuguese by default; loanword exceptions should stay to genuinely borrowed terms, not a general escape hatch |
| Technical | No new runtime external API dependency may be introduced for badge images | Badge lookup must be an authoring-time action (admin UI or an offline script), never a request-time call |
| Technical | Requires a Tailwind v3 → v4 migration | Touches `tailwind.config.ts`, `globals.css`, and every styled component; must be planned as a discrete, verifiable migration step in Design |
| Security | `.env.local` (service role key and other secrets) must remain gitignored | Any admin/data-fixing scripts must run as one-off, uncommitted scripts, consistent with current `.gitignore` (already verified correct) |
| Resource | Small content scale (24 seed rows today, low hundreds expected) | No pagination/virtualization needed for the row list; the "spacious, card-like" layout preference is performance-safe at this scale |
| Timeline | No fixed deadline stated by the user | Sequencing and phasing are left to Design/Build, not schedule-driven |
| Content accuracy | The cookie-consent/Privacy Policy pattern is ported from other apps that handle financial/health data — their exact claims don't apply here | Privacy Policy copy must be rewritten to accurately describe what `minimal-list` actually collects (Supabase auth: email, optional display name/photo; localStorage: theme + cookie-consent choice; no analytics/tracking installed), not copy-pasted verbatim |

---

## Technical Context

> Essential context for Design phase - prevents misplaced files and missed infrastructure needs.

| Aspect | Value | Notes |
|--------|-------|-------|
| **Deployment Location** | `src/app/` (routes), `src/lib/actions/` (server actions), `src/lib/supabase/` (clients), `supabase/migrations/` (schema) | Repo now uses the Next.js src-directory layout (adopted during repo reorg, 2026-08-17) — all new app code goes under `src/`, not project root |
| **KB Domains** | `supabase` | RLS, storage bucket, and auth patterns for the new/extended tables (`profiles.username`, session reorder, `completions` status, badge image field) |
| **IaC Impact** | Modify existing | New Supabase migrations continuing the existing numbered sequence (`0007_*.sql` onward): theme has no infra impact; sessions-as-reorderable-entities, badge image field, completion status, and username all require schema changes and RLS policy updates following the established `is_sysadmin()` pattern |

**Why This Matters:**

- **Location** → Design phase uses correct project structure, prevents misplaced files
- **KB Domains** → Design phase pulls correct patterns from the `supabase` KB domain
- **IaC Impact** → Triggers migration planning consistent with the existing numbered sequence, avoids ad-hoc schema drift

---

## Data Contract (if applicable)

Not applicable. This is a small, content-managed application (tens to low hundreds of rows), not a data pipeline — schema changes are captured as ordinary Supabase migrations rather than a data contract.

---

## Assumptions

Assumptions that if wrong could invalidate the design:

| ID | Assumption | If Wrong, Impact | Validated? |
|----|------------|------------------|------------|
| A-001 | An authoring-time web lookup will find a usable official badge image for most certifications; provider-logo fallback covers the rest | Some rows would need a generic placeholder image, weakening the "always has a badge" guarantee | [ ] |
| A-002 | The existing RLS pattern (`is_sysadmin()` SECURITY DEFINER helper, base GRANT + policy layering) extends cleanly to new/modified tables (username, sort_order, badge image, completion status) | RLS policy design would need a different approach for one or more new tables | [ ] |
| A-003 | The Tailwind v3 → v4 migration does not break the existing Playwright/Vitest test suite's selectors/assertions | Test suite needs parallel updates alongside the visual redesign, adding scope to Build | [ ] |
| A-004 | caixa-forte-app's login/remember-password mechanism is directly portable, since both apps share the same `@supabase/ssr` client-side auth stack | The remember-password and show-password logic would need non-trivial adaptation rather than a direct port | [ ] |
| A-005 | The "reset" state of the 3-state interest button deletes the underlying `completions` row entirely (mirroring the current toggle-off behavior in `src/lib/actions/completions.ts`), rather than persisting an explicit "not interested" status | A third status value would be needed in the schema, changing the `completions` table shape | [ ] |
| A-006 | The cookie-consent UX pattern (localStorage-persisted decision, "essential-only" vs. "accept all", no cookie banner library) is directly portable since `minimal-list`'s actual data footprint (Supabase auth session + theme preference, no analytics/trackers) is simpler than the finance/health apps it's borrowed from | If third-party analytics/trackers are ever added, the "essential-only" choice needs to actually gate them — not just be cosmetic, as it can be today | [ ] |

**Note:** Validate critical assumptions before DESIGN phase. Unvalidated assumptions become risks.

---

## Clarity Score Breakdown

| Element | Score (0-3) | Notes |
|---------|-------------|-------|
| Problem | 3 | Specific, grounded in the actual current codebase state (no dark mode, boolean checkbox, no badges, missing auth conveniences), not a vague "make it nicer" |
| Users | 3 | Three distinct personas identified, each with a concrete pain point, derived directly from 16 rounds of brainstorm discovery |
| Goals | 3 | Every goal traces to an explicit, user-confirmed brainstorm decision; all are MoSCoW-prioritized with only one SHOULD and nothing vague |
| Success | 3 | Vague asks ("beautiful," "responsive," "elegant") were converted into numeric/testable criteria (contrast ratios, viewport widths, action counts, sync timing) |
| Scope | 2 | Out-of-scope list is explicit and thorough (8 items from the brainstorm's YAGNI pass), but one implementation-shape question remains genuinely open for Design — see Open Questions — rather than silently assumed |
| **Total** | **14/15** | |

**Scoring Guide:**
- 0 = Missing entirely
- 1 = Vague or incomplete
- 2 = Clear but missing details
- 3 = Crystal clear, actionable

**Minimum to proceed: 12/15**

---

## Open Questions

1. **Session entity shape:** The brainstorm confirmed sessions stay a single flat grouping level (no separate `providers` table) and that sessions themselves are reorderable — which implies sessions need their own identity (creatable/renameable/deletable/reorderable), not just a free-text label copied onto each row. Design should confirm whether `session` becomes a normalized reference table (`sessions` with `id`, `name`, `sort_order`) with rows holding a `session_id` foreign key, versus keeping a free-text column with a separate ordering mechanism. This is a schema-design decision correctly deferred to `/design`, not assumed here.

Everything else has explicit answers from the BRAINSTORM document — no other blocking questions before Design.

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-17 | define-agent | Initial version, derived from BRAINSTORM_SITE_REDESIGN.md |
| 1.1 | 2026-08-17 | define-agent | Corrected title/framing to "provider badge-giving training tracker"; added pt-BR UI constraint; added cookie-consent banner + Privacy Policy goal (MUST), success criterion, and AT-011; updated Deployment Location to the `src/` layout adopted during repo reorg |

---

## Next Step

**Ready for:** `/design .claude/sdd/features/DEFINE_SITE_REDESIGN.md`
