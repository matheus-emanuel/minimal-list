-- 3-state row tracking (DESIGN Decision 2): neutral is still "no row" (delete
-- on reset, unchanged); interested/done are now distinguished by this column
-- instead of mere row presence meaning "done".
alter table public.completions add column status text not null default 'done'
  check (status in ('interested', 'done'));

-- Every pre-existing row meant "done" under the old boolean-presence semantics.
update public.completions set status = 'done';

-- Transitioning interested -> done is an UPDATE (upsert with onConflict),
-- which the original schema never needed (insert-or-delete only).
grant update on public.completions to authenticated;

create policy "completions: own update"
  on public.completions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
