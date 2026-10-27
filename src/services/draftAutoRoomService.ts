import { supabase } from '../lib/supabase';
import { generateDraftAutoRoomCode } from '../lib/draftAutoRoomCode';

export interface DraftAutoRoom {
  id: string;
  team_id: string;
  join_code: string;
  status: 'active' | 'closed';
  created_at: string;
  expires_at: string;
}

const columns = 'id,team_id,join_code,status,created_at,expires_at';
async function requireTeamId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Faça login na conta da equipe para gerenciar salas.');
  return data.user.id;
}

function explainError(error: { code?: string; message?: string }): Error {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return new Error('As salas ainda não foram habilitadas no banco de dados. É preciso aplicar a migração de segurança.');
  }
  return new Error(error.message || 'Não foi possível acessar as salas.');
}

export const draftAutoRoomService = {
  list: async (): Promise<DraftAutoRoom[]> => {
    const teamId = await requireTeamId();
    const { data, error } = await supabase.from('draft_auto_rooms')
      .select(columns).eq('team_id', teamId).order('created_at', { ascending: false }).limit(100);
    if (error) throw explainError(error);
    return (data || []) as DraftAutoRoom[];
  },

  create: async (): Promise<DraftAutoRoom> => {
    const teamId = await requireTeamId();
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase.from('draft_auto_rooms')
        // Use the DB-side 12h expiry default to avoid browser clock skew.
        .insert({ team_id: teamId, join_code: generateDraftAutoRoomCode(), status: 'active' })
        .select(columns).single();
      if (!error && data) return data as DraftAutoRoom;
      if (error?.code === '23505') continue;
      throw explainError(error || { message: 'A criação da sala não foi confirmada.' });
    }
    throw new Error('Não foi possível gerar código exclusivo. Tente novamente.');
  },

  /** Delete an inactive room only. The DB RLS also rejects active, unexpired rooms. */
  removeInactive: async (roomId: string): Promise<void> => {
    const teamId = await requireTeamId();
    const { data, error } = await supabase.from('draft_auto_rooms')
      .delete()
      .eq('team_id', teamId).eq('id', roomId)
      .or(`status.eq.closed,expires_at.lte.${new Date().toISOString()}`)
      .select('id').maybeSingle();
    if (error) throw explainError(error);
    if (!data) throw new Error('A sala continua ativa, já foi excluída ou você não tem permissão.');
  },

  /** Remove every expired/closed room belonging to this team (never live rooms). */
  clearInactive: async (): Promise<number> => {
    const teamId = await requireTeamId();
    const { data, error } = await supabase.from('draft_auto_rooms')
      .delete()
      .eq('team_id', teamId)
      .or(`status.eq.closed,expires_at.lte.${new Date().toISOString()}`)
      .select('id');
    if (error) throw explainError(error);
    return data?.length ?? 0;
  },

  close: async (roomId: string): Promise<void> => {
    const teamId = await requireTeamId();
    const { data, error } = await supabase.from('draft_auto_rooms')
      .update({ status: 'closed' })
      .eq('team_id', teamId).eq('id', roomId).eq('status', 'active')
      .select('id').maybeSingle();
    if (error) throw explainError(error);
    if (!data) throw new Error('Sala não encontrada, já encerrada ou sem permissão.');
  },
};
