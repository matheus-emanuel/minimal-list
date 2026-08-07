create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  category text not null,
  tags text[] not null default '{}',
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index courses_category_idx on public.courses(category);

alter table public.courses enable row level security;

-- Base GRANT ceiling — RLS policies below narrow write access to sysadmin only.
grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;

create policy "courses: public read"
  on public.courses for select
  to anon, authenticated
  using (true);

create policy "courses: sysadmin write"
  on public.courses for all
  to authenticated
  using (public.is_sysadmin())
  with check (public.is_sysadmin());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();
