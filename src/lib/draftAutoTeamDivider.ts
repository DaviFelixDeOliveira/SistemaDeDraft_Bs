import type { DraftHudRegion } from './draftAutoLayout';
import type { DraftGameViewport } from './draftAutoScene';

/**
 * Detects the blue/red TEAM BACKGROUND divider in the lower part of a draft
 * frame. It is a hint for alignment only: the colours may also appear in
 * portraits, webcam overlays and other phases. A null result means abstain.
 *
 * Input pixels are read locally. No name, brawler, ban or pick is identified.
 */
export type DraftTeamDivider = {
  /** Normalized x coordinate inside the game viewport. */
  split: number;
  blueSupport: number;
  redSupport: number;
};

type RawPixelFrame = {width:number;height:number;data:Uint8ClampedArray};

export function detectDraftTeamDivider(
  frame:RawPixelFrame,viewport:DraftGameViewport,
): DraftTeamDivider | null {
  const {width,height,data}=frame;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
    width<400||height<300||width*height>24_000_000||
    data?.length!==width*height*4||
    ![viewport.x,viewport.y,viewport.width,viewport.height].every(Number.isFinite)||
    viewport.width<.55||viewport.height<.65||viewport.x<0||viewport.y<0||
    viewport.x+viewport.width>1.001||viewport.y+viewport.height>1.001)return null;

  const bins=180, rows=28;
  const blue=new Float64Array(bins),red=new Float64Array(bins);
  for(let k=0;k<bins;k++){
    const nx=viewport.x+viewport.width*(k+.5)/bins;
    const x=Math.max(0,Math.min(width-1,Math.floor(nx*width)));
    for(let j=0;j<rows;j++){
      const ny=viewport.y+viewport.height*(.73+.21*(j+.5)/rows);
      const y=Math.max(0,Math.min(height-1,Math.floor(ny*height)));
      const idx=(y*width+x)*4;
      const r=data[idx],g=data[idx+1],b=data[idx+2],a=data[idx+3];
      if(a<200)continue;
      if(b>95&&b>r*1.32&&b>g*1.15)blue[k]++;
      if(r>95&&r>b*1.32&&r>g*1.40)red[k]++;
    }
  }
  let selected: DraftTeamDivider | null=null;
  let bestScore=-Infinity;
  // Exclude the VS separation and the very edge of both teams.
  for(let boundary=72;boundary<=108;boundary++){
    let b=0,r=0,wrongLeft=0,wrongRight=0,nLeft=0,nRight=0;
    for(let k=9;k<bins-9;k++){
      if(Math.abs(k-boundary)<5)continue;
      if(k<boundary){b+=blue[k];wrongLeft+=red[k];nLeft++;}
      else {r+=red[k];wrongRight+=blue[k];nRight++;}
    }
    const left=b/(nLeft*rows),right=r/(nRight*rows);
    const errors=(wrongLeft/(nLeft*rows)+wrongRight/(nRight*rows))/2;
    if(left<.24||right<.24||errors>.18)continue;
    const score=left+right-errors*1.5-Math.abs(boundary-bins/2)*.001;
    if(score>bestScore){
      bestScore=score;
      selected={split:boundary/bins,
        blueSupport:Math.round(left*100)/100,
        redSupport:Math.round(right*100)/100};
    }
  }
  return selected;
}

/**
 * Applies the measured divider to the draft's existing approximate card
 * regions; ban icons and the vertical positions remain untouched.
 * This is not card detection and must not be used to authorize an event.
 */
export function alignDraftRegionsToTeamDivider(
  regions:DraftHudRegion[],viewport:DraftGameViewport,
  divider:DraftTeamDivider|null,
):DraftHudRegion[]{
  if(!divider||divider.split<.4||divider.split>.6)return regions;
  const split=divider.split;
  const map=(v:number)=>v<=.5?v*(split/.5):split+(v-.5)*((1-split)/.5);
  return regions.map(region=>{
    if(region.kind!=='pick-slot')return region;
    const a=(region.x-viewport.x)/viewport.width;
    const b=(region.x+region.width-viewport.x)/viewport.width;
    const x=viewport.x+viewport.width*map(a);
    const right=viewport.x+viewport.width*map(b);
    return {...region,x,width:right-x};
  });
}
