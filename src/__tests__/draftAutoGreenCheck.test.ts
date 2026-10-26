import {describe,it,expect} from 'vitest';
import {
  greenCheckSearchRect,inspectGreenCheckTransition,
} from '../lib/draftAutoGreenCheck';
import type {SlotPixelFrame} from '../lib/draftAutoVisualEvidence';
import type {DraftHudRegion} from '../lib/draftAutoLayout';

const width=120,height=96;
const frame=(kind:'none'|'check'|'block'|'dots',shiftX=0):SlotPixelFrame=>{
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    const checkStroke=
      (x-shiftX>=66&&x-shiftX<=90&&y>=39&&y<=72&&
      (Math.abs(y-((x-shiftX)-25))<=4 || Math.abs(y-(117-(x-shiftX)))<=4));
    const block=(x>=63&&x<95&&y>=41&&y<73);
    const dots=(x+y)%19===0;
    const green=kind==='check'?checkStroke:kind==='block'?block:kind==='dots'?dots:false;
    const rgb=green?[42,218,37]:[35,66,128];
    data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=255;
  }
  return {width,height,data};
};

const card:DraftHudRegion={
 id:'blue-1',label:'Azul 1',kind:'pick-slot',side:'blue',physicalSlot:0,
 x:.20,y:.70,width:.09,height:.20,
};

describe('Check verde no lado externo do cartão (diagnóstico)',()=>{
  it('inclui pixels à direita da carta, onde o check aparece no jogo',()=>{
    const roi=greenCheckSearchRect(card,1920,1080);
    expect(roi).not.toBeNull();
    expect(roi!.x).toBeGreaterThan((card.x+card.width*.75)*1920);
    expect(roi!.x+roi!.width).toBeGreaterThan((card.x+card.width)*1920);
  });
  it('identifica possível surgimento de check quando o retrato fica igual',()=>{
    expect(inspectGreenCheckTransition(frame('none'),frame('check')).status)
      .toBe('possible-check-appeared');
  });
  it('não inventa confirmação se o check já estava presente',()=>{
    expect(inspectGreenCheckTransition(frame('check'),frame('check')).status)
      .toBe('no-new-check');
  });
  it('não confunde check antigo deslocado dez pixels com confirmação nova',()=>{
    // With pixel-only novelty this falsely exceeded 75% new green pixels.
    // It is still the same marker on the same player's card.
    expect(inspectGreenCheckTransition(frame('check'),frame('check',10)).status)
      .toBe('no-new-check');
  });
  it('não confunde check antigo deslocado vinte pixels com confirmação nova',()=>{
    expect(inspectGreenCheckTransition(frame('check'),frame('check',20)).status)
      .toBe('no-new-check');
  });
  it('uma mancha verde sólida não é um check',()=>{
    expect(inspectGreenCheckTransition(frame('none'),frame('block')).status)
      .toBe('no-new-check');
  });
  it('pontos verdes isolados não bastam',()=>{
    expect(inspectGreenCheckTransition(frame('none'),frame('dots')).status)
      .toBe('no-new-check');
  });
  it('não gera indicação quando o check desaparece (cancelamento ou correção)',()=>{
    expect(inspectGreenCheckTransition(frame('check'),frame('none')).status)
      .toBe('no-new-check');
  });
  it('recusa dados inconsistentes sem disparar evento',()=>{
    expect(inspectGreenCheckTransition(frame('none'),{width:120,height:96,data:new Uint8ClampedArray(12)}).status)
      .toBe('unavailable');
    expect(greenCheckSearchRect({...card,kind:'ban-area'},1920,1080)).toBeNull();
  });
});
