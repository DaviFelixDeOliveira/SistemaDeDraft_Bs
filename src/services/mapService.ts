import { supabase } from '../lib/supabase';
import { GameMap, Composition } from '../types';
import { mockMaps, mockCompositions } from '../data/mockData';

// Em memória apenas para composições se necessário
let compsDb = [...mockCompositions];

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

  // Operações de composições (mantidas localmente em memória apenas)
  getCompsByMap: async (mapId: string): Promise<Composition[]> => {
    return compsDb.filter(c => c.mapId === mapId);
  },

  createComp: async (comp: Omit<Composition, 'id'>): Promise<Composition> => {
    const newComp = { ...comp, id: crypto.randomUUID() };
    compsDb.push(newComp);
    return newComp;
  }
};
