import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getVariationPicks, recordVariationSeries, type VariationDraftData } from '../services/variationService';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('../services/sessionService', () => ({
  sessionService: { getActiveSession: () => null }
}));

const match: VariationDraftData = {
  mapId: 'map-example',
  allyPicks: [
    { brawlerId: 'b-1', playerId: 'player-linc' },
    { brawlerId: 'b-2', playerId: 'player-vitin' },
    { brawlerId: 'b-3' },
  ],
  enemyPicks: ['enemy-1', 'enemy-2', 'enemy-3'],
  allyBans: ['ban-1'],
  enemyBans: ['ban-2'],
  brawlerOut: 'b-2',
  brawlerIn: 'new-brawler',
  variationResult: 'victory',
};

describe('Salvamento de uma variação', () => {
  beforeEach(() => vi.resetAllMocks());

  it('mantém o mesmo atleta vinculado ao brawler substituto', () => {
    expect(getVariationPicks(match)).toEqual([
      { brawlerId: 'b-1', playerId: 'player-linc' },
      { brawlerId: 'new-brawler', playerId: 'player-vitin' },
      { brawlerId: 'b-3' },
    ]);
    expect(match.allyPicks[1].brawlerId).toBe('b-2');
  });

  it('rejeita um substituto banido ou já escolhido', () => {
    expect(() => getVariationPicks({ ...match, brawlerIn: 'ban-2' })).toThrow(/banido/);
    expect(() => getVariationPicks({ ...match, brawlerIn: 'enemy-1' })).toThrow(/escolhido/);
    expect(() => getVariationPicks({ ...match, brawlerIn: 'b-1' })).toThrow();
    expect(() => getVariationPicks({ ...match, brawlerOut: 'inexistente' })).toThrow();
  });

  it('envia as DUAS composições ao banco, com resultado da variação', async () => {
    const ids = {
      originalMatchId: 'a4a6144b-d05a-49e0-a237-932376d42982',
      variationMatchId: '9020f6ae-7f39-4bc9-a410-9c4252b0e115'
    };
    mocks.rpc.mockResolvedValueOnce({ data: { original_match_id: ids.originalMatchId, variation_match_id: ids.variationMatchId }, error: null });
    await expect(recordVariationSeries(match, ids)).resolves.toEqual(ids);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith('record_variation_series', {
      p_payload: expect.objectContaining({
        variation_result: 'vitoria',
        original_match_id: ids.originalMatchId,
        variation_match_id: ids.variationMatchId,
        original_ally_picks: expect.arrayContaining([{ brawler_id: 'b-2', player_id: 'player-vitin' }]),
        variation_ally_picks: expect.arrayContaining([{ brawler_id: 'new-brawler', player_id: 'player-vitin' }])
      })
    });
  });

  it('não retorna sucesso se o banco falhar', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'database error' } });
    await expect(recordVariationSeries(match)).rejects.toThrow(/database error/);
  });
});
