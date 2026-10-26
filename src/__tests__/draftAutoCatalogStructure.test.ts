import { describe,it,expect } from 'vitest';
import {
  draftPortraitStructureSimilarity,rankDraftCatalogByStructure,
  diagnoseDraftStructureLabel,
} from '../lib/draftAutoCatalogStructure';
import { portraitSimilarity, type DraftPortraitFingerprint } from '../lib/draftAutoPortraitIdentity';
import type { DraftCatalogReference } from '../lib/draftAutoCatalogVisual';
const sample=(kind:'checker'|'columns'|'rows',shift=0):DraftPortraitFingerprint=>{
  const cells:number[]=[];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const bright=kind==='checker'?(x+y)%2===0:kind==='columns'?x%2===0:y%2===0;
    const gray=60+(bright?80:0)+shift;
    cells.push(gray,gray,gray);
  }
  return {cells};
};
const ref=(id:number,name:string,fp:DraftPortraitFingerprint):DraftCatalogReference=>({
  id,name,imageUrl:'https://cdn.brawlify.com/brawlers/borderless/'+id+'.png',
  fingerprint:fp,
});
describe('Ranking alternativo de estrutura: diagnosticar, não confirmar brawlers',()=>{
  it('não depende de brilho RGB absoluto para o mesmo padrão',()=>{
    const first=sample('checker'),other=sample('checker',30);
    expect(draftPortraitStructureSimilarity(first,other)).toBe(1);
    expect(portraitSimilarity(first,other)).toBeLessThan(.9);
  });
  it('distingue padrões espaciais sem converter isso em identificação',()=>{
    const same=sample('columns'),different=sample('rows');
    expect(draftPortraitStructureSimilarity(same,same)).toBe(1);
    expect(draftPortraitStructureSimilarity(same,different)).toBeLessThan(.8);
  });
  it('informa a posição da verdade humana sem escolher por ela',()=>{
    const refs=[
      ref(16000001,'B',sample('rows')),
      ref(16000002,'A',sample('checker')),
      ref(16000003,'C',sample('columns')),
    ];
    const ranked=rankDraftCatalogByStructure(sample('columns',15),refs);
    expect(ranked[0].name).toBe('C');
    const diagnostic=diagnoseDraftStructureLabel(sample('columns',15),refs,16000003);
    expect(diagnostic).toMatchObject({rank:1,total:3,bestName:'C'});
    expect(diagnostic?.topThree).toHaveLength(3);
  });
  it('não compara assinaturas malformadas ou referência ausente',()=>{
    expect(draftPortraitStructureSimilarity({cells:[]},sample('columns'))).toBeNull();
    expect(diagnoseDraftStructureLabel(sample('columns'),[
      ref(16000001,'B',sample('rows')),
    ],16000099)).toBeNull();
  });
});
