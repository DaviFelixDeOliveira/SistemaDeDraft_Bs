import {describe,it,expect} from 'vitest';
import {rankDraftCatalogCombined,diagnoseDraftCombinedLabel} from '../lib/draftAutoCatalogCombined';
import type {DraftPortraitFingerprint} from '../lib/draftAutoPortraitIdentity';
import type {DraftCatalogReference} from '../lib/draftAutoCatalogVisual';
const solid=(value:number):DraftPortraitFingerprint=>({cells:new Array(192).fill(value)});
const ref=(id:number,name:string,value:number):DraftCatalogReference=>({
  id,name,imageUrl:'https://cdn.brawlify.com/brawlers/borderless/'+id+'.png',
  fingerprint:solid(value),
});
describe('Ranking híbrido diagnóstico: não confirma picks',()=>{
  it('combina comparadores e ordena as referências sem duplicatas',()=>{
    const ranked=rankDraftCatalogCombined(solid(140),[
      ref(1,'Longe',20),ref(2,'Mesmo',140),ref(3,'Outro',120),
    ]);
    expect(ranked.map(x=>x.name)).toEqual(['Mesmo','Outro','Longe']);
    expect(ranked[0].score).toBe(1);
  });
  it('relata ranking de anotação humana como diagnóstico, sem probabilidade',()=>{
    const refs=[ref(1,'Primeiro',140),ref(2,'Correto',130),ref(3,'Terceiro',100)];
    const result=diagnoseDraftCombinedLabel(solid(140),refs,2);
    expect(result).toMatchObject({rank:2,total:3,bestName:'Primeiro'});
    expect(result?.topThree).toHaveLength(3);
  });
  it('recusa referência ausente ou fingerprints inválidos',()=>{
    const refs=[ref(1,'Um',140),{...ref(2,'Invalido',80),fingerprint:{cells:[]}}];
    expect(rankDraftCatalogCombined(solid(140),refs)).toHaveLength(1);
    expect(diagnoseDraftCombinedLabel(solid(140),refs,2)).toBeNull();
  });
});
