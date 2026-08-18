-- Backfill: one sessions row per distinct existing category (DESIGN Decision 1).
insert into public.sessions (name)
select distinct category from public.courses;

alter table public.courses add column session_id uuid references public.sessions(id) on delete restrict;

update public.courses c
set session_id = s.id
from public.sessions s
where s.name = c.category;

alter table public.courses alter column session_id set not null;

-- Same convention as sessions.sort_order: default 0 ties break alphabetically
-- (order by sort_order, title), a sysadmin reorder is what diverges it.
alter table public.courses add column sort_order int not null default 0;

drop index if exists courses_category_idx;
create index courses_session_id_idx on public.courses(session_id, sort_order, title);

alter table public.courses drop column category;
