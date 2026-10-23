import { supabase } from '../lib/supabase';
import { Player } from '../types';

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

      // Uma equipe nova começa sem jogadores; nunca inserir o elenco antigo automaticamente.
      if (!data) return [];

      return data.map(mapFromSupabase);
    } catch (err) {
      console.error('Erro ao buscar jogadores no Supabase:', err);
      return []; // Não revelar nem criar jogadores fictícios em outra equipe.
    }
  },

  savePlayer: async (player: Player): Promise<Player> => {
    const row = mapToSupabase(player);
    const { error } = await supabase.from('players').upsert(row);
    if (error) throw new Error(`Erro ao salvar jogador: ${error.message}`);
    return player;
  },

  updatePlayerStatus: async (id: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase.from('players').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  },

  deletePlayer: async (id: string): Promise<void> => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;
  }
};
