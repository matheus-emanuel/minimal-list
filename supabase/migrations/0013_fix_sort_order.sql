-- Bug fix: every session/course shared sort_order = 0 (the column default),
-- so the up/down reorder swap (Pattern 1 — finds a neighbor via strict </>
-- comparison) could never find one to swap with. Backfill real sequential
-- values now, and auto-assign new rows to the end going forward so they
-- stay distinct from their siblings.

with ranked as (
  select id, row_number() over (order by sort_order, name) - 1 as rn
  from public.sessions
)
update public.sessions s set sort_order = ranked.rn from ranked where ranked.id = s.id;

with ranked as (
  select id, row_number() over (partition by session_id order by sort_order, title) - 1 as rn
  from public.courses
)
update public.courses c set sort_order = ranked.rn from ranked where ranked.id = c.id;

-- No insert path in this app ever sets sort_order explicitly, so "still at
-- the column default" and "genuinely wants position 0" are indistinguishable
-- by value alone — but since only the column default ever produces 0 on
-- insert, treating 0 as "unset" here is safe in practice.
create or replace function public.assign_next_session_sort_order()
returns trigger
language plpgsql
as $$
begin
  if new.sort_order = 0 then
    select coalesce(max(sort_order), -1) + 1 into new.sort_order from public.sessions;
  end if;
  return new;
end;
$$;

create trigger sessions_assign_sort_order
  before insert on public.sessions
  for each row execute function public.assign_next_session_sort_order();

create or replace function public.assign_next_course_sort_order()
returns trigger
language plpgsql
as $$
begin
  if new.sort_order = 0 then
    select coalesce(max(sort_order), -1) + 1 into new.sort_order
    from public.courses where session_id = new.session_id;
  end if;
  return new;
end;
$$;

create trigger courses_assign_sort_order
  before insert on public.courses
  for each row execute function public.assign_next_course_sort_order();
