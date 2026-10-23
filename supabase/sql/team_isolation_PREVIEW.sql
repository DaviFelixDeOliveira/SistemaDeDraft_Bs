-- SISTEMA DE DRAFT - RASCUNHO DE MIGRACAO MULTI-EQUIPES
-- NAO EXECUTAR em producao antes da adaptacao e testes de todos os services.
-- Nao apaga nenhum brawler ou outro dado.
-- A transacao falhara se os dados legados ainda estiverem presentes.
BEGIN;

DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.players LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.matches LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.match_picks LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.match_bans LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.training_sessions LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.compositions LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.latest_backup LIMIT 1)
  THEN
    RAISE EXCEPTION 'Migração interrompida: dados legados ainda existem. Preserve os brawlers e prepare a limpeza separadamente.';
  END IF;
END;
$guard$;

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9][a-z0-9-]{2,30}[a-z0-9]$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 3 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_read_own ON public.teams FOR SELECT TO authenticated
 USING (id = (SELECT auth.uid()));

-- Necessario apenas caso adotemos a estrategia de identificador interno via Supabase Auth.
-- Supabase Auth e nativo para email/senha ou telefone/senha; validar primeiro
-- se o endereco interno e aceito pela instancia, e a estrategia de recuperacao.
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.create_team_from_auth()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
  slug text;
  label text;
BEGIN
  IF NEW.email IS NULL OR split_part(lower(NEW.email), '@', 2) <> 'teams.sistema-de-draft.invalid' THEN
    RETURN NEW;
  END IF;
  slug := split_part(lower(NEW.email), '@', 1);
  IF slug !~ '^[a-z0-9][a-z0-9-]{2,30}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Nome de equipe invalido';
  END IF;
  label := left(btrim(coalesce(NEW.raw_user_meta_data->>'team_display_name', slug)), 80);
  IF char_length(label) < 3 THEN label := slug; END IF;
  INSERT INTO public.teams(id, username, display_name) VALUES (NEW.id, slug, label);
  RETURN NEW;
END;
$func$;
REVOKE ALL ON FUNCTION private.create_team_from_auth() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS create_team_auth_user ON auth.users;
CREATE TRIGGER create_team_auth_user
 AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION private.create_team_from_auth();


ALTER TABLE public.players
 ADD COLUMN IF NOT EXISTS team_id uuid DEFAULT (auth.uid()) REFERENCES public.teams(id);
ALTER TABLE public.players ALTER COLUMN team_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_team_id ON public.players(team_id);

ALTER TABLE public.training_sessions
 ADD COLUMN IF NOT EXISTS team_id uuid DEFAULT (auth.uid()) REFERENCES public.teams(id);
ALTER TABLE public.training_sessions ALTER COLUMN team_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_training_sessions_team_id ON public.training_sessions(team_id);

ALTER TABLE public.matches
 ADD COLUMN IF NOT EXISTS team_id uuid DEFAULT (auth.uid()) REFERENCES public.teams(id);
ALTER TABLE public.matches ALTER COLUMN team_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON public.matches(team_id);

ALTER TABLE public.match_picks
 ADD COLUMN IF NOT EXISTS team_id uuid DEFAULT (auth.uid()) REFERENCES public.teams(id);
ALTER TABLE public.match_picks ALTER COLUMN team_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_picks_team_id ON public.match_picks(team_id);

ALTER TABLE public.match_bans
 ADD COLUMN IF NOT EXISTS team_id uuid DEFAULT (auth.uid()) REFERENCES public.teams(id);
ALTER TABLE public.match_bans ALTER COLUMN team_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_bans_team_id ON public.match_bans(team_id);

ALTER TABLE public.compositions
 ADD COLUMN IF NOT EXISTS team_id uuid DEFAULT (auth.uid()) REFERENCES public.teams(id);
ALTER TABLE public.compositions ALTER COLUMN team_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compositions_team_id ON public.compositions(team_id);

ALTER TABLE public.latest_backup
 ADD COLUMN IF NOT EXISTS team_id uuid DEFAULT (auth.uid()) REFERENCES public.teams(id);
