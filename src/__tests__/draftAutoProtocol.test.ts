import { describe, expect, it } from 'vitest';
import { applyDraftAutoObservation, emptyDraftAutoSnapshot, expectedPickingTeam, type DraftAutoObservation } from '../lib/draftAutoProtocol';

const mk = (overrides: Partial<DraftAutoObservation> = {}): DraftAutoObservation => ({
  eventId: 'event-1', kind: 'map', mapId: 'map-1', source: 'screen', confidence: 0.96,
  ...overrides
} as DraftAutoObservation);
const apply = (state: ReturnType<typeof emptyDraftAutoSnapshot>, event: DraftAutoObservation) =>
  applyDraftAutoObservation(state, event);

describe('Draft Automático - protocolo seguro de eventos', () => {
  it('reconhece a ordem snake de picks para ambos os lados', () => {
    expect(Array.from({ length: 6 }, (_, i) => expectedPickingTeam(true, i)))
      .toEqual(['ally', 'enemy', 'enemy', 'ally', 'ally', 'enemy']);
    expect(Array.from({ length: 6 }, (_, i) => expectedPickingTeam(false, i)))
      .toEqual(['enemy', 'ally', 'ally', 'enemy', 'enemy', 'ally']);
  });

  it('não inventa mapa a partir de captura incerta', () => {
    const initial = emptyDraftAutoSnapshot();
    const observed = apply(initial, mk({ confidence: 0.61 }));
    expect(observed.status).toBe('review');
    expect(observed.state).toBe(initial);
  });

  it('atualiza mapa confirmado sem modificar a entrada original', () => {
    const original = emptyDraftAutoSnapshot();
    const observed = apply(original, mk());
    expect(observed.status).toBe('applied');
    expect(observed.state.mapId).toBe('map-1');
    expect(original.mapId).toBeNull();
  });

  it('ignora retransmissões do mesmo evento', () => {
    const first = apply(emptyDraftAutoSnapshot(), mk());
    const second = apply(first.state, mk());
    expect(second.status).toBe('ignored');
    expect(second.state).toBe(first.state);
  });

  it('reconhece os dois lados dos bans e impede repetição no mesmo time', () => {
    const initial = emptyDraftAutoSnapshot();
    const one = apply(initial, mk({ kind: 'ban', team: 'ally', slot: 0, brawlerId: 'griff' }));
    expect(one.state.allyBans[0]).toBe('griff');
    const duplicate = apply(one.state, mk({ eventId: 'event-2', kind: 'ban', team: 'ally', slot: 1, brawlerId: 'griff' }));
    expect(duplicate.status).toBe('review');
    const enemySame = apply(one.state, mk({ eventId: 'event-3', kind: 'ban', team: 'enemy', slot: 0, brawlerId: 'griff' }));
    expect(enemySame.status).toBe('applied');
  });

  it('um pick não pode existir enquanto a ordem é desconhecida', () => {
    const observation = mk({ kind: 'pick', team: 'ally', slot: 0, brawlerId: 'griff' });
    expect(apply(emptyDraftAutoSnapshot(), observation).status).toBe('review');
  });

  it('não aceita personagem banido nem time diferente da ordem', () => {
    const start = apply(emptyDraftAutoSnapshot(), mk({ kind: 'first-pick', allyStarts: true })).state;
    const banned = apply(start, mk({ eventId: 'b1', kind: 'ban', team: 'ally', slot: 0, brawlerId: 'griff' })).state;
    expect(apply(banned, mk({ eventId: 'p1', kind: 'pick', slot: 0, team: 'ally', brawlerId: 'griff' })).status).toBe('review');
    expect(apply(banned, mk({ eventId: 'p2', kind: 'pick', slot: 0, team: 'enemy', brawlerId: 'rosa' })).status).toBe('review');
    expect(apply(banned, mk({ eventId: 'p3', kind: 'pick', slot: 0, team: 'ally', brawlerId: 'rosa' })).status).toBe('applied');
  });

  it('captura divergente não substitui silenciosamente correção do coach', () => {
    const manual = apply(emptyDraftAutoSnapshot(), mk({ kind: 'map', source: 'manual', mapId: 'anel' })).state;
    const screenshot = apply(manual, mk({ eventId: 'event-2', mapId: 'deserto' }));
    expect(screenshot.status).toBe('review');
    expect(screenshot.state.mapId).toBe('anel');
  });

  it('provedor oficial confirmado pode corrigir um preenchimento manual anterior', () => {
    const manual = apply(emptyDraftAutoSnapshot(), mk({ source: 'manual', mapId: 'anel' })).state;
    const provider = apply(manual, mk({ eventId: 'event-2', source: 'provider', confidence: 0.99, mapId: 'deserto' }));
    expect(provider.status).toBe('applied');
    expect(provider.state.mapId).toBe('deserto');
  });

  it('ignora atribuição de jogador sem pick nosso confirmado', () => {
    expect(apply(emptyDraftAutoSnapshot(), mk({ kind: 'assignment', brawlerId: 'griff', playerId: 'player-1' })).status).toBe('review');
  });

  it('atribui jogador quando pick nosso existe', () => {
    const first = apply(emptyDraftAutoSnapshot(), mk({ kind: 'first-pick', allyStarts: true })).state;
    const picked = apply(first, mk({ kind: 'pick', eventId: 'event-2', slot: 0, team: 'ally', brawlerId: 'griff' })).state;
    const assigned = apply(picked, mk({ kind: 'assignment', eventId: 'event-3', brawlerId: 'griff', playerId: 'player-1' }));
    expect(assigned.status).toBe('applied');
    expect(assigned.state.playerAssignments.griff).toBe('player-1');
  });

  it('não admite IDs malformados ou posições impossíveis', () => {
    expect(apply(emptyDraftAutoSnapshot(), mk({ mapId: '' })).status).toBe('review');
    expect(apply(emptyDraftAutoSnapshot(), mk({ kind: 'ban', team: 'ally', slot: 5, brawlerId: 'rosa' })).status).toBe('review');
  });
});
