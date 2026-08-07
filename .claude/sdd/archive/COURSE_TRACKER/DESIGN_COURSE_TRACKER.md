# DESIGN: Course Tracker

> Technical design for implementing Course Tracker

## Metadata

| Attribute | Value |
|-----------|-------|
| **Feature** | COURSE_TRACKER |
| **Date** | 2026-08-06 |
| **Author** | design-agent |
| **DEFINE** | [DEFINE_COURSE_TRACKER.md](./DEFINE_COURSE_TRACKER.md) |
| **Status** | ✅ Shipped |

---

## Architecture Overview

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                              │
│   Anonymous visitor  ──────────────────────────────┐                       │
│   Logged-in user     ──────────────────────────────┤                       │
│   Sysadmin           ──────────────────────────────┤                       │
└──────────────────────────────────────────────────┬─┴───────────────────────┘
                                                     │ HTTPS
                                                     ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js App Router, Edge/Node)                  │
│                                                                             │
│  middleware.ts ── refreshes Supabase session cookie on every request      │
│                                                                             │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐    │
│  │  Public routes   │  │  Auth routes      │  │  Admin routes (RSC)   │    │
│  │  /  /badges       │  │  /login /signup   │  │  /admin /admin/reports│   │
│  │  Server Components│  │  /auth/callback   │  │  layout.tsx: role     │    │
│  │  (SSR, public read)│ │  (magic link)     │  │  check → redirect     │    │
│  └────────┬──────────┘  └────────┬──────────┘  └───────────┬────────────┘  │
│           │                      │                          │              │
│           └──────────────┬───────┴──────────────────────────┘              │
│                           ▼                                                │
│              Server Actions (lib/actions/*.ts)                             │
│      toggleCompletion · createCourse/updateCourse/deleteCourse             │
│      createBadgePost · toggleReaction · reportPost                         │
│      (Zod validation → Supabase client scoped to caller's session)         │
└───────────────────────────┬─────────────────────────────────────────────┬─┘
                             │ Supabase JS client (user JWT, RLS enforced) │
                             ▼                                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                                 SUPABASE                                   │
│  ┌────────────────────────────┐   ┌─────────────────────────────────┐    │
│  │ Postgres (RLS on ALL tables)│   │ Storage bucket "badges" (public  │    │
│  │ profiles · courses          │   │ read, folder-scoped write RLS,   │    │
│  │ completions · badge_posts   │   │ 5MB limit, image/* mime allow-   │    │
│  │ badge_reactions · badge_    │   │ list)                            │    │
│  │ reports                     │   └─────────────────────────────────┘    │
│  │ is_sysadmin() SECURITY      │   ┌─────────────────────────────────┐    │
│  │ DEFINER helper              │   │ Auth (email/password + magic     │    │
│  └────────────────────────────┘   │ link, no OAuth)                  │    │
│                                     └─────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| Public course list | SSR page listing all courses (category + tags), shows completion checkboxes only when logged in | Next.js Server Component |
| Badge feed | SSR public feed of badge photos with like counts, upload form for logged-in users | Next.js Server Component + Client Component (upload/like) |
| Auth flow | Signup/login via email+password or magic link | Supabase Auth + `@supabase/ssr` |
| Admin panel | CRUD for courses, denúncia (report) queue | Next.js Server Components, role-gated at layout level |
| Server Actions | All writes (mutations) go through these — validated with Zod, executed with the caller's session (RLS enforced, never service role) | Next.js Server Actions |
| Database | Source of truth for courses, completions, badge posts/reactions/reports, roles | Supabase Postgres + RLS |
| Storage | Badge photo files | Supabase Storage (public bucket, folder-scoped RLS) |
| Session middleware | Refreshes Supabase auth cookies on every request so SSR always has a valid session | Next.js Middleware (`@supabase/ssr`) |

---

## Key Decisions

### Decision 1: Roles stored in a `profiles` table, checked via a `SECURITY DEFINER` helper function

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-06 |

**Context:** Need a reliable, RLS-safe way to distinguish `sysadmin` from `user` across many tables' policies.

**Choice:** Store `role` as a column on `public.profiles` (one row per `auth.users`), and expose it to RLS policies through `public.is_sysadmin()` — a `SECURITY DEFINER` SQL function that queries `profiles` bypassing that table's own RLS (avoiding recursive-policy issues).

**Rationale:** The Supabase KB's own RLS guidance (`kb/supabase/concepts/rls-policies.md`) explicitly flags `auth.jwt() -> 'user_metadata'` as unsafe (user-editable) and recommends either `app_metadata` via a Custom Access Token Auth Hook, or a roles table with an `EXISTS` check. For a 2-role system, an Auth Hook is unnecessary operational complexity (extra SQL function wired into Auth config, harder to test locally); a roles table is simpler, easier to reason about, and trivial to promote a user to `sysadmin` (a single `UPDATE`).

**Alternatives Rejected:**
1. `auth.jwt() -> 'user_metadata' ->> 'role'` — rejected: users can self-promote via `supabase.auth.updateUser()`, a critical privilege-escalation bug.
2. Custom Access Token Auth Hook injecting `app_metadata.role` — rejected: correct and more "Supabase-idiomatic" for multi-tenant SaaS, but overkill for 2 static roles; adds a moving part (Hook must be registered in Auth settings, doesn't exist in local `supabase start` config by default) without a corresponding benefit at this scale.

**Consequences:**
- Every policy that needs a role check does one extra `EXISTS` subquery (cheap — `profiles` is tiny and `id` is the primary key).
- Promoting a sysadmin is a manual `UPDATE public.profiles SET role = 'sysadmin' WHERE id = '<uuid>'` run by the project owner in the Supabase SQL editor — matches the BRAINSTORM decision that sysadmin is never granted through the app UI.

---

### Decision 2: Prevent role self-escalation with column-level `GRANT`, not just RLS

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-06 |

**Context:** Users need to update their own `display_name`/`avatar_url` in `profiles`, but must never be able to set their own `role` to `sysadmin`.

**Choice:** `GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;` — a Postgres column-level privilege — combined with a row-level policy `USING (auth.uid() = id) WITH CHECK (auth.uid() = id)`.

**Rationale:** RLS operates on rows, not columns — a `WITH CHECK` clause can't cleanly forbid changing one specific column while allowing others without comparing against the pre-update row, which is awkward in RLS. Column-level `GRANT` is the native Postgres mechanism for this and requires zero application logic: any `UPDATE ... SET role = 'sysadmin'` from the `authenticated` role fails at the database with a permissions error, regardless of what the client sends.

**Alternatives Rejected:**
1. Trust the Server Action to only ever send `display_name`/`avatar_url` in its update payload — rejected: this is app-layer trust, exactly what the DEFINE's "RLS not just app" MUST goal forbids. A bug or a direct PostgREST call would bypass it.
2. A `BEFORE UPDATE` trigger that resets `NEW.role := OLD.role` when the caller isn't a sysadmin — rejected: works, but is more code than the one-line `GRANT`, for the same guarantee.

**Consequences:**
- New columns added to `profiles` later must be explicitly added to the `GRANT UPDATE (...)` list, or they're silently unwritable by users — a deliberate secure-by-default trade-off.

---

### Decision 3: Upload rate limit enforced twice — Server Action (fast feedback) and DB trigger (hard guarantee)

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-06 |

**Context:** DEFINE requires ≤10 badge uploads/user/day and ≤5MB/JPEG-PNG-WebP, enforced without a paid moderation service.

**Choice:** File size + MIME type are enforced at the Storage bucket config level (`file_size_limit`, `allowed_mime_types`) — Supabase rejects non-conforming uploads before they ever hit disk. The daily count limit is enforced by a `BEFORE INSERT` trigger on `badge_posts` that counts the caller's posts in the last 24h and raises an exception at 10. The Server Action also does the same count check first, purely to return a friendly error message before attempting the (already-uploaded) Storage write.

**Rationale:** Bucket-level size/MIME limits are free, built into Supabase, and can't be bypassed by calling the Storage API directly. The count limit can't live at the bucket level (Storage doesn't know about `badge_posts` rows), so a DB trigger is the only place that's both authoritative and un-bypassable by a direct PostgREST/Storage call — matching the "RLS/DB is the real boundary" principle from Decision 1.

**Alternatives Rejected:**
1. Rate limit only in the Server Action — rejected: bypassable by calling Supabase Storage/PostgREST directly with the user's own anon key, which any browser DevTools user can do.
2. A paid rate-limiting service (Upstash, Vercel Edge Config rate limiting) — rejected: violates the "100% free" constraint for a volume this small; Postgres can trivially count 10 rows.

**Consequences:**
- Slight duplication (count check exists in two places) — acceptable, they're ~5 lines of SQL/TS each and serve different purposes (UX vs. guarantee).
- A TOCTOU race exists between the Server Action's pre-check and the actual Storage upload (two concurrent requests could both pass the app-level check). This is bounded by the DB trigger, which still rejects the `badge_posts` insert past the 10th row — worst case, an orphaned Storage file with no post row, cleaned up by a periodic sysadmin review (not built into MVP; documented as a known limitation, acceptable given the low-value/low-likelihood of exploitation at this scale).

---

### Decision 4: Admin route protection lives in `app/admin/layout.tsx` (Server Component), middleware only refreshes sessions

| Attribute | Value |
|-----------|-------|
| **Status** | Accepted |
| **Date** | 2026-08-06 |

**Context:** DEFINE AT-004 requires that a non-sysadmin be blocked from `/admin` both in the UI and at the data layer, without a client-side flash of restricted content.

**Choice:** `middleware.ts` matches broadly (excluding static assets) and only calls `supabase.auth.getUser()` to refresh the session cookie — required by `@supabase/ssr` for every request. Role authorization itself happens in `app/admin/layout.tsx`, a Server Component that fetches the caller's `profiles.role` and `redirect('/')`s before any admin HTML is rendered if the role isn't `sysadmin`.

**Rationale:** Keeping role checks out of middleware avoids an extra DB round-trip on every single request across the whole site (middleware would otherwise need to special-case the `/admin` path anyway). A Server Component layout runs entirely server-side before streaming HTML, so there's no flash-of-unauthorized-content, and it's the officially recommended Supabase+Next.js App Router pattern for nested route protection. RLS on `courses`/`badge_reports` is still the actual security boundary — this layout check is a UX/defense-in-depth layer, not the only one.

**Alternatives Rejected:**
1. Role check inside `middleware.ts` for all routes — rejected: unnecessary DB query on every anonymous page view of the public course list.
2. Client-side `useEffect` redirect in an Admin page component — rejected: causes a visible flash of the admin UI before the redirect fires, and is trivially bypassable (it's just UX, not security) if it were the *only* check.

**Consequences:**
- Every request under `/admin/*` costs one extra `profiles` lookup — negligible at this scale (small `profiles` table, indexed primary key).

---

## File Manifest

| # | File | Action | Purpose | Agent | Dependencies |
|---|------|--------|---------|-------|--------------|
| 1 | `package.json` | Create | Next.js 14 App Router + TS + Tailwind + Supabase deps, Vitest, Playwright | @general | None |
| 2 | `tsconfig.json` | Create | TypeScript strict config | @general | 1 |
| 3 | `next.config.ts` | Create | `images.remotePatterns` for Supabase Storage domain | @general | 1 |
| 4 | `tailwind.config.ts` | Create | Tailwind setup | @general | 1 |
| 5 | `.env.example` | Create | Documents all env vars (see Configuration) | @general | None |
| 6 | `supabase/migrations/0001_profiles_and_roles.sql` | Create | `profiles` table, `handle_new_user()` trigger, `is_sysadmin()` function, column-level `GRANT` | @agentspec:cloud:supabase-specialist | None |
| 7 | `supabase/migrations/0002_courses.sql` | Create | `courses` table + RLS (public SELECT, sysadmin-only write) | @agentspec:cloud:supabase-specialist | 6 |
| 8 | `supabase/migrations/0003_completions.sql` | Create | `completions` table + RLS (own rows only) | @agentspec:cloud:supabase-specialist | 6, 7 |
| 9 | `supabase/migrations/0004_badge_posts_and_reactions.sql` | Create | `badge_posts`, `badge_reactions` tables + RLS + rate-limit trigger | @agentspec:cloud:supabase-specialist | 6, 7 |
| 10 | `supabase/migrations/0005_badge_reports.sql` | Create | `badge_reports` table + RLS (insert by any authenticated, read/update by sysadmin) | @agentspec:cloud:supabase-specialist | 6, 9 |
| 11 | `supabase/migrations/0006_storage_badges_bucket.sql` | Create | `badges` Storage bucket (public, 5MB, image/* allowlist) + `storage.objects` RLS | @agentspec:cloud:supabase-specialist | 6 |
| 12 | `supabase/seed.sql` | Create | Seeds `courses` from `Cursos indicados.md` (Scrum, SQL, Databricks x5, Oracle Cloud + "a pesquisar" as `tags`-only rows) | @agentspec:cloud:supabase-specialist | 7 |
| 13 | `lib/supabase/client.ts` | Create | Browser Supabase client (`createBrowserClient`) | @agentspec:cloud:supabase-specialist | 1 |
| 14 | `lib/supabase/server.ts` | Create | Server Supabase client (`createServerClient`, cookie-based) | @agentspec:cloud:supabase-specialist | 1 |
| 15 | `lib/supabase/middleware.ts` | Create | Session-refresh helper used by `middleware.ts` | @agentspec:cloud:supabase-specialist | 1 |
| 16 | `lib/supabase/types.ts` | Create | Generated DB types (`supabase gen types typescript`) | @agentspec:cloud:supabase-specialist | 6-11 |
| 17 | `middleware.ts` | Create | Refreshes session on every non-static request | @agentspec:cloud:supabase-specialist | 15 |
| 18 | `lib/validation/schemas.ts` | Create | Zod schemas: course, badge post, report, upload constraints | @general | None |
| 19 | `lib/actions/courses.ts` | Create | Server Actions: `createCourse`, `updateCourse`, `deleteCourse` | @general | 14, 18 |
| 20 | `lib/actions/completions.ts` | Create | Server Action: `toggleCompletion` (upsert/delete with `ON CONFLICT DO NOTHING`) | @general | 14 |
| 21 | `lib/actions/badges.ts` | Create | Server Actions: `createBadgePost`, `deleteBadgePost`, `toggleReaction`, `reportPost` | @general | 14, 18 |
| 22 | `app/layout.tsx` | Create | Root layout, nav (login state aware) | @general | 13, 14 |
| 23 | `app/globals.css` | Create | Tailwind base styles | @general | 4 |
| 24 | `app/page.tsx` | Create | Public course list (Server Component, SSR) | @general | 14, 20 |
| 25 | `app/course-list.tsx` | Create | Renders courses grouped by category with completion checkboxes | @general | 24 |
| 26 | `app/badges/page.tsx` | Create | Public badge feed (Server Component, SSR) | @general | 14, 21 |
| 27 | `app/badges/badge-feed.tsx` | Create | Feed list + like buttons (Client Component for interactivity) | @general | 26 |
| 28 | `app/badges/badge-upload-form.tsx` | Create | Upload form (Client Component, client + server validation) | @general | 21 |
| 29 | `app/(auth)/login/page.tsx` | Create | Email/password + magic-link login form | @general | 13 |
| 30 | `app/(auth)/signup/page.tsx` | Create | Signup form (email/password) | @general | 13 |
| 31 | `app/auth/callback/route.ts` | Create | Magic-link/OAuth code exchange handler | @agentspec:cloud:supabase-specialist | 14 |
| 32 | `app/admin/layout.tsx` | Create | Sysadmin-only guard (Decision 4) + admin nav | @general | 14 |
| 33 | `app/admin/page.tsx` | Create | Course CRUD table | @general | 19, 32 |
| 34 | `app/admin/course-form.tsx` | Create | Create/edit course form | @general | 19 |
| 35 | `app/admin/reports/page.tsx` | Create | Denúncia queue, resolve/remove actions | @general | 21, 32 |
| 36 | `tests/rls/profiles.test.ts` | Create | Verifies role self-escalation is blocked, own-row read/update works | @agentspec:cloud:supabase-specialist | 6 |
| 37 | `tests/rls/courses.test.ts` | Create | Verifies public SELECT, sysadmin-only write, anon/user write denial | @agentspec:cloud:supabase-specialist | 7 |
| 38 | `tests/rls/completions.test.ts` | Create | Verifies user A can't read/write user B's completions | @agentspec:cloud:supabase-specialist | 8 |
| 39 | `tests/rls/badges.test.ts` | Create | Verifies public read, own-post write, rate-limit trigger fires at 11th post | @agentspec:cloud:supabase-specialist | 9, 11 |
| 40 | `tests/e2e/course-tracking.spec.ts` | Create | Playwright: AT-001, AT-002 | @general | 24-25 |
| 41 | `tests/e2e/admin.spec.ts` | Create | Playwright: AT-003, AT-004 | @general | 32-34 |
| 42 | `tests/e2e/badges.spec.ts` | Create | Playwright: AT-005, AT-006, AT-007 | @general | 26-28 |

**Total Files:** 42

---

## Agent Assignment Rationale

> Agents discovered from `${CLAUDE_PLUGIN_ROOT}/agents/` — Build phase invokes matched specialists.

| Agent | Files Assigned | Why This Agent |
|-------|----------------|-----------------|
| `@agentspec:cloud:supabase-specialist` | 6-17, 31, 36-39 | Has live Supabase MCP access; specializes in RLS policy design, Storage config, Auth (`@supabase/ssr`), and can apply migrations directly — exactly the schema/security-critical half of this feature |
| `@general` (build-agent, direct execution) | 1-5, 18-30, 32-35, 40-42 | Next.js App Router pages/components, Server Actions, and Playwright tests have no dedicated frontend specialist in the current agent roster — handled directly by the build phase using the patterns below |

**Agent Discovery:**
- Scanned: `${CLAUDE_PLUGIN_ROOT}/agents/**/*.md`
- Matched by: KB domain (`supabase`) for schema/security files; no match found for Next.js App Router UI code, so those stay with general build execution

---

## Code Patterns

### Pattern 1: `is_sysadmin()` helper + role-gated policy

```sql
-- lib for every table that needs a sysadmin-only write policy
CREATE OR REPLACE FUNCTION public.is_sysadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'sysadmin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_sysadmin FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_sysadmin TO authenticated, anon;

-- Usage in any table's policy:
CREATE POLICY "courses: sysadmin write"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.is_sysadmin())
  WITH CHECK (public.is_sysadmin());
