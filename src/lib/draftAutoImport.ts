import type { DraftState } from '../components/draft/DraftWizard';
import { expectedPickingTeam } from './draftAutoProtocol';
import type { DraftAutoRoomEvent } from '../services/draftAutoGuestService';

export type DraftAutoImportResult = {
  status: 'applied' | 'ignored' | 'review';
  message: string;
  draft: DraftState;
};

// Explicit coach confirmation only. Never write a match result, create training
// data or use a source/confidence value invented from a guest's manual event.
export function importDraftAutoEvent(draft: DraftState, event: DraftAutoRoomEvent): DraftAutoImportResult {
  const result = (status: DraftAutoImportResult['status'], message: string, next: DraftState = draft): DraftAutoImportResult =>
    ({ status, message, draft: next });
  const progressed = draft.picks.length > 0 || [...draft.allyBans, ...draft.enemyBans].some(Boolean);
  if (event.kind === 'map') {
    if (!event.map_id) return result('review', 'Evento sem mapa válido.');
    if (draft.mapId === event.map_id) return result('ignored', 'Mapa já selecionado.');
    if (progressed && draft.mapId) return result('review', 'Há picks ou bans registrados. Limpe o Draft antes de trocar de mapa.');
    return result('applied', 'Mapa aplicado.', { ...draft, mapId: event.map_id });
  }
  if (event.kind === 'first-pick') {
    if (typeof event.ally_starts !== 'boolean') return result('review', 'Ordem inicial inválida.');
    if (draft.allyStarts === event.ally_starts) return result('ignored', 'Ordem inicial já definida assim.');
    if (draft.picks.length > 0) return result('review', 'Não é possível mudar a ordem com picks já registrados.');
    return result('applied', 'Ordem inicial aplicada.', { ...draft, allyStarts: event.ally_starts });
  }
  if (event.kind !== 'pick' && event.kind !== 'ban') return result('review', 'Tipo de evento desconhecido.');
  const { team, slot, brawler_id: id } = event;
  if (!id || (team !== 'ally' && team !== 'enemy') || slot === null || !Number.isInteger(slot) || slot < 0 || slot >= (event.kind === 'ban' ? 3 : 6)) {
    return result('review', 'Equipe, personagem ou posição inválidos.');
  }
  if (!draft.mapId) return result('review', 'Selecione o mapa antes de importar bans ou picks.');

  if (event.kind === 'ban') {
    const field = team === 'ally' ? 'allyBans' : 'enemyBans';
    const own = draft[field];
    if (own[slot] === id) return result('ignored', 'Ban já registrado.');
    if (own[slot] !== null) return result('review', 'Este slot já tem um ban. Corrija manualmente no Draft.');
    if (own.includes(id)) return result('review', 'O mesmo brawler já foi banido por esta equipe.');
    if (draft.picks.some(p => p.brawlerId === id)) return result('review', 'Este brawler já foi escolhido no Draft.');
    if (draft.picks.length > 0) return result('review', 'Não é possível acrescentar bans depois que os picks começaram.');
    const updated = [...own]; updated[slot] = id;
    return result('applied', 'Ban aplicado.', { ...draft, [field]: updated });
  }
  const previous = draft.picks[slot];
  if (previous) {
    return previous.brawlerId === id && previous.team === team
      ? result('ignored', 'Pick já registrado.')
      : result('review', 'Este slot já tem um pick diferente. Corrija manualmente no Draft.');
  }
  if (slot !== draft.picks.length) return result('review', 'Aguarde os picks anteriores: a ordem deve ser sequencial.');
  if (expectedPickingTeam(draft.allyStarts, slot) !== team) return result('review', 'Pick não corresponde à equipe que escolhe nesta rodada.');
  if (draft.picks.some(p => p.brawlerId === id)) return result('review', 'Brawler já selecionado.');
  if ([...draft.allyBans, ...draft.enemyBans].includes(id)) return result('review', 'Brawler banido não pode ser escolhido.');
  return result('applied', 'Pick aplicado.', {
    ...draft, picks: [...draft.picks, { brawlerId: id, team }],
  });
}
