-- Coach records each event's review decision. Previously the UI held only
-- one pending event, so the next event could not be accessed without returning
-- to the room. Decisions are persisted per team, not just in the browser.
alter table public.draft_auto_events
  add column review_status text not null default 'pending'
    check (review_status in ('pending', 'applied', 'dismissed'));

-- The Data API grants only this column for coach-side updates.
-- Never let a coach alter an original observation or its author.
grant update (review_status) on public.draft_auto_events to authenticated;

create policy "draft_auto_events_coach_review"
  on public.draft_auto_events
  for update to authenticated
  using (
    review_status = 'pending'
    and exists (
      select 1 from public.draft_auto_rooms room
      where room.id = room_id
      and room.team_id = (select auth.uid())
    )
  )
  with check (
    review_status in ('applied', 'dismissed')
    and exists (
      select 1 from public.draft_auto_rooms room
      where room.id = room_id
      and room.team_id = (select auth.uid())
    )
  );