```

### Pattern 2: Auto-create `profiles` row on signup

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)), 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Pattern 3: Column-level GRANT to block role self-escalation

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;
-- Note: no GRANT on `role` column for `authenticated` — UPDATE ... SET role = ...
-- fails with a permissions error regardless of RLS, even via direct PostgREST calls.

CREATE POLICY "profiles: public read" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "profiles: own update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

### Pattern 4: Upload rate-limit trigger

```sql
CREATE OR REPLACE FUNCTION public.enforce_badge_upload_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.badge_posts
  WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours';

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'upload_rate_limit_exceeded'
      USING HINT = 'Max 10 badge uploads per 24h';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER badge_posts_rate_limit
  BEFORE INSERT ON public.badge_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_badge_upload_rate_limit();
```

### Pattern 5: Server Action with Zod validation + RLS-scoped client

```typescript
// lib/actions/completions.ts
'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const ToggleSchema = z.object({
  courseId: z.string().uuid(),
  completed: z.boolean(),
})

export async function toggleCompletion(input: z.infer<typeof ToggleSchema>) {
  const { courseId, completed } = ToggleSchema.parse(input)
  const supabase = await createServerClient() // uses caller's session — RLS enforced, never service role

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  if (completed) {
    const { error } = await supabase
      .from('completions')
      .upsert({ user_id: user.id, course_id: courseId }, { onConflict: 'user_id,course_id' })
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('completions')
      .delete()
      .eq('user_id', user.id)
      .eq('course_id', courseId)
    if (error) return { error: error.message }
  }
  return { ok: true }
}
```

### Pattern 6: Storage upload scoped to the user's own folder

```sql
-- storage.objects RLS for the "badges" bucket
CREATE POLICY "badges: authenticated upload to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'badges'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "badges: owner or sysadmin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'badges'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_sysadmin())
  );

