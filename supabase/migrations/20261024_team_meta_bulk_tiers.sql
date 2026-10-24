-- Alteração em lote dos tiers sem sobrescrever raridade, imagens ou demais configurações.
-- SECURITY INVOKER mantém as regras de RLS. Nunca aceita team_id do cliente.
CREATE OR REPLACE FUNCTION public.set_team_brawler_tiers(p_ids text[], p_tier text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_ids text[];
  v_updated integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'É necessário entrar na equipe.' USING ERRCODE = '42501';
  END IF;
  IF p_tier IS NULL OR p_tier NOT IN ('S', 'A', 'B', 'C', 'D') THEN
    RAISE EXCEPTION 'Tier inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(DISTINCT b_id) INTO v_ids
  FROM unnest(p_ids) AS b_id WHERE b_id IS NOT NULL AND btrim(b_id) <> '';
  IF v_ids IS NULL OR cardinality(v_ids) > 150 THEN
    RAISE EXCEPTION 'Selecione de 1 a 150 brawlers.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_ids) AS requested(id)
    WHERE NOT EXISTS (SELECT 1 FROM public.brawlers b WHERE b.id = requested.id)
  ) THEN
    RAISE EXCEPTION 'Há brawlers inválidos na seleção.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.team_brawler_settings(team_id, brawler_id, tier)
  SELECT v_user, item.id, p_tier FROM unnest(v_ids) AS item(id)
  ON CONFLICT(team_id, brawler_id)
    DO UPDATE SET tier = EXCLUDED.tier
      WHERE public.team_brawler_settings.tier IS DISTINCT FROM EXCLUDED.tier;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;
REVOKE ALL ON FUNCTION public.set_team_brawler_tiers(text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_team_brawler_tiers(text[], text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_team_brawler_tiers(text[], text) TO authenticated;
COMMENT ON FUNCTION public.set_team_brawler_tiers(text[], text)
IS 'Atualiza apenas o tier da equipe autenticada, com segurança RLS e sem alterar o catálogo global.';
