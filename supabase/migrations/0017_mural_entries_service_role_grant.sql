-- GRANT is separate from RLS/BYPASSRLS — service_role still needs an
-- explicit grant on this view, same class of gap the original build already
-- caught once for base tables (see DESIGN_COURSE_TRACKER Security
-- Considerations). Missed here because the view was added after that lesson.
grant select on public.mural_entries to service_role;
