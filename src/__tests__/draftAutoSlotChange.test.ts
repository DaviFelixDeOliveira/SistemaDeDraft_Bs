import {describe,it,expect} from 'vitest';
import {compareDraftSlotCrops,type DraftCropPixels} from '../lib/draftAutoSlotChange';

const make=(paint:'normal'|'different'|'lower-bar'|'tiny-shift'):DraftCropPixels=>{
  const width=64,height=80,data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    const inside=x>=9&&x<55&&y>=17&&y<60;
    const different=inside&&paint==='different';
    const noise=paint==='tiny-shift'&&(x+y)%23===0;
    const lower=y>=64&&paint==='lower-bar';
    const rgb=lower?[200,0,0]:different?[230,60,30]:noise?[160,50,30]:[50,100,180];
    data[i]=rgb[0];data[i+1]=rgb[1];data[i+2]=rgb[2];data[i+3]=255;
  }
  return {width,height,data};
};

describe('Diferença visual entre dois retratos do mesmo slot',()=>{
  it('não sinaliza duas capturas idênticas',()=>{
    expect(compareDraftSlotCrops(make('normal'),make('normal')))
      .toMatchObject({changedFraction:0,visualChangeCandidate:false});
  });
  it('sinaliza alteração ampla do retrato',()=>{
    const result=compareDraftSlotCrops(make('normal'),make('different'));
    expect(result?.visualChangeCandidate).toBe(true);
    expect(result?.changedFraction).toBeGreaterThan(.6);
  });
  it('ignora diferenças somente no rodapé de equipamentos',()=>{
    expect(compareDraftSlotCrops(make('normal'),make('lower-bar'))?.visualChangeCandidate).toBe(false);
  });
  it('não considera ruído pontual suficiente para mudança',()=>{
    expect(compareDraftSlotCrops(make('normal'),make('tiny-shift'))?.visualChangeCandidate).toBe(false);
  });
  it('recusa dimensões incompatíveis e buffers inválidos',()=>{
    expect(compareDraftSlotCrops(make('normal'),{width:72,height:80,data:new Uint8ClampedArray(72*80*4)})).toBeNull();
    expect(compareDraftSlotCrops(make('normal'),{width:64,height:80,data:new Uint8ClampedArray(0)})).toBeNull();
  });
});
