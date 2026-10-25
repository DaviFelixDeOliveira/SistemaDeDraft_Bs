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
export type DraftAutoCatalog = {
  maps: { id: string; name: string; mode: string }[];
  brawlers: { id: string; name: string }[];
};
export type DraftAutoManualEvent =
  | { kind: 'map'; mapId: string }
  | { kind: 'first-pick'; allyStarts: boolean }
  | { kind: 'ban' | 'pick'; team: 'ally' | 'enemy'; slot: number; brawlerId: string };
export type DraftAutoRoomEvent = {
  id: string;
  room_id: string;
  request_id: string;
  client_event_id: string;
  kind: 'map' | 'first-pick' | 'ban' | 'pick';
  map_id: string | null;
  ally_starts: boolean | null;
  team: 'ally' | 'enemy' | null;
  slot: number | null;
  brawler_id: string | null;
  created_at: string;
  review_status: 'pending' | 'applied' | 'dismissed';
  map?: { name: string } | null;
  brawler?: { name: string } | null;
  guest?: { display_name: string } | null;
};

export const draftAutoGuestService = {
  catalog: async (session: GuestJoinSession): Promise<DraftAutoCatalog> => {
    const data = await guestFunction({ action: 'catalog', requestId: session.requestId, token: session.token });
    if (!Array.isArray(data.maps) || !Array.isArray(data.brawlers)) {
      throw new Error('Catálogo de draft indisponível.');
    }
    return { maps: data.maps as DraftAutoCatalog['maps'], brawlers: data.brawlers as DraftAutoCatalog['brawlers'] };
  },
  sendEvent: async (session: GuestJoinSession, event: DraftAutoManualEvent): Promise<void> => {
    const data = await guestFunction({
      action: 'send-event', requestId: session.requestId, token: session.token,
      eventId: crypto.randomUUID(), ...event,
    });
    if (data.accepted !== true) throw new Error('Servidor não confirmou o envio.');
  },
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

export const draftAutoCoachEvents = {
  listPending: async (roomIds: string[]): Promise<DraftAutoRoomEvent[]> => {
    if (roomIds.length === 0) return [];
    const { data, error } = await supabase.from('draft_auto_events')
      .select('id,room_id,request_id,client_event_id,kind,map_id,ally_starts,team,slot,brawler_id,created_at,review_status,map:maps!draft_auto_events_map_id_fkey(name),brawler:brawlers!draft_auto_events_brawler_id_fkey(name),guest:draft_auto_join_requests!draft_auto_events_request_id_fkey(display_name)')
      .in('room_id', roomIds).eq('review_status', 'pending')
      .order('created_at', { ascending: true }).limit(100);
    if (error) throw error;
    return (data || []) as unknown as DraftAutoRoomEvent[];
  },
  markReviewed: async (event: Pick<DraftAutoRoomEvent, 'id' | 'room_id'>, status: 'applied' | 'dismissed'): Promise<void> => {
    const { data, error } = await supabase.from('draft_auto_events')
      .update({ review_status: status }).eq('id', event.id).eq('room_id', event.room_id)
      .eq('review_status', 'pending')
      .select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('O evento já foi analisado ou não está disponível para esta equipe. Atualize a página.');
  },
  list: async (roomId: string): Promise<DraftAutoRoomEvent[]> => {
    const { data, error } = await supabase.from('draft_auto_events')
      .select('id,room_id,request_id,client_event_id,kind,map_id,ally_starts,team,slot,brawler_id,created_at,review_status,map:maps!draft_auto_events_map_id_fkey(name),brawler:brawlers!draft_auto_events_brawler_id_fkey(name),guest:draft_auto_join_requests!draft_auto_events_request_id_fkey(display_name)')
      .eq('room_id', roomId).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return (data || []) as unknown as DraftAutoRoomEvent[];
  },
};
