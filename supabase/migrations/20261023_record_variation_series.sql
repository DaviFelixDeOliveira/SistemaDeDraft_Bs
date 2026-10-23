-- Sistema de Draft: a derrota original e a partida-teste são eventos distintos.
-- A função é uma transação única, executada com permissões do usuário (RLS).
-- Falha em qualquer inserção = rollback de ambas, sem registros parciais.
CREATE OR REPLACE FUNCTION public.record_variation_series(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_team uuid := auth.uid();
  v_original uuid := (p_payload->>'original_match_id')::uuid;
  v_variation uuid := (p_payload->>'variation_match_id')::uuid;
  v_map text := p_payload->>'map_id';
  v_session uuid := nullif(p_payload->>'session_id', '')::uuid;
  v_opponent text := coalesce(nullif(left(p_payload->>'opponent_name', 120), ''), 'Inimigo');
  v_out text := p_payload->>'brawler_out';
  v_in text := p_payload->>'brawler_in';
  v_result text := p_payload->>'variation_result';
  v_original_picks jsonb := p_payload->'original_ally_picks';
  v_variation_picks jsonb := p_payload->'variation_ally_picks';
  v_enemy jsonb := p_payload->'enemy_picks';
  v_ally_bans jsonb := p_payload->'ally_bans';
  v_enemy_bans jsonb := p_payload->'enemy_bans';
  v_exists integer;
  v_changed integer;
BEGIN
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'Faça login para registrar partidas.';
  END IF;
  IF v_original IS NULL OR v_variation IS NULL OR v_original = v_variation THEN
    RAISE EXCEPTION 'Identificadores de partida inválidos.';
  END IF;
  IF v_result NOT IN ('vitoria','derrota') THEN
    RAISE EXCEPTION 'Resultado da variação inválido.';
  END IF;
  IF v_out IS NULL OR v_in IS NULL OR v_out = v_in THEN
    RAISE EXCEPTION 'Selecione dois brawlers diferentes.';
  END IF;
  IF v_map IS NULL OR NOT EXISTS (SELECT 1 FROM public.maps WHERE id = v_map) THEN
    RAISE EXCEPTION 'Mapa inválido.';
  END IF;
  IF coalesce(jsonb_typeof(v_original_picks),'') <> 'array'
      OR coalesce(jsonb_typeof(v_variation_picks),'') <> 'array'
      OR coalesce(jsonb_typeof(v_enemy),'') <> 'array'
      OR coalesce(jsonb_typeof(v_ally_bans),'') <> 'array'
      OR coalesce(jsonb_typeof(v_enemy_bans),'') <> 'array' THEN
    RAISE EXCEPTION 'Dados da composição incompletos.';
  END IF;
  IF jsonb_array_length(v_original_picks) <> 3
      OR jsonb_array_length(v_variation_picks) <> 3
      OR jsonb_array_length(v_enemy) <> 3 THEN
    RAISE EXCEPTION 'Uma composição deve conter três brawlers por equipe.';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(v_original_picks) AS x
      WHERE x->>'brawler_id' = v_out) <> 1
      OR (SELECT count(*) FROM jsonb_array_elements(v_original_picks) AS x
      WHERE x->>'brawler_id' = v_in) <> 0 THEN
    RAISE EXCEPTION 'O brawler removido não pertence ao trio original.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_enemy) AS x WHERE x = v_in)
      OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_ally_bans) AS x WHERE x = v_in)
      OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_enemy_bans) AS x WHERE x = v_in) THEN
    RAISE EXCEPTION 'O brawler da variação já foi escolhido ou banido.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_variation_picks) AS x WHERE x->>'brawler_id' = v_out)
      OR (SELECT count(*) FROM jsonb_array_elements(v_variation_picks) AS x WHERE x->>'brawler_id' = v_in) <> 1 THEN
    RAISE EXCEPTION 'A variação deve substituir exatamente um brawler.';
  END IF;
  SELECT count(*) INTO v_changed
  FROM jsonb_array_elements(v_original_picks) WITH ORDINALITY AS a(p,ord)
  JOIN jsonb_array_elements(v_variation_picks) WITH ORDINALITY AS b(p,ord)
       ON a.ord=b.ord
  WHERE (a.p->>'brawler_id') IS DISTINCT FROM (b.p->>'brawler_id')
     OR (a.p->>'player_id') IS DISTINCT FROM (b.p->>'player_id');
  IF v_changed <> 1 THEN
    RAISE EXCEPTION 'A variação deve mudar apenas um brawler, mantendo o jogador vinculado.';
  END IF;

  -- Permite repetir uma requisição confirmada após perda de conexão sem duplicar dados.
  SELECT count(*) INTO v_exists FROM public.matches
     WHERE id IN (v_original,v_variation) AND team_id=v_team;
  IF v_exists = 2 THEN
    RETURN jsonb_build_object('original_match_id',v_original,'variation_match_id',v_variation);
  ELSIF v_exists <> 0 THEN
    RAISE EXCEPTION 'Registros inconsistentes. Consulte o histórico antes de tentar novamente.';
  END IF;

  INSERT INTO public.matches(id,team_id,map_id,session_id,opponent_name,result,notes)
    VALUES
    (v_original,v_team,v_map,v_session,v_opponent,'derrota','Derrota original. Teste de variação: '||v_out||' → '||v_in),
    (v_variation,v_team,v_map,v_session,v_opponent,v_result,'Partida com variação: '||v_out||' → '||v_in);

  INSERT INTO public.match_picks(team_id,match_id,team,brawler_id,player_id)
  SELECT v_team,v_original,'nos',x->>'brawler_id',nullif(x->>'player_id','')
  FROM jsonb_array_elements(v_original_picks) AS x;
  INSERT INTO public.match_picks(team_id,match_id,team,brawler_id,player_id)
  SELECT v_team,v_variation,'nos',x->>'brawler_id',nullif(x->>'player_id','')
  FROM jsonb_array_elements(v_variation_picks) AS x;
  INSERT INTO public.match_picks(team_id,match_id,team,brawler_id)
  SELECT v_team,v_original,'inimigo',x
  FROM jsonb_array_elements_text(v_enemy) AS x;
  INSERT INTO public.match_picks(team_id,match_id,team,brawler_id)
  SELECT v_team,v_variation,'inimigo',x
  FROM jsonb_array_elements_text(v_enemy) AS x;

  INSERT INTO public.match_bans(team_id,match_id,team,brawler_id)
  SELECT v_team,v_original,'nos',x
  FROM jsonb_array_elements_text(v_ally_bans) AS x;
  INSERT INTO public.match_bans(team_id,match_id,team,brawler_id)
  SELECT v_team,v_variation,'nos',x
  FROM jsonb_array_elements_text(v_ally_bans) AS x;
  INSERT INTO public.match_bans(team_id,match_id,team,brawler_id)
  SELECT v_team,v_original,'inimigo',x
  FROM jsonb_array_elements_text(v_enemy_bans) AS x;
  INSERT INTO public.match_bans(team_id,match_id,team,brawler_id)
  SELECT v_team,v_variation,'inimigo',x
  FROM jsonb_array_elements_text(v_enemy_bans) AS x;
  RETURN jsonb_build_object('original_match_id',v_original,'variation_match_id',v_variation);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_variation_series(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_variation_series(jsonb) TO authenticated;
