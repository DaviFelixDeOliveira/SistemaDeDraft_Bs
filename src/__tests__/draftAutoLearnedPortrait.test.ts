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
      // Change enough pixels to represent different real appearances,
      // rather than tiny variations in a near-identical capture.
      for(let j=0;j<24;j++)sample.fingerprint.cells[j]=20+i*20;
      refs=addDraftLearnedPortrait(refs,sample);
    }
    expect(refs).toHaveLength(6);
    expect(refs.every(item=>item.brawlerId===16000001)).toBe(true);
  });
  it('não ocupa a biblioteca com capturas quase idênticas do retrato padrão',()=>{
    const original=entry(16000001,'Colt','red');
    const nearCopy=entry(16000001,'Colt','red');
    for(let i=0;i<18;i++)nearCopy.fingerprint.cells[i]=
      Math.max(0,nearCopy.fingerprint.cells[i]-1);
    const refs=addDraftLearnedPortrait([original],nearCopy);
    expect(refs).toHaveLength(1);
    expect(refs[0].fingerprint).toEqual(original.fingerprint);
  });
  it('preserva retrato alternativo do Colt sob o mesmo ID, sem inventar um novo brawler',()=>{
    const standard=entry(16000002,'Colt','red');
    const alternate=entry(16000002,'Colt','blue');
    const shelly=entry(16000001,'Shelly','dark');
    const refs=addDraftLearnedPortrait(
      addDraftLearnedPortrait([standard,shelly],alternate),
      entry(16000002,'Colt','blue'),
    );
    expect(refs.filter(ref=>ref.brawlerId===16000002)).toHaveLength(2);
    expect(new Set(refs.map(ref=>ref.brawlerId)).size).toBe(2);
    expect(matchDraftLearnedPortrait(face('red'),refs))
      .toMatchObject({status:'seen-example',name:'Colt',brawlerId:16000002});
    expect(matchDraftLearnedPortrait(face('blue'),refs))
      .toMatchObject({status:'seen-example',name:'Colt',brawlerId:16000002});
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
    expect(result).toMatchObject({status:'seen-example',name:'Vermelho',similarity:1});
  });
  it('permite hipótese em nova imagem parecida, mas não idêntica',()=>{
    const target=face('red');
    // Adjust several cells enough to differ after 3-decimal similarity rounding.
    for(let i=0;i<24;i++)target.cells[i]=Math.max(0,target.cells[i]-9);
    const result=matchDraftLearnedPortrait(target,[
      entry(16000001,'Vermelho','red'),
      entry(16000002,'Azul','blue'),
    ]);
    expect(result).toMatchObject({status:'possible',name:'Vermelho'});
    expect(result.similarity).toBeLessThan(1);
  });
    it('não escolhe quando dois nomes receberam a mesma aparência',()=>{
    const result=matchDraftLearnedPortrait(face('red'),[
      entry(16000001,'Vermelho','red'),
      entry(16000002,'Azul','red'),
    ]);
    expect(result).toMatchObject({status:'unknown',name:null,margin:0});
  });
  it('mostra candidato mais próximo apenas como diagnóstico quando os limiares falham',()=>{
    const target=face('red');
    for(let i=0;i<24;i++)target.cells[i]=0;
    const result=matchDraftLearnedPortrait(target,[
      entry(16000001,'Vermelho','red'),
      entry(16000002,'Azul','blue'),
    ]);
    expect(result).toMatchObject({status:'unknown',name:null,brawlerId:null,
      closestName:'Vermelho'});
    expect(result.similarity).toBeLessThan(.96);
    expect(result.similarity).toBeGreaterThan(0);
  });
  it('não divulga nome diagnosticado se falta comparação mínima entre rótulos',()=>{
    const result=matchDraftLearnedPortrait(face('red'),[
      entry(16000001,'Vermelho','red'),
    ]);
    expect(result).toMatchObject({status:'unknown',closestName:null});
  });
  it('rejeita alvo inválido, sem inventar nomes',()=>{
    expect(matchDraftLearnedPortrait({cells:[]},[
      entry(16000001,'Vermelho','red'),
      entry(16000002,'Azul','blue'),
    ])).toMatchObject({status:'unknown',name:null});
  });
});
