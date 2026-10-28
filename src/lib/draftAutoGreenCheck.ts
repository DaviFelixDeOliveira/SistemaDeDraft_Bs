import type { DraftHudRegion } from './draftAutoLayout';
import type { SlotPixelFrame } from './draftAutoVisualEvidence';

/**
 * Confirmed Brawl Stars picks typically add a small green check just OUTSIDE
 * the card's lower-right edge. We compare this adjacent area across two
 * captures, rather than inspecting only the portrait crop. Results are
 * diagnostic indications, never a verified pick or permission to send an event.
 */
export type GreenCheckTransition = {
  status: 'possible-check-appeared' | 'check-disappeared' | 'ambiguous-check-change' | 'no-new-check' | 'unavailable';
  newGreenShare: number;
};

export function greenCheckSearchRect(
  region: DraftHudRegion,
  frameWidth: number,
  frameHeight: number,
): { x:number;y:number;width:number;height:number } | null {
  if(region.kind!=='pick-slot' ||
    !Number.isSafeInteger(frameWidth)||!Number.isSafeInteger(frameHeight)||
    frameWidth<400||frameHeight<300||
    ![region.x,region.y,region.width,region.height].every(Number.isFinite) ||
    region.width<=0||region.height<=0||region.x<0||region.y<0||
    region.x+region.width>1.001||region.y+region.height>1.001)return null;
  // The check can protrude 10-35% beyond the right edge of the card.
  // Keep the ROI above the accessory icons / equipment row.
  const left=Math.max(0,Math.round((region.x+region.width*.78)*frameWidth));
  const right=Math.min(frameWidth,Math.round((region.x+region.width*1.40)*frameWidth));
  const top=Math.max(0,Math.round((region.y+region.height*.52)*frameHeight));
  const bottom=Math.min(frameHeight,Math.round((region.y+region.height*.86)*frameHeight));
  return right-left>=8&&bottom-top>=8
    ?{x:left,y:top,width:right-left,height:bottom-top}:null;
}

function greenAt(frame:SlotPixelFrame,index:number):boolean {
  const data=frame.data,r=data[index],g=data[index+1],b=data[index+2],a=data[index+3];
  return a>=200&&g>110&&g>r*1.35&&g>b*1.15&&g-r>45;
}

/**
 * Accept only an approximately compact connected bright-green component
 * whose majority of pixels were NOT green in the earlier frame.
 * Other green portrait parts, effects and stream overlays can resemble checks:
 * even a positive result still needs confirmation by a person.
 */

type CheckShape = { cx:number;cy:number;novelFraction:number };

/**
 * Detect the silhouette of a check independently of pixel-to-pixel novelty.
 * Slight movement or scaling between screenshots can make an OLD check look
 * entirely new at pixel level; its approximate geometry must also be compared.
 */
function findCheckShapes(
  mask:Uint8Array, previous:Uint8Array, width:number, height:number,
  relaxedSingleFrame=false,
): CheckShape[] {
  const size=width*height,visited=new Uint8Array(size);
  const minDim=Math.min(width,height),stack:number[]=[];
  const shapes:CheckShape[]=[];
  for(let i=0;i<size;i++){
    if(!mask[i]||visited[i])continue;
    visited[i]=1;stack.push(i);
    let area=0,novel=0,minX=width,maxX=0,minY=height,maxY=0;
    while(stack.length){
      const at=stack.pop()!,x=at%width,y=Math.floor(at/width);
      area++;if(!previous[at])novel++;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);
      minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;
        const nx=x+dx,ny=y+dy;
        if(nx<0||ny<0||nx>=width||ny>=height)continue;
        const next=ny*width+nx;
        if(mask[next]&&!visited[next]){visited[next]=1;stack.push(next);}
      }
    }
    const bw=maxX-minX+1,bh=maxY-minY+1;
    const aspect=bw/bh,density=area/(bw*bh);
    const cx=(minX+maxX)/(2*width),cy=(minY+maxY)/(2*height);
    // Single screenshots can contain narrower, partially occluded checks
    // (especially on the red team's last cards). Apply wider shape bounds
    // ONLY when reporting diagnostic presence, never to new-pick transitions.
    const minShare=relaxedSingleFrame ? 0.01 : 0.018;
    const minWidth=relaxedSingleFrame ? 0.11 : 0.14;
    const minAspect=relaxedSingleFrame ? 0.38 : 0.55;
    const maxDensity=relaxedSingleFrame ? 0.80 : 0.73;
    if(area>=size*minShare&&area<=size*.25&&
       bw>=minDim*minWidth&&bh>=minDim*.14&&
       bw<=minDim*.78&&bh<=minDim*.78&&
       aspect>=minAspect&&aspect<=1.8&&density>=.17&&density<=maxDensity&&
       cx>=.2&&cx<=.95&&cy>=.12&&cy<=.90) {
      shapes.push({cx,cy,novelFraction:novel/area});
    }
  }
  return shapes;
}

