-- Auto-entries now fall back to the session's provider logo when the course
-- itself has no specific badge (migration 0015).
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
  coalesce(co.badge_image_path, se.badge_image_path) as image_path,
  'auto'::text as source,
  null::text as caption,
  c.completed_at as created_at
from public.completions c
join public.courses co on co.id = c.course_id
join public.sessions se on se.id = co.session_id
where c.status = 'done'
  and not exists (
    select 1 from public.badge_posts bp
    where bp.user_id = c.user_id and bp.course_id = c.course_id
  );
