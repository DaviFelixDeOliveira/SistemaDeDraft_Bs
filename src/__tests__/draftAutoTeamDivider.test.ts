import {describe,expect,it} from 'vitest';
import {
  detectDraftTeamDivider,alignDraftRegionsToTeamDivider,
} from '../lib/draftAutoTeamDivider';
import {draftRegionsForScene,FULL_DRAFT_VIEWPORT} from '../lib/draftAutoScene';

const sample=(split:number,withSidebars=false,monochrome=false)=>{
  const width=800,height=450,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    const px=withSidebars?(x-.1*width)/(.8*width):x/width;
    const inside=!withSidebars||(px>=0&&px<1);
    const bright=y>height*.7&&inside&&!monochrome;
    const rgb=bright?(px<split?[33,101,221]:[206,31,64]):[24,24,34];
    data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=255;
  }
  return {width,height,data};
};

describe('Detecção visual experimental da divisão azul/vermelha',()=>{
  it('encontra divisão central em quadro sem bordas',()=>{
    const result=detectDraftTeamDivider(sample(.5),FULL_DRAFT_VIEWPORT);
    expect(result).not.toBeNull();
    expect(result!.split).toBeGreaterThan(.47);
    expect(result!.split).toBeLessThan(.53);
    expect(result!.blueSupport).toBeGreaterThan(.5);
    expect(result!.redSupport).toBeGreaterThan(.5);
  });
  it('adapta divisão deslocada no jogo com bordas laterais',()=>{
    const viewport={x:.1,y:0,width:.8,height:1};
    const result=detectDraftTeamDivider(sample(.56,true),viewport);
    expect(result).not.toBeNull();
    expect(result!.split).toBeGreaterThan(.52);
    expect(result!.split).toBeLessThan(.59);
  });
  it('recusa quadros monocromáticos e informações inválidas',()=>{
    expect(detectDraftTeamDivider(sample(.5,false,true),FULL_DRAFT_VIEWPORT)).toBeNull();
    expect(detectDraftTeamDivider(sample(.5),{x:.8,y:0,width:.5,height:1})).toBeNull();
    expect(detectDraftTeamDivider({width:800,height:450,data:new Uint8ClampedArray(12)},FULL_DRAFT_VIEWPORT)).toBeNull();
  });
  it('ajusta somente cartões de picks, sem inventar bans ou ordem de seleção',()=>{
    const regions=draftRegionsForScene(1920,1080,'selection',FULL_DRAFT_VIEWPORT);
    const shifted=alignDraftRegionsToTeamDivider(regions,FULL_DRAFT_VIEWPORT,{
      split:.57,blueSupport:.85,redSupport:.85,
    });
    expect(shifted).toHaveLength(8);
    expect(shifted[2].x).toBeGreaterThan(regions[2].x);
    expect(shifted[3].x).toBeGreaterThan(regions[3].x);
    expect(shifted[6]).toEqual(regions[6]);
    expect(alignDraftRegionsToTeamDivider(regions,FULL_DRAFT_VIEWPORT,null)).toEqual(regions);
    for(const region of shifted){
      expect(region.x+region.width).toBeLessThanOrEqual(1);
    }
  });
});
