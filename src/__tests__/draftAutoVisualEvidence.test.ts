import { describe, expect, it } from 'vitest';
import { hasVerifiedVisualDecision, inspectSlotMarker, type SlotPixelFrame } from '../lib/draftAutoVisualEvidence';
const frame = (mark: 'none'|'ban'|'pick'|'mixed'|'top-only'|'red-portrait'): SlotPixelFrame => {
  const width=150,height=180,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const idx=(y*width+x)*4;
    const inMarker=x>=width*.76&&x<width*.96&&y>=height*.47&&y<height*.69;
    const inTop=x>=width*.76&&y>=height*.06&&y<height*.22;
    const radius=Math.hypot(x-width*.84,y-height*.78);
    const ring=radius>=12&&radius<=18;
    const slash=radius<=18&&Math.abs((x-width*.84)+(y-height*.78))<=2.6;
    const redCircle=(mark==='ban'||mark==='mixed')&&(ring||slash);
    const redPortrait=mark==='red-portrait'&&
      x>=width*.18&&x<=width*.85&&y>=height*.39&&y<=height*.84;
    const redTop=inTop&&mark==='top-only';
    const greenRectangle=inMarker&&(mark==='pick'||mark==='mixed');
    const rgb=redCircle||redTop||redPortrait?[240,33,29]:greenRectangle?[38,220,37]:[45,49,62];
    data[idx]=rgb[0];data[idx+1]=rgb[1];data[idx+2]=rgb[2];data[idx+3]=255;
  }
  return {width,height,data};
};

describe('Marcadores visuais de slots individuais (sem alegar brawler reconhecido)',()=>{
  it('separa indício de ban confirmado por ícone vermelho',()=>{
    expect(inspectSlotMarker(frame('ban'))).toMatchObject({status:'candidate',marker:'ban'});
  });
  it('separa indício de pick confirmado por ícone verde',()=>{
    expect(inspectSlotMarker(frame('pick'))).toMatchObject({status:'candidate',marker:'pick'});
  });
  it('não confunde manchas vermelhas do retrato com símbolo de ban',()=>{
    expect(inspectSlotMarker(frame('red-portrait')).status).toBe('unknown');
  });
  it('não confirma pré-seleção sem ícone de confirmação',()=>{
    expect(inspectSlotMarker(frame('none')).status).toBe('unknown');
  });
  it('ignora cores isoladas na parte superior fora da região do marcador',()=>{
    expect(inspectSlotMarker(frame('top-only')).status).toBe('unknown');
  });
  it('recusa sinais simultâneos contraditórios',()=>{
    expect(inspectSlotMarker(frame('mixed')).status).toBe('unknown');
  });
  it('nunca produz evento sem identidade, equipe e slot validados separadamente',()=>{
    const marker=inspectSlotMarker(frame('ban'));
    expect(hasVerifiedVisualDecision(marker,null,'ally',0)).toBe(false);
    expect(hasVerifiedVisualDecision(marker,'griff',null,0)).toBe(false);
    expect(hasVerifiedVisualDecision(marker,'griff','ally',null)).toBe(false);
    expect(hasVerifiedVisualDecision(marker,'griff','ally',3)).toBe(false);
    expect(hasVerifiedVisualDecision(inspectSlotMarker(frame('none')),'griff','ally',0)).toBe(false);
    expect(hasVerifiedVisualDecision(marker,'griff','ally',0)).toBe(true);
  });
  it('recusa frame inválido sem lançar exceção',()=>{
    expect(inspectSlotMarker({width:150,height:180,data:new Uint8ClampedArray(7)}).status).toBe('unknown');
  });
});
