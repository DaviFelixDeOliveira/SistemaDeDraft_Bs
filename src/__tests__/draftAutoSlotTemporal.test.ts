import {describe,it,expect} from 'vitest';
import {describeDraftSlotTemporalEvidence,draftTemporalHintLabel} from '../lib/draftAutoSlotTemporal';
import type { SlotMarkerEvidence } from '../lib/draftAutoVisualEvidence';
import type { DraftSlotDifference } from '../lib/draftAutoSlotChange';

const unknown:SlotMarkerEvidence={status:'unknown',reason:'sem marcador',redShare:0,greenShare:0};
const pick:SlotMarkerEvidence={status:'candidate',marker:'pick',redShare:0,greenShare:.1};
const ban:SlotMarkerEvidence={status:'candidate',marker:'ban',redShare:.1,greenShare:0};
const diff=(changed:boolean):DraftSlotDifference=>({
  visualChangeCandidate:changed,
  changedFraction:changed ? 0.59 : 0,
  meanChannelDifference:changed?95:0,
});

describe('Evidências temporais, sem afirmar pick ou ban automático',()=>{
  it('destaca imagem de slot alterada sem atribuir confirmação',()=>{
    const result=describeDraftSlotTemporalEvidence(diff(true),unknown,unknown);
    expect(result).toMatchObject({hint:'portrait-change-only',portraitChanged:true,requiresReview:true});
    expect(draftTemporalHintLabel(result)).toContain('sem novo sinal de confirmação');
  });
  it('check surgiu mesmo sem mudança no retrato: possível confirmação a revisar',()=>{
    const result=describeDraftSlotTemporalEvidence(diff(false),unknown,pick);
    expect(result).toMatchObject({hint:'marker-appeared',markerAfter:'pick',portraitChanged:false,requiresReview:true});
    expect(draftTemporalHintLabel(result)).toContain('Possível check');
  });
  it('ícone de ban novo continua sendo apenas hipótese',()=>{
    const result=describeDraftSlotTemporalEvidence(diff(false),unknown,ban);
    expect(result.hint).toBe('marker-appeared');
    expect(result.requiresReview).toBe(true);
  });
  it('um indicador desaparecido não deve virar um novo pick',()=>{
    expect(describeDraftSlotTemporalEvidence(diff(true),pick,unknown).hint).toBe('marker-disappeared');
  });
  it('troca de tipos de ícones exige revisão',()=>{
    expect(describeDraftSlotTemporalEvidence(diff(true),ban,pick).hint).toBe('marker-type-conflict');
  });
  it('mesmo marcador e personagem diferente indica conflito de imagem',()=>{
    expect(describeDraftSlotTemporalEvidence(diff(true),pick,pick).hint).toBe('portrait-change-with-marker');
  });
  it('capturas idênticas não inventam uma seleção',()=>{
    expect(describeDraftSlotTemporalEvidence(diff(false),pick,pick).hint).toBe('no-visual-change');
  });
  it('dados incompletos ficam indisponíveis',()=>{
    expect(describeDraftSlotTemporalEvidence(null,pick,pick).hint).toBe('unavailable');
    expect(describeDraftSlotTemporalEvidence(diff(true),null,unknown).hint).toBe('unavailable');
  });
});
