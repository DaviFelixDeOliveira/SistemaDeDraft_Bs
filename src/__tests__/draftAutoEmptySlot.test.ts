import {describe,it,expect} from 'vitest';
import {inspectDraftEmptySlot} from '../lib/draftAutoEmptySlot';

function makeFrame(palette:'empty'|'full'|'solid'|'dark-character'){
  const width=64,height=80;
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const at=(y*width+x)*4;
    let color:[number,number,number]=[50,40,70];
    if(palette==='empty'){
      // Low-contrast purple question-mark-like figure occupies part of face.
      color=(x>=24&&x<38&&y>=27&&y<50)?[82,70,112]:[44,38,67];
    }
    if(palette==='solid')color=[50,40,70];
    if(palette==='full')color=x<32?[222,147,100]:[118,193,225];
    if(palette==='dark-character'){
      // A dark portrait with distinct colorful eye/clothing sections.
      color=(x<32&&y<47)?[35,39,65]:[145,72,170];
    }
    data[at]=color[0];data[at+1]=color[1];data[at+2]=color[2];data[at+3]=255;
  }
  return {width,height,data};
}
describe('Guarda conservadora de slot vazio',()=>{
  it('sinaliza silhueta roxa com variação interna do ponto de interrogação',()=>{
    const result=inspectDraftEmptySlot(makeFrame('empty'));
    expect(result.status).toBe('likely-empty');
  });
  it('não confunde retratos coloridos e personagens escuros com slot vazio',()=>{
    expect(inspectDraftEmptySlot(makeFrame('full')).status).toBe('unknown');
    expect(inspectDraftEmptySlot(makeFrame('dark-character')).status).toBe('unknown');
  });
  it('uma região roxa uniforme não basta para afirmar que o slot está vazio',()=>{
    expect(inspectDraftEmptySlot(makeFrame('solid')).status).toBe('unknown');
  });
  it('ignora dados incompletos e dimensões impossíveis',()=>{
    expect(inspectDraftEmptySlot({width:64,height:80,data:new Uint8ClampedArray(2)}).status).toBe('unknown');
    expect(inspectDraftEmptySlot({width:20,height:80,data:new Uint8ClampedArray(20*80*4)}).status).toBe('unknown');
  });
});
