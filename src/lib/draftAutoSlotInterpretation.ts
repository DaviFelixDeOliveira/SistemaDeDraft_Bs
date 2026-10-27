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

  if (externalCheck.status === 'check-disappeared') {
    return describe('review', 'Check verde desapareceu — revisar',
      'O sinal anterior sumiu. Pode ser mudança de fase, captura desalinhada ou correção; não é um novo pick.');
  }
  if (externalCheck.status === 'ambiguous-check-change') {
    return describe('review', 'Check mudou de posição — revisar',
      'Já havia um check na primeira imagem. Uma mudança de posição não comprova outra escolha.');
  }
  if (possibleNewCheck && possibleNewBanMarker) {
    return describe('review', 'Sinais de pick e ban conflitantes',
      'Os marcadores visuais são ambíguos. Confira as duas capturas.');
  }
  if (possibleNewCheck) {
    return describe('possible-pick', 'Possível pick confirmado',
      'Surgiu um possível check verde externo ao cartão. Confira se é o símbolo do jogo; ainda não é uma confirmação.');
  }
  if (possibleNewBanMarker) {
    return describe('possible-ban', 'Possível ban confirmado',
      'Surgiu um possível símbolo vermelho de bloqueio. Confira no jogo antes de registrar.');
  }
  // Green portrait pixels, gadgets, or animations can make the weak internal
  // marker detector say "pick". Do not promote that evidence alone.
  if (possibleNewPickMarker) {
    return describe('review', 'Sinal verde no cartão — revisar',
      'O detector interno encontrou verde, mas não foi identificado um novo check externo confiável.');
  }
  if (difference.visualChangeCandidate) {
    return describe('portrait-changed', 'Retrato mudou — possível pré-seleção',
      'Pode ser troca ou remoção de pré-seleção, animação ou mudança de enquadramento. Não é pick confirmado.');
  }
  if (temporal.hint === 'unavailable' &&
      externalCheck.status === 'unavailable') {
    return describe('unavailable', 'Não foi possível analisar',
      'Confira o enquadramento e use duas imagens da mesma fase e orientação.');
  }
  return describe('no-new-signal', 'Sem mudança relevante',
    'Nenhuma alteração confiável foi encontrada neste slot. Isso não prova que não houve escolha.');
}