/**
 * A one-frame observation: checks that may ALREADY be visible next to a card.
 * Unlike the transition detector, this CANNOT tell whether the mark is new,
 * whether the same brawler was previously confirmed, or who played the pick.
 * Only use it as a local diagnostic; never emit a draft event from this.
 */
export type GreenCheckPresence = {
  status: 'possible-check-visible' | 'not-detected' | 'unavailable';
};

export function inspectGreenCheckPresence(frame:SlotPixelFrame):GreenCheckPresence {
  if(!Number.isSafeInteger(frame?.width)||!Number.isSafeInteger(frame?.height)||
    frame.width<32||frame.height<32||
    frame.width*frame.height>180_000||
    frame.data?.length!==frame.width*frame.height*4){
    return {status:'unavailable'};
  }
  const {width,height}=frame;
  const mask=new Uint8Array(width*height);
  for(let pixel=0;pixel<mask.length;pixel++){
    mask[pixel]=greenAt(frame,pixel*4)?1:0;
  }
  const candidates=findCheckShapes(mask,mask,width,height,true);
  // A real check should extend beyond the right edge of a pick portrait.
  // Keep lower-left accessory icons outside this one-frame diagnostic.
  return {status:candidates.some(shape=>shape.cx>=.45)
    ?'possible-check-visible':'not-detected'};
}

export function inspectGreenCheckTransition(
  before:SlotPixelFrame,
  after:SlotPixelFrame,
): GreenCheckTransition {
  const unavailable={status:'unavailable' as const,newGreenShare:0};
  const valid=(f:SlotPixelFrame)=>Number.isSafeInteger(f?.width)&&
    Number.isSafeInteger(f?.height)&&f.width>=32&&f.height>=32&&
    f.width*f.height<=180_000&&f.data?.length===f.width*f.height*4;
  if(!valid(before)||!valid(after)||
    before.width!==after.width||before.height!==after.height)return unavailable;
  const {width,height}=after,size=width*height;
  const earlier=new Uint8Array(size),latest=new Uint8Array(size);
  let newCount=0;
  for(let pixel=0;pixel<size;pixel++){
    earlier[pixel]=greenAt(before,pixel*4)?1:0;
    latest[pixel]=greenAt(after,pixel*4)?1:0;
    if(latest[pixel]&&!earlier[pixel])newCount++;
  }
  const share=Math.round(newCount/size*1000)/1000;
  const noNew={status:'no-new-check' as const,newGreenShare:share};
  const existingChecks=findCheckShapes(earlier,earlier,width,height);
  const afterChecks=findCheckShapes(latest,earlier,width,height);
  // A check that merely persists in another capture must never produce a
  // second "confirmed" indication. Larger movements may be camera shifts.
  const matches=(a:CheckShape,b:CheckShape)=>
    Math.hypot(a.cx-b.cx,a.cy-b.cy)<=.25;
  const newShape=afterChecks.some(candidate=>
    candidate.novelFraction>=.75 &&
    !existingChecks.some(previous=>matches(previous,candidate))
  );
  const disappeared=existingChecks.some(previous=>
    !afterChecks.some(candidate=>matches(previous,candidate))
  );
  if(newShape&&existingChecks.length>0){
    return {status:'ambiguous-check-change',newGreenShare:share};
  }
  if(newShape&&share>=.018){
    return {status:'possible-check-appeared',newGreenShare:share};
  }
  if(disappeared){
    return {status:'check-disappeared',newGreenShare:share};
  }
  return noNew;
}
