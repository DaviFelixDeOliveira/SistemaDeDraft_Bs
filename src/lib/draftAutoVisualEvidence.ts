/**
 * First visual gate for a CROPPED individual bottom draft slot.
 *
 * A red no-entry icon may indicate a confirmed ban; a green tick may indicate
 * a confirmed pick. These are colour-evidence candidates, NOT verified
 * decisions. This utility cannot identify the brawler, team, player, phase,
 * or whether the supplied crop actually contains a full game slot.
 *
 * Do not create an event or assign fabricated confidence based on its output.
 */
export type SlotMarkerKind = 'ban' | 'pick';
export type SlotMarkerEvidence =
  | { status: 'candidate'; marker: SlotMarkerKind; redShare: number; greenShare: number }
  | { status: 'unknown'; reason: string; redShare: number; greenShare: number };

export type SlotPixelFrame = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

/**
 * Measured against the individual slot examples supplied by the user. Input
 * must already be tightly cropped to ONE complete card. This does NOT locate
 * cards in screenshots and is NOT a trained brawler/image classifier.
 */

/**
 * A bright red ban symbol is a compact circular connected component (ring
 * and diagonal slash) near the lower-right edge of one complete slot. A large
 * red patch in a brawler portrait is NOT enough to call it a ban.
 *
 * Still experimental: this is only a shape heuristic, not a classifier
 * validated across all screen layouts or skins.
 */
function hasCompactRedBanShape(frame: SlotPixelFrame): boolean {
  const {width,height,data}=frame;
  // Bound CPU/memory to ~65K sampled pixels, even for large uploaded crops.
  const scale=Math.max(1,Math.ceil(Math.max(width,height)/256));
  const gw=Math.ceil(width/scale),gh=Math.ceil(height/scale);
  const red=new Uint8Array(gw*gh);
  for(let y=0;y<gh;y++){
    for(let x=0;x<gw;x++){
      const sx=Math.min(width-1,x*scale+Math.floor(scale/2));
      const sy=Math.min(height-1,y*scale+Math.floor(scale/2));
      const i=(sy*width+sx)*4;
      const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      if(a>=200&&r>150&&r>g*1.55&&r>b*1.3&&r-g>50)red[y*gw+x]=1;
    }
  }
  const visited=new Uint8Array(red.length);
  const stack:number[]=[];
  const min=Math.min(gw,gh);
  for(let i=0;i<red.length;i++){
    if(!red[i]||visited[i])continue;
    visited[i]=1;stack.push(i);
    let area=0,minX=gw,minY=gh,maxX=0,maxY=0;
    while(stack.length){
      const at=stack.pop()!;
      const px=at%gw,py=Math.floor(at/gw);
      area++;
      minX=Math.min(minX,px);maxX=Math.max(maxX,px);
      minY=Math.min(minY,py);maxY=Math.max(maxY,py);
      for(let dy=-1;dy<=1;dy++){
        for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;
          const nx=px+dx,ny=py+dy;
          if(nx<0||ny<0||nx>=gw||ny>=gh)continue;
          const next=ny*gw+nx;
          if(red[next]&&!visited[next]){visited[next]=1;stack.push(next);}
        }
      }
    }
    const bw=maxX-minX+1,bh=maxY-minY+1;
    const aspect=bw/bh,density=area/(bw*bh);
    const cx=(minX+bw/2)/gw,cy=(minY+bh/2)/gh;
    if(cx>=.72&&cx<=1&&cy>=.65&&cy<=.95 &&
       bw>=.15*min&&bh>=.15*min&&bw<=.45*min&&bh<=.45*min &&
       aspect>=.7&&aspect<=1.3&&density>=.25&&density<=.88)return true;
  }
  return false;
}

export function inspectSlotMarker(frame: SlotPixelFrame): SlotMarkerEvidence {
  const unknown = (reason: string, redShare = 0, greenShare = 0): SlotMarkerEvidence =>
    ({ status: 'unknown', reason, redShare, greenShare });
  if (!Number.isSafeInteger(frame?.width) || !Number.isSafeInteger(frame?.height) ||
    frame.width < 64 || frame.height < 64 ||
    frame.width * frame.height > 24_000_000 ||
    frame.data?.length !== frame.width * frame.height * 4) {
    return unknown('Recorte inválido.');
  }
  // Bottom-right marker area, excluding the upper-right star power and
  // the bottom-left gadget/gear badges. Do not apply to whole screenshots.
  const left = Math.floor(frame.width * .72);
  const top = Math.floor(frame.height * .40);
  const bottom = Math.ceil(frame.height * .78);
  const step = Math.max(1, Math.floor(Math.min(frame.width,frame.height)/150));
  let pixels = 0, reds = 0, greens = 0;
  for (let y = top; y < bottom; y += step) {
    for (let x = left; x < frame.width; x += step) {
      const i = (y * frame.width + x) * 4;
      const [r,g,b,a] = frame.data.subarray(i, i+4);
      if (a < 200) continue;
      pixels++;
      if (r > 150 && r > g*1.55 && r > b*1.3 && r-g > 50) reds++;
      if (g > 110 && g > r*1.35 && g > b*1.15 && g-r > 45) greens++;
    }
  }
  if (pixels === 0) return unknown('Recorte sem pixels utilizáveis.');
  const redShare = Math.round(reds/pixels*1000)/1000;
  const greenShare = Math.round(greens/pixels*1000)/1000;
  const redEvidence = redShare >= .08 && hasCompactRedBanShape(frame);
  const greenEvidence = greenShare >= .05;
  if (redEvidence === greenEvidence) {
    return unknown(redEvidence
      ? 'Cores de ban e pick no mesmo recorte. Confirmação ambígua.'
      : 'Nenhum ícone de confirmação identificado. Pode ser pré-seleção, slot vazio ou imagem incompatível.',
      redShare,greenShare);
  }
  return {
    status:'candidate',
    marker:redEvidence?'ban':'pick',
    redShare,greenShare,
  };
}

/** No automatic event is ever authorized from colour evidence alone. */
export function hasVerifiedVisualDecision(
  marker: SlotMarkerEvidence,
  confirmedIdentityId: string | null,
  confirmedTeam: 'ally' | 'enemy' | null,
  confirmedSlot: number | null,
): boolean {
  return marker.status === 'candidate' && typeof confirmedIdentityId === 'string' &&
    confirmedIdentityId.length > 0 && confirmedTeam !== null &&
    confirmedSlot !== null && Number.isInteger(confirmedSlot) &&
    confirmedSlot >= 0 && confirmedSlot < (marker.marker === 'ban' ? 3 : 6);
}
