import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeBrawlTag, supercellPlayerService } from '../services/supercellPlayerService';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));

describe('Supercell player API client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normaliza a tag sem modificar seu identificador', () => {
    expect(normalizeBrawlTag(' #22qj0jpvj ')).toBe('#22QJ0JPVJ');
    expect(normalizeBrawlTag('22QJ0JPVJ')).toBe('#22QJ0JPVJ');
  });

  it('busca o perfil no servidor sem chave oficial no navegador', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { ok: true, tag: '#22QJ0JPVJ', nickname: 'Linc' }, error: null });
    expect(await supercellPlayerService.lookup('22qj0jpvj')).toEqual({ ok: true, tag: '#22QJ0JPVJ', nickname: 'Linc' });
    expect(mocks.invoke).toHaveBeenCalledWith('brawl-player', { body: { action: 'lookup', tag: '#22QJ0JPVJ' } });
  });

  it('rejeita tags inválidas antes de consultar a API', async () => {
    expect(() => supercellPlayerService.lookup('xx!')).toThrow(/tag válida/);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('revalida o nickname pelo identificador interno do jogador', async () => {
    const data = { ok: true, tag: '#22QJ0JPVJ', nickname: 'Linc BR', lastCheckedAt: '2026-10-24T16:00:00Z' };
    mocks.invoke.mockResolvedValueOnce({ data, error: null });
    await expect(supercellPlayerService.refresh('uuid-existing-player')).resolves.toEqual(data);
    expect(mocks.invoke).toHaveBeenCalledWith('brawl-player', { body: { action: 'refresh', playerId: 'uuid-existing-player' } });
  });

  it('não finge sucesso diante de falha de autenticação', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('Unauthorized') });
    await expect(supercellPlayerService.lookup('#22QJ0JPVJ')).rejects.toThrow(/não pôde ser concluída/);
  });
});
