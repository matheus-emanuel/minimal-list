-- profiles: one row per auth.users, holds the role used by every RLS policy in this app
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'sysadmin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Public read is required so course completions/badge posts can show a display name
-- to anonymous visitors too. Column-level GRANT (not RLS) is what blocks role changes.
-- RLS only filters rows — without a base GRANT, a role gets "permission denied"
-- before its policies are ever evaluated, service_role included.
grant select on public.profiles to anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant all on public.profiles to service_role;

create policy "profiles: public read"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles: own update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profiles row (role defaults to 'user') whenever someone signs up.
-- Promoting to 'sysadmin' is a manual UPDATE run by the project owner — never via app UI.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SECURITY DEFINER so this can be called from other tables' RLS policies without
-- triggering recursive RLS evaluation on profiles itself.
create or replace function public.is_sysadmin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'sysadmin'
  );
$$;

revoke execute on function public.is_sysadmin from public;
grant execute on function public.is_sysadmin to authenticated, anon;
