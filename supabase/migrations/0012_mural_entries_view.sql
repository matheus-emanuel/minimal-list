-- Public Mural feed: real user uploads (unchanged) + a live auto-entry for
-- every "done" row that has no manual post yet, always reflecting the
-- course's *current* badge image (DESIGN Decision 4). A view, not a trigger
-- that copies data, so there is nothing to keep in sync.
--
-- This view intentionally reads across every user's `completions` rows via
-- its owner's privilege (Postgres's default view-execution model) to build a
-- public projection — completions itself keeps its own-rows-only RLS
-- untouched for any *direct* query. Only the columns below are exposed.
create view public.mural_entries as
select
  bp.id,
  bp.user_id,
  bp.course_id,
  'badges'::text as storage_bucket,
  bp.image_path,
  'manual'::text as source,
  bp.caption,
  bp.created_at
from public.badge_posts bp
union all
select
  null::uuid as id,
  c.user_id,
  c.course_id,
  'course-badges'::text as storage_bucket,
  co.badge_image_path as image_path,
  'auto'::text as source,
  null::text as caption,
  c.completed_at as created_at
from public.completions c
join public.courses co on co.id = c.course_id
where c.status = 'done'
  and co.badge_image_path is not null
  and not exists (
    select 1 from public.badge_posts bp
    where bp.user_id = c.user_id and bp.course_id = c.course_id
  );

-- Views need their own explicit GRANT, same base-GRANT-before-RLS rule every
-- other table in this schema follows.
grant select on public.mural_entries to anon, authenticated;
