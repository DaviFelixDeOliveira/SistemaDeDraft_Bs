import { supabase } from '../lib/supabase';
import { Brawler } from '../types';
import { mockBrawlers } from '../data/mockData';

// Converte do formato do banco (snake_case) para o formato do app (camelCase)
function mapFromSupabase(data: any): Brawler {
  return {
    id: data.id,
    name: data.name,
    rarity: data.rarity,
    tier: data.tier,
    health: data.health,
    healthValue: data.health_value || undefined,
    type: data.type || [],
    walksOnWater: !!data.walks_on_water,
    breaksWalls: !!data.breaks_walls,
    howBreaksWalls: data.how_breaks_walls || undefined,
    imageUrl: data.image_url || undefined,
    iconUrl: data.icon_url || undefined,
    isHotPick: !!data.is_hot_pick,
    is_active: data.is_active ?? true,
  };
}

// Converte do formato do app para o formato do banco
function mapToSupabase(brawler: Partial<Brawler>): any {
  const row: any = {};
  if (brawler.id !== undefined) row.id = brawler.id;
  if (brawler.name !== undefined) row.name = brawler.name;
  if (brawler.rarity !== undefined) row.rarity = brawler.rarity;
  if (brawler.tier !== undefined) row.tier = brawler.tier;
  if (brawler.health !== undefined) row.health = brawler.health;
  if (brawler.healthValue !== undefined) row.health_value = brawler.healthValue;
  if (brawler.type !== undefined) row.type = brawler.type;
  if (brawler.walksOnWater !== undefined) row.walks_on_water = brawler.walksOnWater;
  if (brawler.breaksWalls !== undefined) row.breaks_walls = brawler.breaksWalls;
  if (brawler.howBreaksWalls !== undefined) row.how_breaks_walls = brawler.howBreaksWalls;
  if (brawler.imageUrl !== undefined) row.image_url = brawler.imageUrl;
  if (brawler.iconUrl !== undefined) row.icon_url = brawler.iconUrl;
  if (brawler.isHotPick !== undefined) row.is_hot_pick = brawler.isHotPick;
  if (brawler.is_active !== undefined) row.is_active = brawler.is_active;
  return row;
}

export const brawlerService = {
  getBrawlers: async (): Promise<Brawler[]> => {
    try {
      const { data, error } = await supabase.from('brawlers').select('*').order('name');
      if (error) throw error;

      // Se a tabela estiver vazia, faz o seed automático com mockBrawlers
      if (!data || data.length === 0) {
        console.log('Tabela de brawlers vazia. Inserindo dados de seed...');
        const seedRows = mockBrawlers.map(mapToSupabase);
        const { error: seedError } = await supabase.from('brawlers').insert(seedRows);
        if (seedError) console.error('Erro ao realizar seed de brawlers:', seedError);
        return mockBrawlers;
      }

      return data.map(mapFromSupabase);
    } catch (err) {
      console.error('Erro ao buscar brawlers do Supabase, usando dados locais de fallback:', err);
      return mockBrawlers;
    }
  },

  createBrawler: async (brawler: Omit<Brawler, 'id'>): Promise<Brawler> => {
    const id = (16000000 + Math.floor(Math.random() * 900000)).toString();
    const newBrawler = { ...brawler, id } as Brawler;
    const row = mapToSupabase(newBrawler);

    const { error } = await supabase.from('brawlers').insert(row);
    if (error) console.error('Erro ao criar brawler no Supabase:', error);

    return newBrawler;
  },

  updateBrawler: async (id: string, changes: Partial<Brawler>): Promise<Brawler | null> => {
    const row = mapToSupabase(changes);
    const { error } = await supabase.from('brawlers').update(row).eq('id', id);
    if (error) console.error('Erro ao atualizar brawler no Supabase:', error);
    return null;
  },

  deleteBrawler: async (id: string): Promise<void> => {
    const { error } = await supabase.from('brawlers').delete().eq('id', id);
    if (error) console.error('Erro ao excluir brawler no Supabase:', error);
  }
};
