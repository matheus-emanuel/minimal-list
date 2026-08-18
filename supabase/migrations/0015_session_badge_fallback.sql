-- Provider-level badge fallback: a logo set once on the session (e.g. the
-- Databricks logo) is inherited by every course inside it that has no
-- specific badge of its own — including courses added later. Read paths use
-- coalesce(courses.badge_image_path, sessions.badge_image_path).
alter table public.sessions add column badge_image_path text;
