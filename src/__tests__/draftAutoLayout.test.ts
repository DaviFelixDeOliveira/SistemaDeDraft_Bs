import {describe,expect,it} from 'vitest';
import {draftHudRegions,draftHudPixelRect,DEFAULT_DRAFT_HUD_CALIBRATION} from '../lib/draftAutoLayout';

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
  it('não produz regiões para parâmetros fora de faixa',()=>{
    expect(draftHudRegions(0,0)).toEqual([]);
    expect(draftHudRegions(1920,1080,{...DEFAULT_DRAFT_HUD_CALIBRATION,picksTopPercent:99})).toEqual([]);
    expect(draftHudRegions(1920,1080,{...DEFAULT_DRAFT_HUD_CALIBRATION,gameWidthPercent:NaN})).toEqual([]);
  });
});
