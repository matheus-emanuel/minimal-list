insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('badges', 'badges', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Uploads must live under a folder named after the uploader's own user id —
-- this is what makes "one user can't touch another user's files" true.
create policy "badges: authenticated upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'badges'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "badges: owner or sysadmin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'badges'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_sysadmin())
  );

create policy "badges: public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'badges');
