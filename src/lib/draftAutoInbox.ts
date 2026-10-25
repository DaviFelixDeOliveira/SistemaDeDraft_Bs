import type { DraftAutoRoomEvent } from '../services/draftAutoGuestService';

/** The backend may return events in any order, especially across rooms. */
export function orderedPendingDraftEvents(events: DraftAutoRoomEvent[]): DraftAutoRoomEvent[] {
  const byId = new Map<string, DraftAutoRoomEvent>();
  for (const event of events) {
    if (event.review_status === 'pending') byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) =>
    a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export function moveDraftAutoSelection(
  items: DraftAutoRoomEvent[], currentId: string | null, offset: -1 | 1,
): string | null {
  if (items.length === 0) return null;
  const current = items.findIndex(item => item.id === currentId);
  if (current < 0) return items[0].id;
  return items[(current + offset + items.length) % items.length].id;
}
