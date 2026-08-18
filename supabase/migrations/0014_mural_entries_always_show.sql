-- Bug fix: the view required badge_image_path to be set before an auto-entry
-- would appear at all, so a "done" row with no curated badge yet was
-- invisible on the Mural instead of showing a placeholder — the exact
-- opposite of "the Mural always has something for a completed row"
-- (DEFINE goal). BadgeImage already renders a graceful placeholder for a
-- null image client-side, so the view no longer needs to gate on it.
create or replace view public.mural_entries as
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
  and not exists (
    select 1 from public.badge_posts bp
    where bp.user_id = c.user_id and bp.course_id = c.course_id
  );
