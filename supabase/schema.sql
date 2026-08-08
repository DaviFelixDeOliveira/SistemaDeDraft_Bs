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
