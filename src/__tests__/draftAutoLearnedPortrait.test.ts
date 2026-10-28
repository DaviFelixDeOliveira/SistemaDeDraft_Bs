import {describe,expect,it} from 'vitest';
import {
  addDraftLearnedPortrait,matchDraftLearnedPortrait,parseDraftLearnedPortraits,
} from '../lib/draftAutoLearnedPortrait';
import type {DraftPortraitFingerprint} from '../lib/draftAutoPortraitIdentity';

const face=(tone:'red'|'blue'|'dark'):DraftPortraitFingerprint=>{
  const cells:number[]=[];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const bright=(x+y)%3===0;
    const rgb=tone==='red'?(bright?[240,70,40]:[130,20,55]):
      tone==='blue'?(bright?[25,170,230]:[40,50,140]):
      (bright?[70,75,85]:[20,15,30]);
    cells.push(...rgb);
  }
  return {cells};
};
const entry=(id:number,name:string,tone:'red'|'blue'|'dark')=>({
  brawlerId:id,name,fingerprint:face(tone),
});

describe('Exemplos de retratos reais (apenas no navegador)',()=>{
  it('rejeita referências inválidas e limita conteúdo armazenado',()=>{
    expect(parseDraftLearnedPortraits('não é lista')).toEqual([]);
    expect(parseDraftLearnedPortraits([
      {brawlerId:1,name:'falso',fingerprint:face('red')},
      entry(16000001,'Um','red'),
      {brawlerId:16000002,name:'Outro',fingerprint:{cells:[12]}},
    ])).toHaveLength(1);
  });
  it('evita duplicar o mesmo print e limita a seis exemplos por brawler',()=>{
    const first=entry(16000001,'Vermelho','red');
    expect(addDraftLearnedPortrait([first],first)).toHaveLength(1);
    let refs=[first];
    for(let i=0;i<8;i++){
      const sample=entry(16000001,'Vermelho','red');
      sample.fingerprint.cells[i]=i+1;
      refs=addDraftLearnedPortrait(refs,sample);
    }
    expect(refs).toHaveLength(6);
    expect(refs.every(item=>item.brawlerId===16000001)).toBe(true);
  });
  it('exige dois nomes diferentes e não promete identificação com um exemplo',()=>{
    const target=face('red');
    expect(matchDraftLearnedPortrait(target,[
      entry(16000001,'Vermelho','red'),
    ])).toMatchObject({status:'unknown',name:null});
  });
  it('encontra retrato idêntico do jogo quando existe outro nome distinto',()=>{
    const result=matchDraftLearnedPortrait(face('red'),[
      entry(16000001,'Vermelho','red'),
      entry(16000002,'Azul','blue'),
      entry(16000003,'Escuro','dark'),
    ]);
    expect(result).toMatchObject({status:'possible',name:'Vermelho',similarity:1});
  });
  it('não escolhe quando dois nomes receberam a mesma aparência',()=>{
    const result=matchDraftLearnedPortrait(face('red'),[
      entry(16000001,'Vermelho','red'),
      entry(16000002,'Azul','red'),
    ]);
    expect(result).toMatchObject({status:'unknown',name:null,margin:0});
  });
  it('rejeita alvo inválido, sem inventar nomes',()=>{
    expect(matchDraftLearnedPortrait({cells:[]},[
      entry(16000001,'Vermelho','red'),
      entry(16000002,'Azul','blue'),
    ])).toMatchObject({status:'unknown',name:null});
  });
});
