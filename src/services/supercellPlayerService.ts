import { supabase } from '../lib/supabase';

export type OfficialPlayerProfile = { tag: string; nickname: string };
type PlayerRefreshResult = OfficialPlayerProfile & {
  ok: boolean; skipped?: boolean; lastCheckedAt: string;
};

export function normalizeBrawlTag(value: string): string {
  return '#' + value.trim().toUpperCase().replace(/^#/, '').replace(/\s/g, '');
}

function validateBrawlTag(value: string): string {
  const tag = normalizeBrawlTag(value);
  if (!/^#[A-Z0-9]{3,16}$/.test(tag)) throw new Error('Informe uma tag válida do Brawl Stars (ex.: #22QJ0JPVJ).');
  return tag;
}

async function invokePlayerApi<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>('brawl-player', { body });
  if (error) {
    // Supabase FunctionsHttpError contém a resposta de erro da função, se disponível.
    let message = 'A consulta à Supercell não pôde ser concluída. Verifique sua conexão e a configuração da chave.';
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = await context.json() as { error?: string };
        if (payload.error) message = payload.error;
      } catch { /* formato inesperado: mantém mensagem padrão */ }
    }
    throw new Error(message);
  }
  if (!data || !('ok' in data) || !data.ok) {
    throw new Error(data?.error || 'A Supercell não confirmou os dados do jogador.');
  }
  return data;
}

export const supercellPlayerService = {
  lookup: (rawTag: string): Promise<OfficialPlayerProfile> =>
    invokePlayerApi<OfficialPlayerProfile & {ok: boolean}>({ action: 'lookup', tag: validateBrawlTag(rawTag) }),

  refresh: (playerId: string): Promise<PlayerRefreshResult> =>
    invokePlayerApi<PlayerRefreshResult>({ action: 'refresh', playerId }),
};
