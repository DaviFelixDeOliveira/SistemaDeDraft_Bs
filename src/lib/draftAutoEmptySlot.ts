import type { DraftCropPixels } from './draftAutoSlotChange';

export type DraftEmptySlotEvidence = {
  status: 'likely-empty' | 'unknown';
  purpleShare: number;
  darkShare: number;
  luminanceSpread: number;
};

/**
 * Conservative visual guard for the dark question-mark placeholder inside
 * unselected Brawl Stars pick cards. It is NOT proof of an empty slot: skins,
 * overlays, animations, image scaling and UI changes can defeat this rule.
 *
 * Only examines the central portrait area, avoiding name, gear, team
 * background, power level and confirmation badges.
 */
export function inspectDraftEmptySlot(frame: DraftCropPixels): DraftEmptySlotEvidence {
  const unknown=(purpleShare=0,darkShare=0,luminanceSpread=0):DraftEmptySlotEvidence=>
    ({status:'unknown',purpleShare,darkShare,luminanceSpread});
  if(!Number.isSafeInteger(frame?.width)||!Number.isSafeInteger(frame?.height)||
    frame.width<40||frame.height<50||frame.width*frame.height>250_000||
    frame.data?.length!==frame.width*frame.height*4)return unknown();

  const x0=Math.floor(frame.width*.18),x1=Math.ceil(frame.width*.82);
  const y0=Math.floor(frame.height*.18),y1=Math.ceil(frame.height*.62);
  let count=0,purple=0,dark=0,lightSum=0,lightSquares=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const at=(y*frame.width+x)*4;
    if(frame.data[at+3]<200)continue;
    const r=frame.data[at],g=frame.data[at+1],b=frame.data[at+2];
    const lum=(r+g+b)/3;
    if(r>=22&&r<=120&&g>=15&&g<=110&&b>=30&&b<=150&&
      b>=g*1.12&&b>=r*.85)purple++;
    if(lum<100)dark++;
    lightSum+=lum;lightSquares+=lum*lum;
    count++;
  }
  if(count<200)return unknown();
  const purpleShare=purple/count,darkShare=dark/count;
  const mean=lightSum/count;
  const luminanceSpread=Math.sqrt(Math.max(0,lightSquares/count-mean*mean));
  // The placeholder's muted purple '?' is a low-luminance, low-variance
  // illustration. Require all clues to agree; never infer occupied from
  // failing this test. Thresholds are prototypes, not measured accuracy.
  const likelyEmpty=purpleShare>=.72&&darkShare>=.9&&
    mean<85&&luminanceSpread>=9&&luminanceSpread<=38;
  return {status:likelyEmpty?'likely-empty':'unknown',
    purpleShare,darkShare,luminanceSpread};
}
