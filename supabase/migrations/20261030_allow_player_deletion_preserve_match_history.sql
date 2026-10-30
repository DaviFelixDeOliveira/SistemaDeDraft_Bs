-- Permite excluir um jogador sem apagar partidas, resultados, bans ou picks históricos.
-- Os registros de match_picks são mantidos; somente player_id passa a NULL
-- quando o perfil correspondente deixa de existir.
--
-- Há duas FKs independentes para players: ambas precisam aceitar a exclusão.
-- Na FK composta, NÃO limpar team_id: ele garante isolamento entre equipes.
-- Em PostgreSQL 15+ ON DELETE SET NULL (player_id) especifica apenas a coluna
-- a ser limpa, preservando team_id do registro histórico.
ALTER TABLE public.match_picks
  DROP CONSTRAINT IF EXISTS match_picks_player_id_fkey;

ALTER TABLE public.match_picks
  ADD CONSTRAINT match_picks_player_id_fkey
    FOREIGN KEY (player_id)
    REFERENCES public.players (id)
    ON DELETE SET NULL;

ALTER TABLE public.match_picks
  DROP CONSTRAINT IF EXISTS sd_picks_own_player;

ALTER TABLE public.match_picks
  ADD CONSTRAINT sd_picks_own_player
    FOREIGN KEY (team_id, player_id)
    REFERENCES public.players (team_id, id)
    ON DELETE SET NULL (player_id);
