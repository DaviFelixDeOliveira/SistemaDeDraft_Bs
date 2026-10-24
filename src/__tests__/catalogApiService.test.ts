import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addMapFromApi, parseExternalMaps, syncBrawlersFromApi } from '../services/catalogApiService';

const hooks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { functions: { invoke: hooks.invoke } } }));

describe('Catálogo BrawlAPI', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normaliza modos competitivos e descarta modalidades não suportadas', () => {
    const list = parseExternalMaps({ list: [
      { id: 15000292, name: 'Aberto', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000292.png', gameMode: { name: 'Hot Zone' } },
      { id: 15000555, name: 'Outro', gameMode: { name: 'Duo Showdown' }, disabled: true },
      { id: 15000300, name: 'Goal', gameMode: { name: 'Brawl Ball' }, disabled: true },
    ] });
    expect(list).toEqual([
      { id: '15000292', name: 'Aberto', mode: 'Zona Estratégica', imageUrl: 'https://cdn.brawlify.com/maps/regular/15000292.png', disabled: false },
      { id: '15000300', name: 'Goal', mode: 'Fute-Brawl', imageUrl: null, disabled: true },
    ]);
  });

  it('falha com retorno inesperado para não sobrescrever o catálogo atual', () => {
    expect(() => parseExternalMaps({ error: 'invalid' })).toThrow(/inesperada/);
  });

  it('envia à função protegida o nome confirmado para a equipe', async () => {
    hooks.invoke.mockResolvedValue({ data: { ok: true, mapId: '15000292', mode: 'Zona Estratégica' }, error: null });
    expect(await addMapFromApi('15000292', { name: 'Aberto', terrain: 'Misto' })).toMatchObject({ mapId: '15000292' });
    expect(hooks.invoke).toHaveBeenCalledWith('catalog-sync', { body: { action: 'add-map', mapId: 15000292, displayName: 'Aberto', terrain: 'Misto' } });
  });

  it('rejeita IDs externos não numéricos e respostas inválidas', async () => {
    await expect(addMapFromApi('javascript:evil', { name: 'Mapa', terrain: 'Misto' })).rejects.toThrow(/inválido/);
    hooks.invoke.mockResolvedValue({ data: { ok: false, error: 'Mapa desconhecido' }, error: null });
    await expect(addMapFromApi('15000292')).rejects.toThrow('Mapa desconhecido');
  });

  it('não utiliza chave de serviço no frontend para atualizar brawlers', async () => {
    hooks.invoke.mockResolvedValue({ data: { ok: true, sourceCount: 109, created: 3, updated: 0, lastSync: '2026-10-23T12:00:00Z' }, error: null });
    const data = await syncBrawlersFromApi();
    expect(data.created).toBe(3);
    expect(hooks.invoke).toHaveBeenCalledWith('catalog-sync', { body: { action: 'sync-brawlers' } });
  });
});
