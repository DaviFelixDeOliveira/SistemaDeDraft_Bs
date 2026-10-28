import {describe,expect,it} from 'vitest';
import {draftHudRegions,draftHudPixelRect,editDraftHudRegion,DEFAULT_DRAFT_HUD_CALIBRATION} from '../lib/draftAutoLayout';

describe('Regiões experimentais do HUD completo',()=>{
  it('propõe seis cartões de picks e duas áreas laterais de bans',()=>{
    const regions=draftHudRegions(1920,1080);
    expect(regions).toHaveLength(8);
    expect(regions.filter(x=>x.kind==='pick-slot')).toHaveLength(6);
    expect(regions.filter(x=>x.kind==='ban-area')).toHaveLength(2);
    expect(regions.filter(x=>x.side==='blue'&&x.kind==='pick-slot').map(x=>x.physicalSlot)).toEqual([0,1,2]);
    expect(regions.filter(x=>x.side==='red'&&x.kind==='pick-slot').map(x=>x.physicalSlot)).toEqual([0,1,2]);
  });
  it('mantém recortes dentro da tela e lados separados',()=>{
    const regions=draftHudRegions(1650,1000);
    for(const r of regions){
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x+r.width).toBeLessThanOrEqual(1);
      expect(r.y+r.height).toBeLessThanOrEqual(1);
      const pixels=draftHudPixelRect(r,1650,1000);
      expect(pixels.width).toBeGreaterThan(0);
      expect(pixels.height).toBeGreaterThan(0);
      expect(pixels.x+pixels.width).toBeLessThanOrEqual(1650);
    }
    expect(regions[2].x+regions[2].width).toBeLessThan(regions[3].x);
  });
  it('calibração de vídeo com barras laterais desloca as cartas sem criar equipes novas',()=>{
    const base=draftHudRegions(1920,1080);
    const custom=draftHudRegions(1920,1080,{gameWidthPercent:80,horizontalShiftPercent:5,picksTopPercent:70});
    expect(custom).toHaveLength(8);
    expect(custom[0].x).toBeGreaterThan(base[0].x);
    expect(custom[0].y).toBe(.7);
    expect(custom[0].side).toBe('blue');
  });
  it('move um slot independentemente dos outros e limita à captura',()=>{
    const regions=draftHudRegions(1920,1080);
    const first=regions[0];
    const adjusted=editDraftHudRegion(first,'move',.13,-.045);
    expect(adjusted.x).toBeCloseTo(first.x+.13);
    expect(adjusted.y).toBeCloseTo(first.y-.045);
    expect(regions[1].x).toBe(regions[1].x);
    expect(regions[0]).toEqual(first);
    const clipped=editDraftHudRegion(first,'move',10,-10);
    expect(clipped.x+clipped.width).toBeCloseTo(1);
    expect(clipped.y).toBe(0);
  });
  it('redimensiona a caixa selecionada sem ultrapassar limites',()=>{
    const first=draftHudRegions(1920,1080)[0];
    const larger=editDraftHudRegion(first,'resize',.04,.035);
    expect(larger.width).toBeCloseTo(first.width+.04);
    expect(larger.height).toBeCloseTo(first.height+.035);
    const small=editDraftHudRegion(first,'resize',-20,-20);
    expect(small.width).toBe(.025);
    expect(small.height).toBe(.045);
    const clipped=editDraftHudRegion(first,'resize',20,20);
    expect(clipped.x+clipped.width).toBeCloseTo(1);
    expect(clipped.y+clipped.height).toBeCloseTo(1);
    expect(editDraftHudRegion(first,'move',NaN,0)).toEqual(first);
  });
  it('não produz regiões para parâmetros fora de faixa',()=>{
    expect(draftHudRegions(0,0)).toEqual([]);
    expect(draftHudRegions(1920,1080,{...DEFAULT_DRAFT_HUD_CALIBRATION,picksTopPercent:99})).toEqual([]);
    expect(draftHudRegions(1920,1080,{...DEFAULT_DRAFT_HUD_CALIBRATION,gameWidthPercent:NaN})).toEqual([]);
  });
});
