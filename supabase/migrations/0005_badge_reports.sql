create table public.badge_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.badge_posts(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index badge_reports_resolved_idx on public.badge_reports(resolved);

alter table public.badge_reports enable row level security;

-- Base GRANT ceiling — RLS policies below restrict select/update to sysadmin only.
grant insert on public.badge_reports to authenticated;
grant select, update on public.badge_reports to authenticated;
grant all on public.badge_reports to service_role;

create policy "badge_reports: authenticated insert"
  on public.badge_reports for insert
  to authenticated
  with check (auth.uid() = reported_by);

create policy "badge_reports: sysadmin read"
  on public.badge_reports for select
  to authenticated
  using (public.is_sysadmin());

create policy "badge_reports: sysadmin update"
  on public.badge_reports for update
  to authenticated
  using (public.is_sysadmin())
  with check (public.is_sysadmin());
