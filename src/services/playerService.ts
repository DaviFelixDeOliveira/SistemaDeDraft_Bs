import { supabase } from '../lib/supabase';
import { Player } from '../types';

function mapFromSupabase(data: any): Player {
  return {
    id: data.id,
    name: data.name,
    nickname: data.nickname,
    brawlTag: data.brawl_tag ?? null,
    brawlTagCheckedAt: data.brawl_tag_checked_at ?? null,
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
  if (player.brawlTag !== undefined) row.brawl_tag = player.brawlTag;
  if (player.brawlTagCheckedAt !== undefined) row.brawl_tag_checked_at = player.brawlTagCheckedAt;
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
    // O formulário de novo jogador não possui id. O banco exige um identificador
    // TEXT não nulo, então geramos um UUID como texto antes de inserir.
    // Na edição, preservamos o mesmo id para atualizar o registro correto.
    const nickname = player.nickname?.trim();
    if (!nickname) throw new Error('Informe o nickname do jogador.');
    const name = player.name?.trim() || nickname;
    if (player.brawlTag && !/^#[A-Z0-9]{3,16}$/.test(player.brawlTag)) throw new Error('Tag de jogador inválida.');
    const id = player.id?.trim() || crypto.randomUUID();
    const row = mapToSupabase({ ...player, id, name, nickname });

    const { data, error } = await supabase.from('players')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) throw new Error(`Erro ao salvar jogador: ${error.message}`);
    if (!data) throw new Error('O banco não confirmou o salvamento do jogador.');
    return mapFromSupabase(data);
  },

  updatePlayerStatus: async (id: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase.from('players').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  },

  deletePlayer: async (id: string): Promise<void> => {
    // As FKs de match_picks usam ON DELETE SET NULL: a partida e seus picks
    // permanecem no histórico, apenas a associação com o jogador é removida.
    // Retornar o ID evita tratar uma exclusão de 0 linhas (RLS/inexistente) como sucesso.
    const { data, error } = await supabase.from('players')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      if (error.code === '23503') {
        throw new Error('O jogador ainda está vinculado a partidas. A atualização necessária do banco de dados não foi aplicada.');
      }
      throw new Error(`Não foi possível excluir o jogador: ${error.message}`);
    }
    if (!data) throw new Error('Jogador não encontrado ou sem permissão para excluí-lo.');
  }
};