CREATE POLICY "badges: public read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'badges');
```

```typescript
// Client upload — path is always prefixed with the user's own id
const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`
const { error } = await supabase.storage.from('badges').upload(filePath, file, {
  cacheControl: '3600',
  upsert: false,
})
```

---

## Data Flow

```text
Course completion toggle:
1. Usuário logado clica no checkbox de um curso na home
   │
   ▼
2. Client component chama Server Action `toggleCompletion({courseId, completed})`
   │
   ▼
3. Server Action valida input com Zod, pega sessão do usuário via cookies
   │
   ▼
4. Supabase client (RLS ativo, escopo do usuário) faz upsert/delete em `completions`
   │
   ▼
5. RLS confirma auth.uid() = user_id; grava; UI revalida via `revalidatePath('/')`

Badge upload:
1. Usuário logado seleciona foto no formulário do mural (client-side: valida tamanho/MIME antes de enviar)
   │
   ▼
2. Server Action `createBadgePost` checa contagem de uploads nas últimas 24h (feedback rápido)
   │
   ▼
3. Client faz upload direto pro Storage bucket "badges" em `{user_id}/{uuid}.ext`
   │  (bucket rejeita se > 5MB ou MIME fora da allowlist)
   ▼
4. Server Action insere linha em `badge_posts` referenciando o path do Storage
   │  (trigger BEFORE INSERT reconfirma o rate limit — 11º post falha mesmo se a checagem do passo 2 foi burlada)
   ▼
5. Post aparece no feed público (SSR na próxima navegação / revalidatePath)
```

