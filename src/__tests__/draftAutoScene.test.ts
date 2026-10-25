import {describe,expect,it} from 'vitest';
import {
  estimateDraftGameViewport, draftRegionsForScene,FULL_DRAFT_VIEWPORT,
} from '../lib/draftAutoScene';

function sample(width:number,height:number,from:number,to:number,showBars:boolean){
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    const game=!showBars||(x>=from&&x<to);
    const color=game?(x<(from+to)/2?[35,120,240]:[220,25,65]):[24,24,30];
    data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;
  }
  return {width,height,data};
}

describe('Localização preliminar de viewport e layouts',()=>{
  it('detecta jogo central com barras laterais em tamanho variável',()=>{
    const v=estimateDraftGameViewport(sample(1000,600,100,900,true));
    expect(v).not.toBeNull();
    expect(v!.x).toBeGreaterThan(.07);
    expect(v!.x).toBeLessThan(.13);
    expect(v!.width).toBeGreaterThan(.75);
    expect(v!.width).toBeLessThan(.85);
  });
  it('aceita janela com cores do jogo até as bordas',()=>{
    const v=estimateDraftGameViewport(sample(800,450,0,800,false));
    expect(v).not.toBeNull();
    expect(v!.width).toBeGreaterThan(.97);
  });
  it('não inventa viewport com cena escura, dados inválidos ou vídeo pequeno',()=>{
    const dark=sample(800,450,0,800,true);
    for(let i=0;i<dark.data.length;i+=4){
      dark.data[i]=15;dark.data[i+1]=15;dark.data[i+2]=15;
    }
    expect(estimateDraftGameViewport(dark)).toBeNull();
    expect(estimateDraftGameViewport({width:800,height:450,data:new Uint8ClampedArray(2)})).toBeNull();
    expect(estimateDraftGameViewport(sample(250,200,0,250,false))).toBeNull();
  });
  it('seleção mostra seis picks e bans laterais; final mostra apenas seis picks em cima',()=>{
    const during=draftRegionsForScene(1920,1080,'selection',FULL_DRAFT_VIEWPORT);
    const after=draftRegionsForScene(1920,1080,'final-preparation',FULL_DRAFT_VIEWPORT);
    expect(during).toHaveLength(8);
    expect(after).toHaveLength(6);
    expect(after[0].y).toBeLessThan(during[0].y);
    expect(after.every(r=>r.kind==='pick-slot')).toBe(true);
    expect(after.map(r=>r.side)).toEqual(['blue','blue','blue','red','red','red']);
  });
  it('transforma coordenadas relativas ao jogo sem sair da imagem',()=>{
    const vp={x:.11,y:0,width:.78,height:1};
    const result=draftRegionsForScene(1920,1080,'final-preparation',vp);
    for(const p of result){
      expect(p.x).toBeGreaterThanOrEqual(vp.x);
      expect(p.x+p.width).toBeLessThanOrEqual(vp.x+vp.width+.001);
      expect(p.y+p.height).toBeLessThan(1);
    }
    expect(draftRegionsForScene(1920,1080,'selection',{x:.8,y:0,width:.5,height:1})).toEqual([]);
  });
});
