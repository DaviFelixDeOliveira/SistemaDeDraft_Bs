-- Pedidos de entrada: apenas o coach vê/aprova via RLS.
-- Jogador solicita a conexão através de Edge Function pública que grava com
-- credencial administrativa no servidor. O código da sala NUNCA dá acesso ao draft.
create table public.draft_auto_join_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.draft_auto_rooms(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '35 minutes')
);
create index draft_auto_join_requests_room_idx
  on public.draft_auto_join_requests(room_id,created_at desc);
alter table public.draft_auto_join_requests enable row level security;
revoke all on public.draft_auto_join_requests from anon, authenticated;
grant select (id,room_id,display_name,status,created_at,expires_at)
  on public.draft_auto_join_requests to authenticated;
grant update (status) on public.draft_auto_join_requests to authenticated;

create policy "draft_auto_join_requests_owner_read"
on public.draft_auto_join_requests for select to authenticated
using (exists (
  select 1 from public.draft_auto_rooms room
  where room.id=room_id and room.team_id=(select auth.uid())
));
create policy "draft_auto_join_requests_owner_review"
on public.draft_auto_join_requests for update to authenticated
using (
  status='pending' and expires_at>now() and
  exists (select 1 from public.draft_auto_rooms room
    where room.id=room_id and room.team_id=(select auth.uid())
      and room.status='active' and room.expires_at>now())
)
with check (
  status in ('approved','rejected') and expires_at>now() and
  exists (select 1 from public.draft_auto_rooms room
    where room.id=room_id and room.team_id=(select auth.uid())
      and room.status='active' and room.expires_at>now())
);
comment on table public.draft_auto_join_requests is
  'Solicitações de ingresso; token privado armazenado apenas como hash. Aprovado não tem acesso à base de equipe.';
