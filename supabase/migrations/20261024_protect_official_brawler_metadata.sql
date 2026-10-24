-- Mantém overrides legados existentes, mas impede alterar raridade/classe
-- definida pelo catálogo oficial. Nenhuma linha antiga é removida.
CREATE OR REPLACE FUNCTION private.protect_official_team_brawler_metadata()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.rarity IS NOT NULL OR NEW.type IS NOT NULL THEN
     RAISE EXCEPTION 'Raridade e classe são do catálogo oficial.' USING ERRCODE='42501';
   END IF;
 ELSE
   IF NEW.rarity IS DISTINCT FROM OLD.rarity OR NEW.type IS DISTINCT FROM OLD.type THEN
     RAISE EXCEPTION 'Raridade e classe não podem ser alteradas pela equipe.' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_team_brawler_official_metadata ON public.team_brawler_settings;
CREATE TRIGGER protect_team_brawler_official_metadata
BEFORE INSERT OR UPDATE OF rarity,type ON public.team_brawler_settings
FOR EACH ROW EXECUTE FUNCTION private.protect_official_team_brawler_metadata();
