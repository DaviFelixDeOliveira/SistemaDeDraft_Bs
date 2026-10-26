import {describe,it,expect} from 'vitest';
import {
  portraitFingerprint,portraitSimilarity,matchDraftPortrait,
  type DraftPortraitReference,
} from '../lib/draftAutoPortraitIdentity';

function portrait(tone:'red'|'blue'|'gold'|'pale'|'jitter'='red'){
  const width=64,height=80,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    const foreground=(x>width*.42&&y>height*.36) || (x+y)%13<5;
    const rgb=tone==='red'?(foreground?[220,30,50]:[55,90,210]):
      tone==='blue'?(foreground?[40,150,228]:[5,20,95]):
      tone==='gold'?(foreground?[224,160,25]:[118,35,10]):
      tone==='pale'?(foreground?[215,45,55]:[65,99,215]):
      (foreground?[218,32,49]:[56,89,209]);
    data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=255;
  }
  return {width,height,data};
}

const label=(name:string,tone:'red'|'blue'|'gold'|'pale'):DraftPortraitReference=>({
  label:name,fingerprint:portraitFingerprint(portrait(tone))!,
});

describe('Correspondência por exemplos de aparência, com abstenção',()=>{
  it('extrai 8×8 células RGB somente do centro da carta',()=>{
    expect(portraitFingerprint(portrait())?.cells).toHaveLength(192);
    expect(portraitFingerprint({width:64,height:80,data:new Uint8ClampedArray(3)})).toBeNull();
  });
  it('duas cópias do mesmo personagem têm correspondência alta',()=>{
    const one=portraitFingerprint(portrait('red'))!;
    expect(portraitSimilarity(one,one)).toBe(1);
    expect(portraitSimilarity(one,portraitFingerprint(portrait('jitter'))!)).toBeGreaterThan(.99);
  });
  it('identifica somente referência muito próxima e bem separada',()=>{
    const result=matchDraftPortrait(portraitFingerprint(portrait('red'))!,[
      label('Personagem A','red'),label('Personagem B','blue'),label('Personagem C','gold'),
    ]);
    expect(result).toMatchObject({status:'similar-example',label:'Personagem A'});
    expect(result.margin).toBeGreaterThan(.08);
  });
  it('não inventa ID quando faltam dois exemplos diferentes',()=>{
    const result=matchDraftPortrait(portraitFingerprint(portrait('red'))!,[
      label('Personagem A','red'),label('Personagem A','red'),
    ]);
    expect(result.status).toBe('insufficient-references');
  });
  it('não atribui personagem se dois exemplos são parecidos demais',()=>{
    const result=matchDraftPortrait(portraitFingerprint(portrait('red'))!,[
      label('Personagem A','red'),label('Personagem B','pale'),
    ]);
    expect(result.status).toBe('uncertain');
    expect(result.label).toBeNull();
  });
  it('alvo sem semelhança suficiente é desconhecido',()=>{
    const result=matchDraftPortrait(portraitFingerprint(portrait('gold'))!,[
      label('Personagem A','red'),label('Personagem B','blue'),
    ]);
    expect(result.status).toBe('uncertain');
    expect(result.label).toBeNull();
  });
  it('recusa assinatura adulterada',()=>{
    const first=portraitFingerprint(portrait('red'))!;
    expect(portraitSimilarity(first,{cells:[1,2]})).toBeNull();
  });
});