---

## Integration Points

| External System | Integration Type | Authentication |
|-----------------|-------------------|-----------------|
| Supabase Postgres | `@supabase/supabase-js` via `@supabase/ssr` (server + browser clients) | User JWT (anon key + session cookie); RLS enforced per request |
| Supabase Auth | `@supabase/ssr` (`signInWithPassword`, `signInWithOtp`, `signUp`) | Email/password + magic link, no OAuth |
| Supabase Storage | `supabase.storage.from('badges')` | Same user JWT — folder-scoped RLS, no service-role usage in runtime app code |
| Vercel | Git-based deploy, Next.js first-party integration | N/A (build-time env vars only) |

---

## Testing Strategy

| Test Type | Scope | Files | Tools | Coverage Goal |
|-----------|-------|-------|-------|----------------|
| RLS/Integration | Every policy: public read, own-row write, sysadmin-only write, rate limit trigger | `tests/rls/*.test.ts` | Vitest + `supabase-js` against local `supabase start` instance, multiple test users | 100% of policies (one positive + one negative case each) |
| Unit | Zod schemas, seed-markdown parser | `lib/validation/*.test.ts`, `scripts/parse-seed-courses.test.ts` | Vitest | 80% |
| E2E | AT-001 through AT-007 | `tests/e2e/*.spec.ts` | Playwright against local dev server | All acceptance tests in DEFINE |

