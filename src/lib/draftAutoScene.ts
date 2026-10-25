import type { DraftHudRegion } from './draftAutoLayout';

/** The real game area inside the supplied image, in normalized coordinates. */
export type DraftGameViewport = {x:number;y:number;width:number;height:number};
export type DraftScreenPhase = 'selection' | 'final-preparation';

export const FULL_DRAFT_VIEWPORT:DraftGameViewport={x:0,y:0,width:1,height:1};

function goodViewport(v:DraftGameViewport){
  return [v.x,v.y,v.width,v.height].every(Number.isFinite)&&
    v.x>=0&&v.y>=0&&v.width>=.55&&v.width<=1&&
    v.height>=.65&&v.height<=1&&v.x+v.width<=1.001&&v.y+v.height<=1.001;
}

/**
 * Finds possible dark pillarbox margins from colour activity across many
 * scan lines. This does NOT detect brawlers/cards, and can abstain on
 * webcam/overlays, low-saturation content or portrait rotated screenshots.
 */
export function estimateDraftGameViewport(frame:Pick<ImageData,'data'|'width'|'height'>):DraftGameViewport|null{
  if(!Number.isSafeInteger(frame?.width)||!Number.isSafeInteger(frame?.height)||
      frame.width<400||frame.height<300||
      frame.width*frame.height>24_000_000||frame.data?.length!==frame.width*frame.height*4) return null;
  const {data,width,height}=frame;
  const columnStep=Math.max(1,Math.floor(width/480));
  const ys=[.11,.17,.23,.31,.39,.47,.55,.63,.71,.79,.85];
  const scores:number[]=[];
  for(let x=0;x<width;x+=columnStep){
    let valid=0,active=0;
    for(const fy of ys){
      const y=Math.min(height-1,Math.floor(fy*height));
      const i=(y*width+x)*4;
      const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      if(a<200)continue;
      valid++;
      const max=Math.max(r,g,b),min=Math.min(r,g,b);
      if(max>85&&max-min>max*.30)active++;
    }
    scores.push(valid?active/valid:0);
  }
  const smooth=scores.map((_,i)=>{
    let sum=0,n=0;
    for(let k=Math.max(0,i-3);k<=Math.min(scores.length-1,i+3);k++){sum+=scores[k];n++;}
    return sum/n;
  });
  const enabled=smooth.map(s=>s>.26);
  // Use the longest coherent run, tolerate small low-saturation gaps.
  let bestStart=-1,bestEnd=-1;
  let start=-1,last=-1;
  const commit=()=>{if(start>=0&&last-start>bestEnd-bestStart){bestStart=start;bestEnd=last;}};
  for(let i=0;i<enabled.length;i++){
    if(enabled[i]){
      if(start<0)start=i;
      last=i;
    }else if(start>=0&&i-last>12){
      commit();start=-1;last=-1;
    }
  }
  commit();
  if(bestStart<0)return null;
  const left=Math.max(0,(bestStart*columnStep-2*columnStep)/width);
  const right=Math.min(1,((bestEnd+1)*columnStep+2*columnStep)/width);
  const viewport={x:left,y:0,width:right-left,height:1};
  return goodViewport(viewport)?viewport:null;
}

/**
 * Diagnostic bounding boxes RELATIVE TO THE DETECTED GAME VIEWPORT.
 * Selection cards are low; final-preparation cards move to the middle and
 * the side ban lists are no longer visible. These are seeds for calibration,
 * not detected card locations. Never infer the snake order from physical slot.
 */
export function draftRegionsForScene(
  width:number,height:number,phase:DraftScreenPhase,viewport:DraftGameViewport,
  topAdjustment=0,
):DraftHudRegion[]{
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<400||height<300||
    !goodViewport(viewport)||!Number.isFinite(topAdjustment)||
    topAdjustment<-.18||topAdjustment>.18)return [];
  const final=phase==='final-preparation';
  const y=(final?.445:.74)+topAdjustment;
  const cardWidth=final?.113:.09;
  const cardHeight=final?.245:.20;
  if(y<0||y+cardHeight>.99)return [];
  const blue=final?[.025,.18,.335]:[.125,.245,.365];
  const red=final?[.585,.74,.895]:[.565,.685,.805];
  const rect=(x:number,yy:number,w:number,h:number)=>({
    x:viewport.x+viewport.width*x,y:viewport.y+viewport.height*yy,
    width:viewport.width*w,height:viewport.height*h,
  });
  const cards:DraftHudRegion[]=[
    ...blue.map((x,i)=>({id:`blue-${i+1}`,label:`Azul ${i+1}`,
      kind:'pick-slot' as const,side:'blue' as const,physicalSlot:i,...rect(x,y,cardWidth,cardHeight)})),
    ...red.map((x,i)=>({id:`red-${i+1}`,label:`Vermelho ${i+1}`,
      kind:'pick-slot' as const,side:'red' as const,physicalSlot:i,...rect(x,y,cardWidth,cardHeight)})),
  ];
  if(final)return cards;
  return [...cards,
    {id:'blue-bans',label:'Bans azuis',kind:'ban-area',side:'blue',physicalSlot:null,
      ...rect(.018,.69,.084,.27)},
    {id:'red-bans',label:'Bans vermelhos',kind:'ban-area',side:'red',physicalSlot:null,
      ...rect(.90,.69,.084,.27)},
  ];
}