ALTER TABLE public.latest_backup ALTER COLUMN team_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_latest_backup_team_id ON public.latest_backup(team_id);

-- Garante que picks e bans nao podem apontar para partidas de outra equipe.
ALTER TABLE public.matches ADD CONSTRAINT sd_matches_tenant_id UNIQUE (team_id, id);
ALTER TABLE public.players ADD CONSTRAINT sd_players_tenant_id UNIQUE (team_id, id);
ALTER TABLE public.training_sessions ADD CONSTRAINT sd_training_tenant_id UNIQUE (team_id, id);
ALTER TABLE public.match_picks ADD CONSTRAINT sd_picks_own_match
 FOREIGN KEY (team_id, match_id) REFERENCES public.matches(team_id,id) ON DELETE CASCADE;
ALTER TABLE public.match_bans ADD CONSTRAINT sd_bans_own_match
 FOREIGN KEY (team_id, match_id) REFERENCES public.matches(team_id,id) ON DELETE CASCADE;
ALTER TABLE public.match_picks ADD CONSTRAINT sd_picks_own_player
 FOREIGN KEY (team_id, player_id) REFERENCES public.players(team_id,id);
ALTER TABLE public.matches ADD CONSTRAINT sd_matches_own_session
 FOREIGN KEY (team_id, session_id) REFERENCES public.training_sessions(team_id,id);

-- 'latest' passa a significar ultimo snapshot DE CADA EQUIPE.
ALTER TABLE public.latest_backup DROP CONSTRAINT IF EXISTS latest_backup_pkey;
ALTER TABLE public.latest_backup ADD PRIMARY KEY (team_id, id);

-- Catalogos globais sao legiveis, mas nunca modificaveis via browser.
ALTER TABLE public.brawlers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_brawlers_select ON public.brawlers FOR SELECT TO authenticated USING (true);
CREATE POLICY catalog_maps_select ON public.maps FOR SELECT TO authenticated USING (true);

