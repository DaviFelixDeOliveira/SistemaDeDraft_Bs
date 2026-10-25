import { describe, expect, it } from 'vitest';
import { moveDraftAutoSelection, orderedPendingDraftEvents } from '../lib/draftAutoInbox';
import type { DraftAutoRoomEvent } from '../services/draftAutoGuestService';
const event = (id: string, created_at: string, review_status: DraftAutoRoomEvent['review_status'] = 'pending'): DraftAutoRoomEvent =>
  ({ id,created_at,review_status,room_id:'room',request_id:'request',client_event_id:id,kind:'ban',
    map_id:null,ally_starts:null,team:'ally',slot:0,brawler_id:'griff' });

describe('Fila de eventos recebidos no Draft', () => {
  it('mostra segundo ban sem sair do Draft quando chegam dois eventos', () => {
    const events = orderedPendingDraftEvents([event('ban-2','2026-10-25T00:02:00Z'), event('ban-1','2026-10-25T00:01:00Z')]);
    expect(events.map(e=>e.id)).toEqual(['ban-1','ban-2']);
    expect(orderedPendingDraftEvents(events.filter(e=>e.id!=='ban-1')).map(e=>e.id)).toEqual(['ban-2']);
  });
  it('eventos antigos já confirmados ou descartados não reaparecem', () => {
    expect(orderedPendingDraftEvents([
      event('a','2026-10-25T00:00:00Z','applied'),event('b','2026-10-25T00:01:00Z','dismissed'),
      event('c','2026-10-25T00:02:00Z','pending')]).map(e=>e.id)).toEqual(['c']);
  });
  it('deduplica retransmissões e mantém ordenação determinística', () => {
    expect(orderedPendingDraftEvents([
      event('b','2026-10-25T00:01:00Z'),event('a','2026-10-25T00:01:00Z'),event('b','2026-10-25T00:01:00Z')
    ]).map(e=>e.id)).toEqual(['a','b']);
  });
  it('permite avançar e voltar sem perder eventos pendentes', () => {
    const q = orderedPendingDraftEvents([event('a','2026-10-25T00:01:00Z'),event('b','2026-10-25T00:02:00Z')]);
    expect(moveDraftAutoSelection(q,'a',1)).toBe('b');
    expect(moveDraftAutoSelection(q,'a',-1)).toBe('b');
    expect(moveDraftAutoSelection(q,'b',1)).toBe('a');
    expect(moveDraftAutoSelection([],null,1)).toBeNull();
  });
});
