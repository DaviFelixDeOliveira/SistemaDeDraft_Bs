import { supabase } from '../lib/supabase';
import { GameMap, Composition } from '../types';
import { mockMaps } from '../data/mockData';

function mapFromSupabase(data: any): GameMap {
  return {
    id: data.id,
    name: data.name,
    mode: data.mode,
    terrain: data.terrain,
    isActive: data.is_active ?? true,
    is_active: data.is_active ?? true,
    imageUrl: data.image_url || undefined,
  };
}

function mapToSupabase(map: Partial<GameMap>): any {
  const row: any = {};
  if (map.id !== undefined) row.id = map.id;
  if (map.name !== undefined) row.name = map.name;
  if (map.mode !== undefined) row.mode = map.mode;
  if (map.terrain !== undefined) row.terrain = map.terrain;
  if (map.isActive !== undefined) row.is_active = map.isActive;
  if (map.is_active !== undefined) row.is_active = map.is_active;
  if (map.imageUrl !== undefined) row.image_url = map.imageUrl;
  return row;
}

function compFromSupabase(data: any): Composition {
  return {
    id: data.id,
    mapId: data.map_id,
    brawlers: data.brawlers as [string, string, string],
    description: data.description || undefined,
    winrate: data.winrate ?? 0,
    matchesPlayed: data.matches_played ?? 0,
    is_active: data.is_active ?? true,
  };
}

export const mapService = {
  getMaps: async (): Promise<GameMap[]> => {
    try {
      const { data, error } = await supabase.from('maps').select('*').order('name');
      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('Tabela de mapas vazia. Inserindo dados de seed...');
        const seedRows = mockMaps.map(mapToSupabase);
        const { error: seedError } = await supabase.from('maps').insert(seedRows);
        if (seedError) console.error('Erro ao realizar seed de mapas:', seedError);
        return mockMaps;
      }

      return data.map(mapFromSupabase);
    } catch (err) {
      console.error('Erro ao buscar mapas do Supabase, usando dados locais:', err);
      return mockMaps;
    }
  },

  getMapById: async (id: string): Promise<GameMap | undefined> => {
    const maps = await mapService.getMaps();
    return maps.find(m => m.id === id);
  },

  createMap: async (map: Omit<GameMap, 'id'>): Promise<GameMap> => {
    const id = 'm_' + crypto.randomUUID().substring(0, 8);
    const newMap = { ...map, id } as GameMap;
    const row = mapToSupabase(newMap);

    const { error } = await supabase.from('maps').insert(row);
    if (error) console.error('Erro ao criar mapa no Supabase:', error);

    return newMap;
  },

  updateMapStatus: async (id: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase.from('maps').update({ is_active: isActive }).eq('id', id);
    if (error) console.error('Erro ao atualizar status do mapa no Supabase:', error);
  },

  // ─── Composições ────────────────────────────────────────────────────────────

  /**
   * Busca todas as composições ativas do Supabase.
   * Retorna array vazio se a tabela ainda não existir ou estiver vazia.
   */
  getComps: async (): Promise<Composition[]> => {
    try {
      const { data, error } = await supabase
        .from('compositions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar composições do Supabase:', error.message);
        return [];
      }
      return (data || []).map(compFromSupabase);
    } catch (err) {
      console.warn('Erro ao conectar ao Supabase para composições:', err);
      return [];
    }
  },

  /**
   * Busca composições de um mapa específico.
   */
  getCompsByMap: async (mapId: string): Promise<Composition[]> => {
    try {
      const { data, error } = await supabase
        .from('compositions')
        .select('*')
        .eq('map_id', mapId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar composições do mapa:', error.message);
        return [];
      }
      return (data || []).map(compFromSupabase);
    } catch (err) {
      console.warn('Erro ao conectar ao Supabase para composições do mapa:', err);
      return [];
    }
  },

  /**
   * Cria uma nova composição e persiste no Supabase.
   * isMeta=true para composições salvas via "Salvar como Meta do Mapa".
   * isMeta=false para composições criadas manualmente via "Nova Comp".
   */
  createComp: async (comp: Omit<Composition, 'id'>, isMeta = false): Promise<Composition> => {
    const row = {
      map_id: comp.mapId,
      brawlers: comp.brawlers,
      description: comp.description || null,
      winrate: comp.winrate ?? 0,
      matches_played: comp.matchesPlayed ?? 0,
      is_meta: isMeta,
      is_active: true,
    };

    try {
      const { data, error } = await supabase
        .from('compositions')
        .insert(row)
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar composição no Supabase:', error.message);
        // Fallback: retorna com id gerado localmente
        return { ...comp, id: crypto.randomUUID() };
      }
      return compFromSupabase(data);
    } catch (err) {
      console.error('Erro ao conectar ao Supabase para criar composição:', err);
      return { ...comp, id: crypto.randomUUID() };
    }
  },
};
