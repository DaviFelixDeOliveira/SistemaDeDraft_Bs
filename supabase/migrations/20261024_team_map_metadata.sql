-- Nome e classificação de terreno específicos por equipe.
-- O catálogo público de mapas não é alterado por personalizações.
ALTER TABLE public.team_map_settings
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS terrain_override text;

ALTER TABLE public.team_map_settings
  DROP CONSTRAINT IF EXISTS team_map_settings_display_name_check;
ALTER TABLE public.team_map_settings
  ADD CONSTRAINT team_map_settings_display_name_check
  CHECK (display_name IS NULL OR (length(btrim(display_name)) BETWEEN 1 AND 100));

ALTER TABLE public.team_map_settings
  DROP CONSTRAINT IF EXISTS team_map_settings_terrain_override_check;
ALTER TABLE public.team_map_settings
  ADD CONSTRAINT team_map_settings_terrain_override_check
  CHECK (terrain_override IS NULL OR terrain_override IN ('Aberto', 'Semi-Aberto', 'Fechado', 'Misto'));

COMMENT ON COLUMN public.team_map_settings.display_name IS 'Nome personalizado do mapa para esta equipe; não altera o catálogo compartilhado.';
COMMENT ON COLUMN public.team_map_settings.terrain_override IS 'Terreno classificado pela equipe; não altera o catálogo compartilhado.';
