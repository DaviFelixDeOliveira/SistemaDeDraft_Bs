import { supabase } from '../lib/supabase';
import { sessionService } from './sessionService';
import type { MatchRecordData } from '../types';

export interface VariationDraftData extends Omit<MatchRecordData, 'result' | 'variationTested'> {
  brawlerOut: string;
  brawlerIn: string;
  variationResult: 'victory' | 'defeat';
}

export interface VariationPairResult {
  originalMatchId: string;
  variationMatchId: string;
}

/**
 * O segundo jogo usa a mesma escalação: quem pilotava o brawler removido
 * continua vinculado ao novo brawler, se houver jogador designado.
 * Os resultados são duas partidas REAIS, não uma estimativa do algoritmo.
 */
export function getVariationPicks(data: VariationDraftData) {
  if (!data.brawlerOut || !data.brawlerIn || data.brawlerOut === data.brawlerIn) {
    throw new Error('Escolha dois brawlers diferentes.');
  }
  if (!data.allyPicks.some(p => p.brawlerId === data.brawlerOut)) {
    throw new Error('O brawler removido precisa fazer parte da nossa composição.');
  }
  if (data.allyPicks.some(p => p.brawlerId === data.brawlerIn)
      || data.enemyPicks.includes(data.brawlerIn)
      || data.allyBans.includes(data.brawlerIn)
      || data.enemyBans.includes(data.brawlerIn)) {
    throw new Error('O brawler que entrou já foi escolhido ou banido.');
  }
  return data.allyPicks.map(p => p.brawlerId === data.brawlerOut
    ? { ...p, brawlerId: data.brawlerIn }
    : { ...p });
}

/**
 * Registra, em UMA transação no PostgreSQL, a derrota original e a
 * segunda partida com a variação. Se algo falhar, nada é registrado.
 * A RPC SECURITY INVOKER respeita as políticas RLS da equipe.
 */
export async function recordVariationSeries(data: VariationDraftData, ids?: VariationPairResult): Promise<VariationPairResult> {
  const modifiedPicks = getVariationPicks(data);
  const matchIds = ids ?? {
    originalMatchId: crypto.randomUUID(),
    variationMatchId: crypto.randomUUID(),
  };
  const activeSession = sessionService.getActiveSession();
  const payload = {
    map_id: data.mapId,
    session_id: data.sessionId === undefined ? activeSession?.id ?? null : data.sessionId,
    opponent_name: data.opponentName || activeSession?.opponent_name || 'Inimigo',
    original_match_id: matchIds.originalMatchId,
    variation_match_id: matchIds.variationMatchId,
    original_ally_picks: data.allyPicks.map(p => ({ brawler_id: p.brawlerId, player_id: p.playerId || null })),
    variation_ally_picks: modifiedPicks.map(p => ({ brawler_id: p.brawlerId, player_id: p.playerId || null })),
    enemy_picks: data.enemyPicks,
    ally_bans: data.allyBans,
    enemy_bans: data.enemyBans,
    variation_result: data.variationResult === 'victory' ? 'vitoria' : 'derrota',
    brawler_out: data.brawlerOut,
    brawler_in: data.brawlerIn,
  };
  const { data: result, error } = await supabase.rpc('record_variation_series', { p_payload: payload });
  if (error) throw new Error('Falha ao registrar as duas partidas: ' + error.message);
  if (!result || result.original_match_id !== matchIds.originalMatchId
      || result.variation_match_id !== matchIds.variationMatchId) {
    throw new Error('O banco não confirmou os registros da variação.');
  }
  return matchIds;
}
