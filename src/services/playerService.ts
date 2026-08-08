import { supabase } from '../lib/supabase';
import { Player } from '../types';
import { mockPlayers } from '../data/mockData';

function mapFromSupabase(data: any): Player {
  return {
    id: data.id,
    name: data.name,
    nickname: data.nickname,
    status: data.status || 'Titular',
    isActive: data.is_active ?? true,
    is_active: data.is_active ?? true,
    comfortBrawlers: data.comfort_brawlers || [],
    tags: data.tags || [],
  };
}

function mapToSupabase(player: Partial<Player>): any {
  const row: any = {};
  if (player.id !== undefined) row.id = player.id;
  if (player.name !== undefined) row.name = player.name;
  if (player.nickname !== undefined) row.nickname = player.nickname;
  if (player.status !== undefined) row.status = player.status;
  if (player.isActive !== undefined) row.is_active = player.isActive;
  if (player.is_active !== undefined) row.is_active = player.is_active;
  if (player.comfortBrawlers !== undefined) row.comfort_brawlers = player.comfortBrawlers;
  if (player.tags !== undefined) row.tags = player.tags;
  return row;
}

export const playerService = {
  getPlayers: async (): Promise<Player[]> => {
    try {
      const { data, error } = await supabase.from('players').select('*').order('name');
      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('Tabela de players vazia. Inserindo dados de seed...');
        const seedRows = mockPlayers.map(mapToSupabase);
        const { error: seedError } = await supabase.from('players').insert(seedRows);
        if (seedError) console.error('Erro ao realizar seed de players:', seedError);
        return mockPlayers;
      }

      return data.map(mapFromSupabase);
    } catch (err) {
      console.error('Erro ao buscar players do Supabase, usando dados locais:', err);
      return mockPlayers;
    }
  },

  savePlayer: async (player: Player): Promise<Player> => {
    const row = mapToSupabase(player);
    const { error } = await supabase.from('players').upsert(row);
    if (error) console.error('Erro ao salvar player no Supabase:', error);
    return player;
  },

  updatePlayerStatus: async (id: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase.from('players').update({ is_active: isActive }).eq('id', id);
    if (error) console.error('Erro ao atualizar status do player no Supabase:', error);
  },

  deletePlayer: async (id: string): Promise<void> => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) console.error('Erro ao excluir player no Supabase:', error);
  }
};
