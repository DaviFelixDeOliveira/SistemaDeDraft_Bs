-- Associação opcional a uma tag oficial, sem modificar IDs internos ou histórico.
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS brawl_tag text,
  ADD COLUMN IF NOT EXISTS brawl_tag_checked_at timestamptz;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_brawl_tag_format;
ALTER TABLE public.players ADD CONSTRAINT players_brawl_tag_format
  CHECK (brawl_tag IS NULL OR brawl_tag ~ '^#[A-Z0-9]{3,16}$');
CREATE UNIQUE INDEX IF NOT EXISTS players_team_brawl_tag_unique
  ON public.players (team_id,brawl_tag) WHERE brawl_tag IS NOT NULL;
COMMENT ON COLUMN public.players.brawl_tag IS 'Tag opcional da conta Supercell. Não muda id interno dos jogadores nem match_picks.';
COMMENT ON COLUMN public.players.brawl_tag_checked_at IS 'Última consulta bem-sucedida à API oficial para esta tag.';
