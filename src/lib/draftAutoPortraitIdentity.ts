import type { DraftCropPixels } from './draftAutoSlotChange';

/**
 * Small RGB appearance descriptor for controlled screenshots of the same
 * Brawl Stars draft layout. A fingerprint is NOT a brawler ID; skins,
 * animations, lighting, empty slots and different layouts can change it.
 */
export type DraftPortraitFingerprint = {
  cells: number[];
};
export type DraftPortraitReference = {
  /** Human supplied; not a verified catalog UUID. */
  label: string;
  fingerprint: DraftPortraitFingerprint;
};
export type DraftPortraitMatch = {
  status: 'similar-example' | 'uncertain' | 'insufficient-references';
  label: string | null;
  similarity: number;
  margin: number;
};

/** Approximate facial area, omitting name, power level and confirmation UI. */
export function portraitFingerprint(frame: DraftCropPixels): DraftPortraitFingerprint | null {
  if(!Number.isSafeInteger(frame?.width)||!Number.isSafeInteger(frame?.height)||
    frame.width<40||frame.height<50||frame.width*frame.height>250_000||
    frame.data?.length!==frame.width*frame.height*4)return null;

  const cells: number[]=[];
  const left=Math.floor(frame.width*.18),right=Math.ceil(frame.width*.78);
  const top=Math.floor(frame.height*.2),bottom=Math.ceil(frame.height*.72);
  for(let gy=0;gy<8;gy++)for(let gx=0;gx<8;gx++){
    const x0=left+Math.floor((right-left)*gx/8);
    const x1=left+Math.floor((right-left)*(gx+1)/8);
    const y0=top+Math.floor((bottom-top)*gy/8);
    const y1=top+Math.floor((bottom-top)*(gy+1)/8);
    let r=0,g=0,b=0,used=0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const at=(y*frame.width+x)*4;
      if(frame.data[at+3]<200)continue;
      r+=frame.data[at];g+=frame.data[at+1];b+=frame.data[at+2];used++;
    }
    if(!used)return null;
    cells.push(Math.round(r/used),Math.round(g/used),Math.round(b/used));
  }
  return {cells};
}

export function portraitSimilarity(
  one: DraftPortraitFingerprint,
  another: DraftPortraitFingerprint,
): number | null {
  if(one?.cells?.length!==192||another?.cells?.length!==192 ||
    !one.cells.every(v=>Number.isFinite(v)&&v>=0&&v<=255)||
    !another.cells.every(v=>Number.isFinite(v)&&v>=0&&v<=255))return null;
  let difference=0;
  for(let i=0;i<192;i++)difference+=Math.abs(one.cells[i]-another.cells[i]);
  return Math.round((1-difference/(192*255))*1000)/1000;
}

/**
 * Fail closed: needs >= 2 different human-labelled examples, strong visual
 * similarity AND separation from the runner-up. Never emits game events.
 * Only match screenshots with consistent crop position/phase.
 */
export function matchDraftPortrait(
  target: DraftPortraitFingerprint,
  references: DraftPortraitReference[],
): DraftPortraitMatch {
  const abstain=(status: DraftPortraitMatch['status'],similarity=0,margin=0):DraftPortraitMatch=>
    ({status,label:null,similarity,margin});
  const bestForLabel=new Map<string,number>();
  for(const ref of references){
    const label=ref?.label?.trim().slice(0,48);
    if(!label)continue;
    const score=portraitSimilarity(target,ref.fingerprint);
    if(score===null)continue;
    bestForLabel.set(label,Math.max(score,bestForLabel.get(label)??0));
  }
  if(bestForLabel.size<2)return abstain('insufficient-references');
  const ranked=[...bestForLabel].sort((a,b)=>b[1]-a[1]);
  const [[label,highest],[,runnerUp]]=ranked;
  const margin=Math.round((highest-runnerUp)*1000)/1000;
  if(highest<.90||margin<.08)return abstain('uncertain',highest,margin);
  return {status:'similar-example',label,similarity:highest,margin};
}
