-- A sala vale 12 horas contadas pelo relógio do banco de dados.
-- Isso evita que um celular ou notebook com relógio adiantado gere
-- expires_at superior ao limite autorizado pela política RLS.
-- O backend continua impondo o máximo de 12 horas; as salas existentes
-- não são modificadas.
alter table public.draft_auto_rooms
  alter column expires_at set default (now() + interval '12 hours');
