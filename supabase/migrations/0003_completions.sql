create table public.completions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create index completions_course_id_idx on public.completions(course_id);

alter table public.completions enable row level security;

-- Base GRANT ceiling — RLS policies below narrow every row to its own user.
grant select, insert, delete on public.completions to authenticated;
grant all on public.completions to service_role;

create policy "completions: own read"
  on public.completions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "completions: own insert"
  on public.completions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "completions: own delete"
  on public.completions for delete
  to authenticated
  using (auth.uid() = user_id);
