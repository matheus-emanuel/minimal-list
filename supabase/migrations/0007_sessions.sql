-- sessions: the row-grouping entity, replacing the free-text courses.category
-- column. A real table (not just a distinct-values view) because sysadmins
-- create/rename/delete/reorder sessions themselves — see DESIGN Decision 1.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reads always `order by sort_order, name` — ties (the default, untouched
-- state) fall back to alphabetical; an explicit sysadmin reorder (Pattern 1
-- in DESIGN) is what makes sort_order values diverge from the default 0.
create index sessions_sort_order_idx on public.sessions(sort_order, name);

alter table public.sessions enable row level security;

-- Base GRANT ceiling — RLS policies below narrow write access to sysadmin only.
grant select on public.sessions to anon, authenticated;
grant insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;

create policy "sessions: public read"
  on public.sessions for select
  to anon, authenticated
  using (true);

create policy "sessions: sysadmin write"
  on public.sessions for all
  to authenticated
  using (public.is_sysadmin())
  with check (public.is_sysadmin());

-- set_updated_at() already exists (defined in 0002_courses.sql) — reused here.
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();
