-- Observações enviadas por jogadores aprovados para o coach.
-- Não altera o Draft manual nem o histórico de treinos; os eventos são sugestões
-- de preenchimento que o coach ainda precisa avaliar.
create table public.draft_auto_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.draft_auto_rooms(id) on delete cascade,
  request_id uuid not null references public.draft_auto_join_requests(id) on delete cascade,
  client_event_id uuid not null,
  kind text not null check (kind in ('map','first-pick','ban','pick')),
  map_id text references public.maps(id),
  ally_starts boolean,
  team text check (team in ('ally','enemy')),
  slot integer,
  brawler_id text references public.brawlers(id),
  created_at timestamptz not null default now(),
  unique (request_id,client_event_id),
  check (
    (kind='map' and map_id is not null and ally_starts is null and team is null and slot is null and brawler_id is null)
    or (kind='first-pick' and ally_starts is not null and map_id is null and team is null and slot is null and brawler_id is null)
    or (kind='ban' and team is not null and slot between 0 and 2 and brawler_id is not null and map_id is null and ally_starts is null)
    or (kind='pick' and team is not null and slot between 0 and 5 and brawler_id is not null and map_id is null and ally_starts is null)
  )
);
create index draft_auto_events_room_created_idx
  on public.draft_auto_events(room_id,created_at desc);
alter table public.draft_auto_events enable row level security;
revoke all on public.draft_auto_events from anon,authenticated;
grant select on public.draft_auto_events to authenticated;
create policy "draft_auto_events_coach_read"
on public.draft_auto_events for select to authenticated
using (exists(
  select 1 from public.draft_auto_rooms r
  where r.id=room_id and r.team_id=(select auth.uid())
));
comment on table public.draft_auto_events is 'Eventos manuais enviados por jogadores aprovados; somente coach pode visualizar e jamais aplicados automaticamente.';
