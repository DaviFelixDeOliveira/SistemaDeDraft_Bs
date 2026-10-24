-- Controle de atualizações automáticas do catálogo global.
-- Somente a função Edge autenticada usa a chave de serviço para acessar a tabela.
CREATE TABLE IF NOT EXISTS public.catalog_sync_state (
  source text PRIMARY KEY,
  last_sync_at timestamptz NOT NULL DEFAULT now(),
  source_count integer NOT NULL DEFAULT 0,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.catalog_sync_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_sync_state FROM anon, authenticated;
COMMENT ON TABLE public.catalog_sync_state IS 'Controle privado de sincronização do catálogo BrawlAPI, sem dados de equipe.';