-- Preferencias individuais sem editar a fonte compartilhada.
CREATE TABLE IF NOT EXISTS public.team_map_settings (
  team_id uuid NOT NULL DEFAULT (auth.uid()) REFERENCES public.teams(id) ON DELETE CASCADE,
  map_id text NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT false,
  PRIMARY KEY (team_id, map_id)
);
CREATE TABLE IF NOT EXISTS public.team_brawler_settings (
  team_id uuid NOT NULL DEFAULT (auth.uid()) REFERENCES public.teams(id) ON DELETE CASCADE,
  brawler_id text NOT NULL REFERENCES public.brawlers(id) ON DELETE CASCADE,
  tier text CHECK (tier IN ('S','A','B','C','D')),
  is_active boolean,
  is_hot_pick boolean,
  counters text[],
  countered_by text[],
  PRIMARY KEY (team_id, brawler_id)
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_players_read ON public.players FOR SELECT TO authenticated USING (team_id = (SELECT auth.uid()));
CREATE POLICY sd_players_create ON public.players FOR INSERT TO authenticated WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_players_edit ON public.players FOR UPDATE TO authenticated
 USING (team_id = (SELECT auth.uid())) WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_players_remove ON public.players FOR DELETE TO authenticated USING (team_id = (SELECT auth.uid()));

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_training_sessions_read ON public.training_sessions FOR SELECT TO authenticated USING (team_id = (SELECT auth.uid()));
CREATE POLICY sd_training_sessions_create ON public.training_sessions FOR INSERT TO authenticated WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_training_sessions_edit ON public.training_sessions FOR UPDATE TO authenticated
 USING (team_id = (SELECT auth.uid())) WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_training_sessions_remove ON public.training_sessions FOR DELETE TO authenticated USING (team_id = (SELECT auth.uid()));

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_matches_read ON public.matches FOR SELECT TO authenticated USING (team_id = (SELECT auth.uid()));
CREATE POLICY sd_matches_create ON public.matches FOR INSERT TO authenticated WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_matches_edit ON public.matches FOR UPDATE TO authenticated
 USING (team_id = (SELECT auth.uid())) WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_matches_remove ON public.matches FOR DELETE TO authenticated USING (team_id = (SELECT auth.uid()));

ALTER TABLE public.match_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_match_picks_read ON public.match_picks FOR SELECT TO authenticated USING (team_id = (SELECT auth.uid()));
CREATE POLICY sd_match_picks_create ON public.match_picks FOR INSERT TO authenticated WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_match_picks_edit ON public.match_picks FOR UPDATE TO authenticated
 USING (team_id = (SELECT auth.uid())) WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_match_picks_remove ON public.match_picks FOR DELETE TO authenticated USING (team_id = (SELECT auth.uid()));

ALTER TABLE public.match_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_match_bans_read ON public.match_bans FOR SELECT TO authenticated USING (team_id = (SELECT auth.uid()));
CREATE POLICY sd_match_bans_create ON public.match_bans FOR INSERT TO authenticated WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_match_bans_edit ON public.match_bans FOR UPDATE TO authenticated
 USING (team_id = (SELECT auth.uid())) WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_match_bans_remove ON public.match_bans FOR DELETE TO authenticated USING (team_id = (SELECT auth.uid()));

ALTER TABLE public.compositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_compositions_read ON public.compositions FOR SELECT TO authenticated USING (team_id = (SELECT auth.uid()));
CREATE POLICY sd_compositions_create ON public.compositions FOR INSERT TO authenticated WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_compositions_edit ON public.compositions FOR UPDATE TO authenticated
 USING (team_id = (SELECT auth.uid())) WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_compositions_remove ON public.compositions FOR DELETE TO authenticated USING (team_id = (SELECT auth.uid()));

ALTER TABLE public.latest_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_latest_backup_read ON public.latest_backup FOR SELECT TO authenticated USING (team_id = (SELECT auth.uid()));
CREATE POLICY sd_latest_backup_create ON public.latest_backup FOR INSERT TO authenticated WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_latest_backup_edit ON public.latest_backup FOR UPDATE TO authenticated
 USING (team_id = (SELECT auth.uid())) WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_latest_backup_remove ON public.latest_backup FOR DELETE TO authenticated USING (team_id = (SELECT auth.uid()));

ALTER TABLE public.team_map_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_team_map_settings_read ON public.team_map_settings FOR SELECT TO authenticated USING (team_id = (SELECT auth.uid()));
CREATE POLICY sd_team_map_settings_create ON public.team_map_settings FOR INSERT TO authenticated WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_team_map_settings_edit ON public.team_map_settings FOR UPDATE TO authenticated
 USING (team_id = (SELECT auth.uid())) WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_team_map_settings_remove ON public.team_map_settings FOR DELETE TO authenticated USING (team_id = (SELECT auth.uid()));

ALTER TABLE public.team_brawler_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_team_brawler_settings_read ON public.team_brawler_settings FOR SELECT TO authenticated USING (team_id = (SELECT auth.uid()));
CREATE POLICY sd_team_brawler_settings_create ON public.team_brawler_settings FOR INSERT TO authenticated WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_team_brawler_settings_edit ON public.team_brawler_settings FOR UPDATE TO authenticated
 USING (team_id = (SELECT auth.uid())) WITH CHECK (team_id = (SELECT auth.uid()));
CREATE POLICY sd_team_brawler_settings_remove ON public.team_brawler_settings FOR DELETE TO authenticated USING (team_id = (SELECT auth.uid()));

-- Remover consultas anonimas que atualmente permitem leitura/alteracao global.
REVOKE ALL ON public.teams,public.brawlers,public.maps,public.players,
 public.matches,public.match_picks,public.match_bans,
 public.training_sessions,public.compositions,public.latest_backup,
 public.team_map_settings,public.team_brawler_settings FROM anon;

GRANT SELECT ON public.teams,public.brawlers,public.maps TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.players,public.matches,
 public.match_picks,public.match_bans,public.training_sessions,
 public.compositions,public.latest_backup,public.team_map_settings,
 public.team_brawler_settings TO authenticated;

-- Views historicas passam a respeitar as politicas da identidade que consulta.
ALTER VIEW public.brawler_winrate SET (security_invoker = true);
COMMIT;
