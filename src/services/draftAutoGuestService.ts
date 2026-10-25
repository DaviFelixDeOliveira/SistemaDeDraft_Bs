import { supabase } from '../lib/supabase';

export type GuestJoinSession = {
  code: string;
  requestId: string;
  token: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
};
export type JoinRequest = {
  id: string;
  room_id: string;
  display_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  expires_at: string;
};
function serviceError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error('Não foi possível comunicar com o servidor.');
}
async function guestFunction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('draft-auto-join', { body });
  if (error) {
    // supabase-js has the response error in the thrown FunctionsHttpError context.
    const context = (error as {context?: Response}).context;
    if (context && typeof context.json === 'function') {
      const json = await context.json().catch(() => null);
      if (json?.error && typeof json.error === 'string') throw new Error(json.error);
    }
    throw serviceError(error);
  }
  if (!data || typeof data !== 'object') throw new Error('Resposta inválida do servidor.');
  if (typeof data.error === 'string') throw new Error(data.error);
  return data as Record<string, unknown>;
}
export const draftAutoGuestService = {
  request: async (code: string, name: string): Promise<GuestJoinSession> => {
    const data = await guestFunction({ action: 'request', code, name });
    if (typeof data.requestId !== 'string' || typeof data.token !== 'string' ||
        typeof data.expiresAt !== 'string' || data.status !== 'pending') {
      throw new Error('Resposta de conexão inválida.');
    }
    return {
      code, requestId: data.requestId, token: data.token, expiresAt: data.expiresAt,
      status: 'pending',
    };
  },
  status: async (session: GuestJoinSession): Promise<GuestJoinSession['status']> => {
    const data = await guestFunction({ action: 'status', requestId: session.requestId, token: session.token });
    if (!['pending', 'approved', 'rejected', 'expired'].includes(String(data.status))) {
      throw new Error('Estado da solicitação desconhecido.');
    }
    return data.status as GuestJoinSession['status'];
  },
};

export const draftAutoCoachRequests = {
  list: async (roomId: string): Promise<JoinRequest[]> => {
    const { data, error } = await supabase.from('draft_auto_join_requests')
      .select('id,room_id,display_name,status,created_at,expires_at')
      .eq('room_id', roomId).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return (data || []) as JoinRequest[];
  },
  review: async (roomId: string, requestId: string, action: 'approved' | 'rejected'): Promise<void> => {
    const { data, error } = await supabase.from('draft_auto_join_requests')
      .update({ status: action }).eq('room_id', roomId).eq('id', requestId)
      .eq('status', 'pending').select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Solicitação indisponível ou já analisada.');
  },
};
