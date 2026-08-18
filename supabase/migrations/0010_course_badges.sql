-- Official badge image per row (DESIGN Decision 3) — resolved by a sysadmin
-- at authoring time, never fetched by the running app. Nullable: a row can
-- exist before its badge has been curated.
alter table public.courses add column badge_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-badges', 'course-badges', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Unlike "badges" (folder-scoped per user), only sysadmins ever write here —
-- official badge images aren't tied to any one user's folder.
create policy "course-badges: sysadmin write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'course-badges' and public.is_sysadmin());

create policy "course-badges: sysadmin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'course-badges' and public.is_sysadmin())
  with check (bucket_id = 'course-badges' and public.is_sysadmin());

create policy "course-badges: sysadmin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'course-badges' and public.is_sysadmin());

create policy "course-badges: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'course-badges');
