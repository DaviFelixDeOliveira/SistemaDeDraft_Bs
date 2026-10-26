import { describe, expect, it } from 'vitest';
import { interpretDraftSlotSignals } from '../lib/draftAutoSlotInterpretation';
import type { DraftSlotDifference } from '../lib/draftAutoSlotChange';
import type { DraftSlotTemporalEvidence } from '../lib/draftAutoSlotTemporal';
import type { GreenCheckTransition } from '../lib/draftAutoGreenCheck';

const diff = (changed = false): DraftSlotDifference => ({
  visualChangeCandidate: changed,
  changedFraction: changed ? 0.71 : 0.03,
  meanChannelDifference: changed ? 90 : 5,
});
const evidence = (
  hint: DraftSlotTemporalEvidence['hint'] = 'no-visual-change',
  markerBefore: DraftSlotTemporalEvidence['markerBefore'] = null,
  markerAfter: DraftSlotTemporalEvidence['markerAfter'] = null,
): DraftSlotTemporalEvidence => ({
  hint, markerBefore, markerAfter, portraitChanged: false, requiresReview: true,
});
const check = (
  status: GreenCheckTransition['status'] = 'no-new-check',
): GreenCheckTransition => ({ status, newGreenShare: 0 });

describe('Resumo simples dos sinais visuais (sem confirmar eventos)', () => {
  it('reconhece check novo com retrato igual como possível pick', () => {
    const result = interpretDraftSlotSignals(diff(), evidence(), check('possible-check-appeared'));
    expect(result.state).toBe('possible-pick');
    expect(result.requiresReview).toBe(true);
  });
  it('interpreta a mudança de 71% do terceiro slot sem afirmar pick removido', () => {
    const result = interpretDraftSlotSignals(diff(true), evidence('portrait-change-only'), check());
    expect(result.state).toBe('portrait-changed');
    expect(result.detail).toContain('Pode ser');
  });
  it('não inventa escolhas nos outros quatro slots', () => {
    expect(interpretDraftSlotSignals(diff(), evidence(), check()).state).toBe('no-new-signal');
  });
  it('diferencia possível marcador de ban de possível marcador de pick', () => {
    expect(interpretDraftSlotSignals(diff(), evidence('marker-appeared', null, 'ban'), check()).state)
      .toBe('possible-ban');
    expect(interpretDraftSlotSignals(diff(), evidence('marker-appeared', null, 'pick'), check()).state)
      .toBe('possible-pick');
  });
  it('não repete uma confirmação quando o marcador já estava presente', () => {
    expect(interpretDraftSlotSignals(diff(), evidence('no-visual-change', 'pick', 'pick'), check()).state)
      .toBe('no-new-signal');
  });
  it('exige revisão se os sinais de pick e ban se contradizem', () => {
    expect(interpretDraftSlotSignals(diff(), evidence('marker-appeared', null, 'ban'),
      check('possible-check-appeared')).state).toBe('review');
  });
  it('não transforma desaparecimento de marcador em pick removido confirmado', () => {
    expect(interpretDraftSlotSignals(diff(true), evidence('marker-disappeared', 'pick', null),
      check()).state).toBe('review');
  });
  it('sinaliza conflitos e dados indisponíveis', () => {
    expect(interpretDraftSlotSignals(diff(true),
      evidence('portrait-change-with-marker', 'pick', 'pick'), check()).state).toBe('review');
    expect(interpretDraftSlotSignals(diff(), evidence('unavailable'),
      check('unavailable')).state).toBe('unavailable');
  });
});
