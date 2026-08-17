-- ================================================================
-- SCHEMA SQL - TBK HUB (Brawl Stars Draft System)
-- Cole e execute este script no SQL Editor do Supabase Dashboard
-- ================================================================

-- 1. TABELA DE BRAWLERS
create table if not exists brawlers (
  id text primary key,
  name text not null,
  rarity text not null,
  tier text not null,
  health text not null,
  health_value text,
  type text[] not null default '{}',
  walks_on_water boolean default false,
  breaks_walls boolean default false,
  how_breaks_walls text,
  image_url text,
  icon_url text,
  is_hot_pick boolean default false,
  is_active boolean default true
);

-- 2. TABELA DE MAPAS
create table if not exists maps (
  id text primary key,
  name text not null,
  mode text not null,
  terrain text not null,
  is_active boolean default true,
  image_url text
);

-- 3. TABELA DE PLAYERS
create table if not exists players (
  id text primary key,
  name text not null,
  nickname text not null,
  status text default 'Titular',
  is_active boolean default true,
  comfort_brawlers text[] default '{}',
  tags text[] default '{}'
);

-- DESABILITA RLS (Row Level Security) PARA PERMITIR ACESSO DIRETO VIA ANON KEY
alter table brawlers disable row level security;
alter table maps disable row level security;
alter table players disable row level security;

-- 4. TABELA DE SESSÕES DE TREINO (SCRIMS)
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  start_date timestamp without time zone not null default now(),
  end_date timestamp without time zone,
  notes text,
  opponent_name text
);

alter table training_sessions disable row level security;

-- 5. TABELA DE PARTIDAS (SCRIMS)
-- ATENÇÃO: os valores aceitos pelo banco são em PORTUGUÊS.
-- O código interno usa 'victory'/'defeat' e 'tbk'/'enemy' —
-- a conversão é feita pelas funções toDbResult/toDbTeam em src/lib/utils.ts.
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references training_sessions(id) on delete set null,
  match_date timestamp without time zone not null default now(),
  map_id text,
  result text not null,
  opponent_name text,
  notes text,
  constraint matches_result_check check (result = any (array['vitoria'::text, 'derrota'::text]))
);

create index if not exists idx_matches_session_id on matches(session_id);

-- 6. TABELA DE PICKS POR PARTIDA
create table if not exists match_picks (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  team text not null,
  player_id text,
  brawler_id text not null,
  constraint match_picks_team_check check (team = any (array['nos'::text, 'inimigo'::text]))
);

-- 7. TABELA DE BANIMENTOS POR PARTIDA
create table if not exists match_bans (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  team text not null,
  brawler_id text not null,
  constraint match_bans_team_check check (team = any (array['nos'::text, 'inimigo'::text]))
);

-- Desabilita RLS também para as tabelas de partidas
alter table matches disable row level security;
alter table match_picks disable row level security;
alter table match_bans disable row level security;

-- 8. TABELA DE COMPOSIÇÕES META POR MAPA
-- Armazena composições cadastradas manualmente (via "Nova Comp") e
-- composições salvas automaticamente como meta do mapa (via "Salvar como Meta do Mapa").
-- O campo is_meta=true identifica as composições geradas pelo draft.
create table if not exists compositions (
  id uuid primary key default gen_random_uuid(),
  map_id text not null,
  brawlers text[] not null default '{}',
  description text,
  winrate numeric default 0,
  matches_played integer default 0,
  is_meta boolean default true,
  is_active boolean default true,
  created_at timestamp without time zone default now()
);

-- 10. TABELA DE ÚLTIMO BACKUP SALVO NO BANCO
create table if not exists latest_backup (
  id text primary key default 'latest',
  payload jsonb not null,
  saved_at timestamp without time zone default now()
);

alter table latest_backup disable row level security;