**Local RLS testing setup:** `supabase start` (free, local Docker stack) provides a real Postgres + Auth + Storage instance for tests — no cloud project or cost needed to run the full RLS suite in CI (GitHub Actions free tier).

---

## Error Handling

| Error Type | Handling Strategy | Retry? |
|------------|---------------------|--------|
| RLS policy denial (Postgres `42501`) | Server Action catches, returns generic `{error: 'not_authorized'}` to client; full Postgres error logged server-side only | No |
| Upload rate limit exceeded (trigger exception `upload_rate_limit_exceeded`) | Server Action surfaces "Você atingiu o limite de 10 badges por dia" | No |
| File too large / wrong MIME | Validated client-side first (instant feedback); Storage bucket config rejects server-side as a backstop | No |
| Duplicate completion toggle (double-click race) | `upsert` with `onConflict` / delete is naturally idempotent | N/A |
| Duplicate like (double-click race) | `INSERT ... ON CONFLICT (post_id, user_id) DO NOTHING` on `badge_reactions` | N/A |
| Session expired mid-action | Server Action returns `{error: 'not_authenticated'}`; client redirects to `/login` | No |
| Supabase transient network error | Show retry button in UI | Yes (manual, user-initiated) |

---

## Configuration

| Config Key | Type | Default | Description |
|------------|------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | string | — | Supabase project URL (public, safe to expose) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string | — | Supabase anon key (public, safe — RLS is the real boundary) |
| `SUPABASE_SERVICE_ROLE_KEY` | string | — | **Server-only**, never imported in Server Actions/runtime routes; used only in one-off seed/migration scripts |
| `BADGE_MAX_FILE_SIZE_MB` | int | `5` | Enforced at bucket config level |
| `BADGE_MAX_UPLOADS_PER_DAY` | int | `10` | Enforced by DB trigger (Pattern 4) |
| `BADGE_ALLOWED_MIME_TYPES` | string | `image/jpeg,image/png,image/webp` | Enforced at bucket config level |

