-- Extend only NEW Draft Auto rooms and guest invitations; never revive expired access.
alter table public.draft_auto_rooms
  drop constraint draft_auto_rooms_check1;
alter table public.draft_auto_rooms
  add constraint draft_auto_rooms_check1
    check (expires_at <= created_at + interval '12 hours');

alter table public.draft_auto_join_requests
  drop constraint draft_auto_join_requests_check1;
alter table public.draft_auto_join_requests
  add constraint draft_auto_join_requests_check1
    check (expires_at <= created_at + interval '12 hours');

drop policy if exists "draft_auto_rooms_owner_insert" on public.draft_auto_rooms;
create policy "draft_auto_rooms_owner_insert"
  on public.draft_auto_rooms for insert to authenticated
  with check (
    team_id = (select auth.uid())
    and status = 'active'
    and created_at >= now() - interval '1 minute'
    and created_at <= now() + interval '1 minute'
    and expires_at > now()
    and expires_at <= now() + interval '12 hours'
  );

-- Only own expired or closed rooms can be deleted. Cascades remove only
-- room-scoped test events and join requests, never saved training matches.
grant delete on public.draft_auto_rooms to authenticated;
create policy "draft_auto_rooms_owner_delete_inactive"
  on public.draft_auto_rooms for delete to authenticated
  using (
    team_id = (select auth.uid())
    and (status = 'closed' or expires_at <= now())
  );
