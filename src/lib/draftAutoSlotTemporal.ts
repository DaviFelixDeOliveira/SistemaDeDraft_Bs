import type { SlotMarkerEvidence, SlotMarkerKind } from './draftAutoVisualEvidence';
import type { DraftSlotDifference } from './draftAutoSlotChange';

/**
 * Describes independent VISUAL clues from consecutive screenshots of the
 * same physical slot. It never asserts that a game pick/ban occurred.
 * The caller must check session, scene, player, team, brawler and slot.
 */
export type DraftSlotTemporalHint =
  | 'no-visual-change'
  | 'portrait-change-only'
  | 'marker-appeared'
  | 'marker-disappeared'
  | 'marker-type-conflict'
  | 'portrait-change-with-marker'
  | 'unavailable';

export type DraftSlotTemporalEvidence = {
  hint: DraftSlotTemporalHint;
  markerBefore: SlotMarkerKind | null;
  markerAfter: SlotMarkerKind | null;
  portraitChanged: boolean;
  requiresReview: true;
};

export function describeDraftSlotTemporalEvidence(
  difference: DraftSlotDifference | null,
  before: SlotMarkerEvidence | null,
  after: SlotMarkerEvidence | null,
): DraftSlotTemporalEvidence {
  const beforeMarker=before?.status==='candidate' ? before.marker : null;
  const afterMarker=after?.status==='candidate' ? after.marker : null;
  const portraitChanged=difference?.visualChangeCandidate===true;
  const result=(hint:DraftSlotTemporalHint):DraftSlotTemporalEvidence=>({
    hint,markerBefore:beforeMarker,markerAfter:afterMarker,
    portraitChanged,requiresReview:true,
  });

  if(!difference||!before||!after)return result('unavailable');
  if(beforeMarker&&afterMarker&&beforeMarker!==afterMarker)return result('marker-type-conflict');
  if(beforeMarker&&!afterMarker)return result('marker-disappeared');
  if(!beforeMarker&&afterMarker)return result('marker-appeared');
  if(portraitChanged&&afterMarker)return result('portrait-change-with-marker');
  if(portraitChanged)return result('portrait-change-only');
  return result('no-visual-change');
}

/** A short, user-facing, non-authoritative interpretation. */
export function draftTemporalHintLabel(evidence:DraftSlotTemporalEvidence):string {
  switch(evidence.hint){
    case 'marker-appeared':
      return evidence.markerAfter==='pick'
        ? 'Possível check de pick apareceu — verificar confirmação'
        : 'Possível ícone de ban apareceu — verificar confirmação';
    case 'marker-disappeared': return 'Ícone anterior desapareceu — verificar se mudou de fase ou houve correção';
    case 'marker-type-conflict': return 'Marcadores conflitantes — revisão necessária';
    case 'portrait-change-with-marker': return 'Retrato mudou com marcador visível — verificar imagem';
    case 'portrait-change-only': return 'Retrato mudou, sem novo sinal de confirmação';
    case 'no-visual-change': return 'Sem alteração visual relevante';
    case 'unavailable': return 'Não foi possível avaliar o estado do marcador';
  }
}
