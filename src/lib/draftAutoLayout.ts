/**
 * Approximate HUD geometry for draft screenshots. This is a CALIBRATION
 * overlay, not automatic scene understanding. Its rectangles should never
 * be used as proof of player/team/turn or brawler identification.
 *
 * The user can tune the visible game width and bottom card position for
 * letterboxed videos or different aspect ratios.
 */
export type DraftHudRegion = {
  id: string;
  label: string;
  kind: 'pick-slot' | 'ban-area';
  side: 'blue' | 'red';
  physicalSlot: number | null;
  x: number; y: number; width: number; height: number;
};

export type DraftHudCalibration = {
  /** Visible game viewport width, % of full screenshot. */
  gameWidthPercent: number;
  /** Horizontal offset from a centered viewport, % of full screenshot. */
  horizontalShiftPercent: number;
  /** Top of lower pick cards, % of screenshot height. */
  picksTopPercent: number;
};

export const DEFAULT_DRAFT_HUD_CALIBRATION: DraftHudCalibration = {
  gameWidthPercent: 100,
  horizontalShiftPercent: 0,
  picksTopPercent: 76,
};

function inRange(v:number,min:number,max:number) {
  return Number.isFinite(v)&&v>=min&&v<=max;
}

export function draftHudRegions(
  frameWidth:number,
  frameHeight:number,
  calibration:DraftHudCalibration = DEFAULT_DRAFT_HUD_CALIBRATION,
):DraftHudRegion[] {
  if(!Number.isSafeInteger(frameWidth)||!Number.isSafeInteger(frameHeight)||
     frameWidth<400||frameHeight<300||frameWidth*frameHeight>24_000_000||
     !inRange(calibration.gameWidthPercent,60,100)||
     !inRange(calibration.horizontalShiftPercent,-15,15)||
     !inRange(calibration.picksTopPercent,61,82))return [];
  const gameWidth=calibration.gameWidthPercent/100;
  const left=Math.max(0,Math.min(1-gameWidth,
    (1-gameWidth)/2+calibration.horizontalShiftPercent/100));
  const picksY=calibration.picksTopPercent/100;
  const slotHeight=Math.min(.2,.985-picksY);
  const rect=(x:number,y:number,w:number,h:number)=>({
    x:left+gameWidth*x,y,width:gameWidth*w,height:h,
  });
  // The six cards are always grouped by colour, not by snake-draft turn.
  const blue=[.135,.255,.375],red=[.555,.675,.795];
  const slots:DraftHudRegion[]=[
    ...blue.map((x,i)=>({
      id:`blue-${i+1}`,label:`Azul ${i+1}`,kind:'pick-slot' as const,
      side:'blue' as const,physicalSlot:i,...rect(x,picksY,.09,slotHeight),
    })),
    ...red.map((x,i)=>({
      id:`red-${i+1}`,label:`Vermelho ${i+1}`,kind:'pick-slot' as const,
      side:'red' as const,physicalSlot:i,...rect(x,picksY,.09,slotHeight),
    })),
  ];
  // Side ban lists are not reliably parsed as individual slots yet.
  const banTop=Math.max(.54,picksY-.01);
  const banHeight=Math.min(.25,1-banTop);
  const bans:DraftHudRegion[]=[
    {id:'blue-bans',label:'Bans azuis',kind:'ban-area',side:'blue',physicalSlot:null,
      ...rect(.038,banTop,.082,banHeight)},
    {id:'red-bans',label:'Bans vermelhos',kind:'ban-area',side:'red',physicalSlot:null,
      ...rect(.89,banTop,.082,banHeight)},
  ];
  return [...slots,...bans];
}

/** Pixel cropping rectangles, clamped without extrapolating outside image. */
export function draftHudPixelRect(region:DraftHudRegion,width:number,height:number){
  const x=Math.max(0,Math.min(width-1,Math.round(region.x*width)));
  const y=Math.max(0,Math.min(height-1,Math.round(region.y*height)));
  const right=Math.max(x+1,Math.min(width,Math.round((region.x+region.width)*width)));
  const bottom=Math.max(y+1,Math.min(height,Math.round((region.y+region.height)*height)));
  return {x,y,width:right-x,height:bottom-y};
}


/** Single-slot calibration in normalized screenshot coordinates.
 * These changes move or resize only the supplied region and never imply
 * a confirmed pick, ban, or recognized brawler.
 */
export function editDraftHudRegion(
  region:DraftHudRegion,
  action:'move'|'resize',
  deltaX:number,
  deltaY:number,
):DraftHudRegion {
  if(!Number.isFinite(deltaX)||!Number.isFinite(deltaY))return region;
  const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
  if(action==='move')return {
    ...region,
    x:clamp(region.x+deltaX,0,1-region.width),
    y:clamp(region.y+deltaY,0,1-region.height),
  };
  return {
    ...region,
    width:clamp(region.width+deltaX,.025,1-region.x),
    height:clamp(region.height+deltaY,.045,1-region.y),
  };
}
