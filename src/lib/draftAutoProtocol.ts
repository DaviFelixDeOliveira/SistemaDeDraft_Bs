/**
 * Shared event contract for the future Android/iOS capture clients, integrations and coach UI.
 * This module is pure: no Supabase writes, screenshot capture or game-client automation.
 * Ingestion happens only after the backend verifies session authorization.
 */
export type DraftAutoSource = 'manual' | 'screen' | 'provider';
export type DraftAutoTeam = 'ally' | 'enemy';
export type DraftAutoPick = { team: DraftAutoTeam; brawlerId: string };

type ObservationBase = {
  eventId: string;
  source: DraftAutoSource;
  confidence: number; // 0..1; an actual recognizer must report its measured confidence
};
export type DraftAutoObservation = ObservationBase & (
  | { kind: 'map'; mapId: string }
  | { kind: 'first-pick'; allyStarts: boolean }
  | { kind: 'ban'; team: DraftAutoTeam; slot: number; brawlerId: string }
  | { kind: 'pick'; team: DraftAutoTeam; slot: number; brawlerId: string }
  | { kind: 'assignment'; brawlerId: string; playerId: string }
);

export type DraftAutoSnapshot = {
  mapId: string | null;
  allyStarts: boolean | null;
  allyBans: (string | null)[];
  enemyBans: (string | null)[];
  picks: (DraftAutoPick | null)[];
  playerAssignments: Record<string, string>;
  provenance: Record<string, DraftAutoSource>;
  processedEventIds: string[];
};
export type DraftAutoOutcome = {
  status: 'applied' | 'ignored' | 'review';
  reason: string;
  state: DraftAutoSnapshot;
};

export function emptyDraftAutoSnapshot(): DraftAutoSnapshot {
  return {
    mapId: null, allyStarts: null, allyBans: [null, null, null],
    enemyBans: [null, null, null], picks: Array(6).fill(null),
    playerAssignments: {}, provenance: {}, processedEventIds: []
  };
}

export function expectedPickingTeam(allyStarts: boolean, slot: number): DraftAutoTeam | null {
  if (!Number.isInteger(slot) || slot < 0 || slot > 5) return null;
  const order: DraftAutoTeam[] = allyStarts
    ? ['ally', 'enemy', 'enemy', 'ally', 'ally', 'enemy']
    : ['enemy', 'ally', 'ally', 'enemy', 'enemy', 'ally'];
  return order[slot];
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(value);
}
function validObservation(event: DraftAutoObservation): boolean {
  if (!isSafeId(event.eventId) ||
      !['manual', 'screen', 'provider'].includes(event.source) ||
      typeof event.confidence !== 'number' ||
      !Number.isFinite(event.confidence) ||
      event.confidence < 0 || event.confidence > 1) return false;
  switch (event.kind) {
    case 'map': return isSafeId(event.mapId);
    case 'first-pick': return typeof event.allyStarts === 'boolean';
    case 'ban': case 'pick':
      return (event.team === 'ally' || event.team === 'enemy') &&
        Number.isInteger(event.slot) && event.slot >= 0 &&
        event.slot < (event.kind === 'ban' ? 3 : 6) &&
        isSafeId(event.brawlerId);
    case 'assignment': return isSafeId(event.brawlerId) && isSafeId(event.playerId);
    default: return false;
  }
}
function eventFieldKey(event: DraftAutoObservation): string {
  switch (event.kind) {
    case 'map': return 'map';
    case 'first-pick': return 'first-pick';
    case 'ban': return `ban:${event.team}:${event.slot}`;
    case 'pick': return `pick:${event.slot}`;
    case 'assignment': return `player:${event.brawlerId}`;
  }
}
function readCurrent(state: DraftAutoSnapshot, event: DraftAutoObservation) {
  switch (event.kind) {
    case 'map': return state.mapId;
    case 'first-pick': return state.allyStarts;
    case 'ban': return (event.team === 'ally' ? state.allyBans : state.enemyBans)[event.slot];
    case 'pick': return state.picks[event.slot]?.brawlerId ?? null;
    case 'assignment': return state.playerAssignments[event.brawlerId] ?? null;
  }
}
function eventValue(event: DraftAutoObservation) {
  return event.kind === 'map' ? event.mapId
    : event.kind === 'first-pick' ? event.allyStarts
    : event.kind === 'assignment' ? event.playerId : event.brawlerId;
}
function result(status: DraftAutoOutcome['status'], reason: string, state: DraftAutoSnapshot): DraftAutoOutcome {
  return { status, reason, state };
}

