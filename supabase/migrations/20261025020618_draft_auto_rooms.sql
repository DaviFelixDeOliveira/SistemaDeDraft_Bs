-- Primeira etapa da sessão de treino: somente equipes autenticadas gerenciam salas.
-- A entrada de jogadores por código NÃO é liberada aqui; precisará de Edge Function,
-- token efêmero e aprovação, sem expor conta de equipe ou JWT.
create table if not exists public.draft_auto_rooms (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  join_code text not null unique check (join_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > created_at),
  check (expires_at <= created_at + interval '3 hours')
);
create index if not exists draft_auto_rooms_team_created_idx
  on public.draft_auto_rooms (team_id, created_at desc);

alter table public.draft_auto_rooms enable row level security;

-- Apenas o coach autenticado pode consultar/criar/encerrar a própria sala.
-- Não permitir editar o código, a expiração, o dono nem as datas via Data API.
revoke all on public.draft_auto_rooms from anon, authenticated;
grant select, insert on public.draft_auto_rooms to authenticated;
grant update (status) on public.draft_auto_rooms to authenticated;

create policy "draft_auto_rooms_owner_select"
  on public.draft_auto_rooms for select to authenticated
  using (team_id = (select auth.uid()));

create policy "draft_auto_rooms_owner_insert"
  on public.draft_auto_rooms for insert to authenticated
  with check (
    team_id = (select auth.uid())
    and status = 'active'
    and created_at >= now() - interval '1 minute'
    and created_at <= now() + interval '1 minute'
    and expires_at > now()
    and expires_at <= now() + interval '3 hours'
  );

create policy "draft_auto_rooms_owner_update"
  on public.draft_auto_rooms for update to authenticated
  using (team_id = (select auth.uid()))
  with check (team_id = (select auth.uid()));

comment on table public.draft_auto_rooms is
  'Sessões de draft gerenciadas pelo coach autenticado; código não autoriza ingresso de jogadores.';