---

## Security Considerations

- RLS is enabled on every table holding user or content data (`profiles`, `courses`, `completions`, `badge_posts`, `badge_reactions`, `badge_reports`) — no table is left with default-open access.
- **RLS alone is not sufficient — every table also carries an explicit base `GRANT`** (e.g. `grant select on public.courses to anon, authenticated`, `grant all on public.courses to service_role`). RLS only filters *rows*; without the underlying table-level `GRANT`, Postgres returns "permission denied" before any policy is even evaluated — `service_role` included. This was caught empirically during `/build` (14 live RLS tests against a real local Supabase instance failed with `42501` until the missing `GRANT`s were added to migrations 0002–0005) and is now the standard pattern for every table in this schema, mirroring what `profiles` already did for its column-level `GRANT` (Decision 2).
- Role checks use `is_sysadmin()` (roles table + `SECURITY DEFINER`), never `auth.jwt() -> 'user_metadata'` (user-editable, per KB guidance).
- Role self-escalation is blocked at the Postgres privilege level via column-level `GRANT`, not just RLS or app logic (Decision 2).
- `SUPABASE_SERVICE_ROLE_KEY` never ships to the client and is never used inside a Server Action or route handler that runs on behalf of a request — only in trusted, offline seed scripts.
- Storage uploads are folder-scoped per user (`{user_id}/...`) — one user can never overwrite or delete another user's file (except sysadmin, via `is_sysadmin()`).
- Badge upload abuse is bounded twice: bucket-level size/MIME limits (free, built-in) and a DB trigger rate limit that can't be bypassed by calling the API directly (Decision 3).
- Admin routes are guarded server-side in a Server Component layout before any HTML streams (Decision 4) — RLS is still the actual enforcement boundary if that guard were ever removed by mistake.
- All Server Action inputs are validated with Zod before touching the database.
- Next.js Server Actions have built-in CSRF protection (Origin header validation) — no custom CSRF handling needed.

---

## Observability

| Aspect | Implementation |
|--------|------------------|
| Logging | `console.error` in Server Actions on any Supabase error (surfaced in Vercel Function Logs, free tier) |
| Metrics | Vercel Web Analytics (free tier) for page performance; Supabase Dashboard (free tier) for DB/Auth/Storage usage against free-tier limits |
| Tracing | None — not justified at this scale; revisit if/when volume approaches free-tier limits |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-06 | design-agent | Initial version, derived from DEFINE_COURSE_TRACKER.md |
| 1.1 | 2026-08-06 | ship-agent | Shipped and archived |

---

## Next Step

**Ready for:** `/build .claude/sdd/features/DESIGN_COURSE_TRACKER.md`
