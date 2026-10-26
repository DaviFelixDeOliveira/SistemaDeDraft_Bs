import type { DraftSlotDifference } from './draftAutoSlotChange';
import type { DraftSlotTemporalEvidence } from './draftAutoSlotTemporal';
import type { GreenCheckTransition } from './draftAutoGreenCheck';

/**
 * Plain-language summary of local visual evidence. These are ONLY hypotheses:
 * a screenshot pair cannot establish the player's intent, pick turn, brawler
 * identity or a validated in-game selection.
 */
export type DraftSlotInterpretation = {
  state: 'possible-pick' | 'possible-ban' | 'portrait-changed' | 'no-new-signal' | 'review' | 'unavailable';
  label: string;
  detail: string;
  /** Deliberately never authorizes changing a draft or sending an event. */
  requiresReview: true;
};

export function interpretDraftSlotSignals(
  difference: DraftSlotDifference,
  temporal: DraftSlotTemporalEvidence,
  externalCheck: GreenCheckTransition,
): DraftSlotInterpretation {
  const describe = (
    state: DraftSlotInterpretation['state'],
    label: string,
    detail: string,
  ): DraftSlotInterpretation => ({ state, label, detail, requiresReview: true });

  if (temporal.hint === 'marker-type-conflict' ||
      temporal.hint === 'portrait-change-with-marker') {
    return describe('review', 'Sinais conflitantes — revisar',
      'O retrato e os marcadores não permitem distinguir uma escolha de uma mudança de tela.');
  }
  if (temporal.hint === 'marker-disappeared') {
    return describe('review', 'Marcador desapareceu — revisar',
      'Pode ser transição de fase, correção ou desalinhamento entre capturas.');
  }

  const possibleNewPickMarker = temporal.markerAfter === 'pick' &&
    temporal.markerBefore !== 'pick';
  const possibleNewBanMarker = temporal.markerAfter === 'ban' &&
    temporal.markerBefore !== 'ban';
  const possibleNewCheck = externalCheck.status === 'possible-check-appeared';

  if (possibleNewCheck && possibleNewBanMarker) {
    return describe('review', 'Sinais de pick e ban conflitantes',
      'Os marcadores visuais são ambíguos. Confira as duas capturas.');
  }
  if (possibleNewCheck || possibleNewPickMarker) {
    return describe('possible-pick', 'Possível pick confirmado',
      'Surgiu um possível check ou marcador de pick. Não confirma qual brawler foi escolhido.');
  }
  if (possibleNewBanMarker) {
    return describe('possible-ban', 'Possível ban confirmado',
      'Surgiu um possível marcador de bloqueio. Não confirma qual brawler foi banido.');
  }
  if (difference.visualChangeCandidate) {
    return describe('portrait-changed', 'Retrato mudou',
      'Pode ser troca ou remoção de pré-seleção, animação ou mudança de enquadramento. Não é confirmação.');
  }
  if (temporal.hint === 'unavailable' &&
      externalCheck.status === 'unavailable') {
    return describe('unavailable', 'Não foi possível analisar',
      'Confira o enquadramento e use duas imagens da mesma fase e orientação.');
  }
  return describe('no-new-signal', 'Sem mudança relevante',
    'Nenhuma alteração confiável foi encontrada neste slot. Isso não prova que não houve escolha.');
}
