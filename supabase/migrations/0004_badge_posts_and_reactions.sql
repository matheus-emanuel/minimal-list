create table public.badge_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  image_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index badge_posts_created_at_idx on public.badge_posts(created_at desc);
create index badge_posts_user_id_idx on public.badge_posts(user_id);

alter table public.badge_posts enable row level security;

-- Base GRANT ceiling — RLS policies below narrow writes to the post's own owner.
grant select on public.badge_posts to anon, authenticated;
grant insert, delete on public.badge_posts to authenticated;
grant all on public.badge_posts to service_role;

create policy "badge_posts: public read"
  on public.badge_posts for select
  to anon, authenticated
  using (true);

create policy "badge_posts: own insert"
  on public.badge_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "badge_posts: own or sysadmin delete"
  on public.badge_posts for delete
  to authenticated
  using (auth.uid() = user_id or public.is_sysadmin());

-- Hard guarantee for the 10-uploads/24h limit — cannot be bypassed by calling
-- PostgREST/Storage directly, unlike an app-only check. See DESIGN Decision 3.
create or replace function public.enforce_badge_upload_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from public.badge_posts
  where user_id = new.user_id and created_at > now() - interval '24 hours';

  if recent_count >= 10 then
    raise exception 'upload_rate_limit_exceeded'
      using hint = 'Max 10 badge uploads per 24h';
  end if;

  return new;
end;
$$;

create trigger badge_posts_rate_limit
  before insert on public.badge_posts
  for each row execute function public.enforce_badge_upload_rate_limit();

create table public.badge_reactions (
  post_id uuid not null references public.badge_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.badge_reactions enable row level security;

-- Base GRANT ceiling — RLS policies below narrow writes to the reaction's own owner.
grant select on public.badge_reactions to anon, authenticated;
grant insert, delete on public.badge_reactions to authenticated;
grant all on public.badge_reactions to service_role;

create policy "badge_reactions: public read"
  on public.badge_reactions for select
  to anon, authenticated
  using (true);

create policy "badge_reactions: own insert"
  on public.badge_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "badge_reactions: own delete"
  on public.badge_reactions for delete
  to authenticated
  using (auth.uid() = user_id);
