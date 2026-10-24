-- Mantém a visibilidade anterior dos mapas de equipes existentes.
-- Novas equipes passam a montar a própria rotação explicitamente.
INSERT INTO public.team_map_settings (team_id,map_id,is_active)
SELECT u.id,m.id,coalesce(m.is_active,false)
FROM auth.users u CROSS JOIN public.maps m
WHERE u.email LIKE '%@teams.sistema-de-draft.invalid'
ON CONFLICT(team_id,map_id) DO NOTHING;

-- Personagens são globais e nunca podem ser arquivados pela equipe.
ALTER TABLE public.brawlers DROP CONSTRAINT IF EXISTS brawlers_always_active;
ALTER TABLE public.brawlers ADD CONSTRAINT brawlers_always_active CHECK (is_active IS TRUE);
ALTER TABLE public.team_brawler_settings DROP CONSTRAINT IF EXISTS team_brawler_settings_always_active;
ALTER TABLE public.team_brawler_settings
  ADD CONSTRAINT team_brawler_settings_always_active CHECK (is_active IS DISTINCT FROM false);

-- Nenhum catálogo global será deletado por login de equipe, mesmo fora da interface.
REVOKE DELETE, TRUNCATE ON public.brawlers, public.maps FROM authenticated, anon;
-- Uma "remoção" de mapa afeta a rotação DESTA equipe, nunca o catálogo.
-- Havendo partidas ou composições, apenas arquiva.
CREATE OR REPLACE FUNCTION public.remove_team_map_from_rotation(p_map_id text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER
SET search_path=public,pg_temp AS $$
DECLARE
 v_team uuid := (SELECT auth.uid());
 v_has_history boolean;
BEGIN
 IF v_team IS NULL THEN RAISE EXCEPTION 'Faça login na equipe.' USING ERRCODE='42501'; END IF;
 IF p_map_id IS NULL OR length(p_map_id) < 2 OR length(p_map_id)>100
    OR NOT EXISTS (SELECT 1 FROM public.maps WHERE id=p_map_id) THEN
   RAISE EXCEPTION 'Mapa inválido.' USING ERRCODE='22023';
 END IF;
 SELECT EXISTS (SELECT 1 FROM public.matches WHERE team_id=v_team AND map_id=p_map_id)
     OR EXISTS (SELECT 1 FROM public.compositions WHERE team_id=v_team AND map_id=p_map_id)
 INTO v_has_history;
 IF v_has_history THEN
   UPDATE public.team_map_settings SET is_active=false WHERE team_id=v_team AND map_id=p_map_id;
   IF NOT FOUND THEN
     INSERT INTO public.team_map_settings(team_id,map_id,is_active)
       VALUES(v_team,p_map_id,false);
   END IF;
   RETURN 'archived';
 END IF;
 DELETE FROM public.team_map_settings WHERE team_id=v_team AND map_id=p_map_id;
 RETURN 'removed';
END; $$;
REVOKE ALL ON FUNCTION public.remove_team_map_from_rotation(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remove_team_map_from_rotation(text) TO authenticated;
