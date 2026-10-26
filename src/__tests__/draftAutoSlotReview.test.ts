import { describe, expect, it } from 'vitest';
import { reviewDraftAutoSlot } from '../lib/draftAutoSlotReview';
import type { DraftSlotInterpretation } from '../lib/draftAutoSlotInterpretation';

const evidence=(state:DraftSlotInterpretation['state'],label:string):DraftSlotInterpretation=>({
  state,label,detail:'sinal experimental',requiresReview:true,
});

describe('Combinação segura dos estados visuais com palpites de brawler',()=>{
  it('não transforma check e retrato parecido em escolha definitiva',()=>{
    const result=reviewDraftAutoSlot(
      evidence('possible-pick','Possível pick confirmado'),
      {status:'possible',name:'Meg'});
    expect(result).toEqual({
      stateLabel:'Possível pick confirmado',
      brawlerLabel:'Brawler: talvez Meg (não confirmado)',
      requiresReview:true,conflict:false,
    });
  });
  it('mantém mudança de pré-seleção sem confirmação',()=>{
    const result=reviewDraftAutoSlot(
      evidence('portrait-changed','Retrato mudou'),
      {status:'possible',name:'Meg'});
    expect(result.stateLabel).toBe('Retrato mudou');
    expect(result.requiresReview).toBe(true);
  });
  it('sinaliza conflito quando há possível check mas o slot parece vazio',()=>{
    const result=reviewDraftAutoSlot(
      evidence('possible-pick','Possível pick confirmado'),
      {status:'empty'});
    expect(result.conflict).toBe(true);
    expect(result.stateLabel).toContain('contraditórios');
  });
  it('não inventa identidade se catálogo está indisponível',()=>{
    expect(reviewDraftAutoSlot(evidence('no-new-signal','Sem mudança relevante'),null)
      .brawlerLabel).toBe('Brawler: não analisado');
  });
});