/**
 * Never silently use a low-confidence screenshot or overwrite a manual choice.
 * A high-confidence authorized provider can correct a provisional manual entry.
 * Human review is required for contradictions or impossible draft combinations.
 * All event IDs are idempotent (an external durable inbox is still needed).
 */
export function applyDraftAutoObservation(
  state: DraftAutoSnapshot,
  event: DraftAutoObservation,
): DraftAutoOutcome {
  if (!validObservation(event)) return result('review', 'Evento inválido.', state);
  if (state.processedEventIds.includes(event.eventId)) {
    return result('ignored', 'Evento já processado.', state);
  }
  if (event.source === 'screen' && event.confidence < 0.9 ||
      event.source === 'provider' && event.confidence < 0.8) {
    return result('review', 'Confiança insuficiente para preenchimento automático.', state);
  }

  const field = eventFieldKey(event);
  const previousValue = readCurrent(state, event);
  const value = eventValue(event);
  const previousSource = state.provenance[field];

  if (previousValue === value) return result('ignored', 'Informação já registrada.', state);
  if (previousValue !== null &&
      previousSource === 'manual' && event.source !== 'manual' &&
      !(event.source === 'provider' && event.confidence >= 0.98)) {
    return result('review', 'Entrada manual diferente: confirmar antes de substituir.', state);
  }
  if (previousValue !== null && previousSource === 'provider' && event.source === 'screen') {
    return result('review', 'Captura contradiz evento confirmado pelo provedor.', state);
  }

  // Avoid treating an order inferred from a screenshot as a fact.
  if (event.kind === 'pick') {
    if (state.allyStarts === null) return result('review', 'A ordem do draft ainda não é conhecida.', state);
    if (expectedPickingTeam(state.allyStarts, event.slot) !== event.team) {
      return result('review', 'Pick incompatível com a ordem do draft.', state);
    }
    if ([...state.allyBans, ...state.enemyBans].includes(event.brawlerId)) {
      return result('review', 'Personagem já banido.', state);
    }
    if (state.picks.some((p, i) => i !== event.slot && p?.brawlerId === event.brawlerId)) {
      return result('review', 'Personagem já escolhido em outro slot.', state);
    }
  }
  if (event.kind === 'ban') {
    if (state.picks.some(p => p?.brawlerId === event.brawlerId)) {
      return result('review', 'Personagem já escolhido: ban conflitante.', state);
    }
    const ownBans = event.team === 'ally' ? state.allyBans : state.enemyBans;
    if (ownBans.some((b, i) => i !== event.slot && b === event.brawlerId)) {
      return result('review', 'Ban duplicado na mesma equipe.', state);
    }
  }
  if (event.kind === 'first-pick' && state.picks.some(Boolean) && previousValue !== event.allyStarts) {
    return result('review', 'Não inverter a ordem com picks já registrados.', state);
  }
  if (event.kind === 'assignment' &&
      !state.picks.some(p => p?.team === 'ally' && p.brawlerId === event.brawlerId)) {
    return result('review', 'Só associar jogador a um pick nosso já confirmado.', state);
  }

  const next: DraftAutoSnapshot = {
    ...state,
    allyBans: [...state.allyBans],
    enemyBans: [...state.enemyBans],
    picks: [...state.picks],
    playerAssignments: { ...state.playerAssignments },
    provenance: { ...state.provenance, [field]: event.source },
    processedEventIds: [...state.processedEventIds.slice(-255), event.eventId],
  };
  switch (event.kind) {
    case 'map': next.mapId = event.mapId; break;
    case 'first-pick': next.allyStarts = event.allyStarts; break;
    case 'ban': (event.team === 'ally' ? next.allyBans : next.enemyBans)[event.slot] = event.brawlerId; break;
    case 'pick': next.picks[event.slot] = { team: event.team, brawlerId: event.brawlerId }; break;
    case 'assignment': next.playerAssignments[event.brawlerId] = event.playerId; break;
  }
  return result('applied', 'Estado atualizado.', next);
}
