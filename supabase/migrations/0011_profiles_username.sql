-- Public profile pages live at /u/{username} (DESIGN Decision 7).
create extension if not exists citext;

alter table public.profiles add column username citext;

-- Shared by the one-time backfill below and by handle_new_user() (updated at
-- the bottom of this migration) — every new profile, existing or future,
-- gets a slugified, collision-safe username without the user picking one.
create or replace function public.generate_unique_username(preferred text)
returns citext
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix int := 1;
begin
  base := trim(both '-' from lower(regexp_replace(preferred, '[^a-zA-Z0-9]+', '-', 'g')));
  if base = '' then
    base := 'usuario';
  end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  end loop;
  return candidate;
end;
$$;

-- Backfill: every existing profile gets a real username before NOT NULL is enforced.
do $$
declare
  r record;
begin
  for r in select id, display_name from public.profiles order by created_at loop
    update public.profiles set username = public.generate_unique_username(r.display_name) where id = r.id;
  end loop;
end $$;

alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_key unique (username);

-- profiles: public read (migration 0001) already covers this column — no new
-- SELECT policy needed. Only the write grant needs extending.
grant update (username) on public.profiles to authenticated;
-- profiles: own update (migration 0001) already scopes this to auth.uid() = id;
-- uniqueness is enforced by the constraint above, race-free (DESIGN Decision 7).

-- New signups must also get a username — handle_new_user() (from migration
-- 0001) never touched this column and would otherwise violate NOT NULL.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_display_name text;
begin
  chosen_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  insert into public.profiles (id, display_name, username, role)
  values (
    new.id,
    chosen_display_name,
    public.generate_unique_username(chosen_display_name),
    'user'
  );
  return new;
end;
$$;
