/**
 * Diagnostic image-difference measurement for two crops of the SAME physical
 * pick slot. It intentionally does NOT infer a ban, pick, character or team.
 *
 * The caller must align frames and crop the same slot from both images.
 * Transitions such as selected->confirmed can be too subtle in the portrait;
 * a changed portrait can also be animation, resolution or camera movement.
 */
export type DraftCropPixels = {
  width:number;
  height:number;
  data:Uint8ClampedArray;
};

export type DraftSlotDifference = {
  changedFraction:number;
  meanChannelDifference:number;
  /** Heuristic only, never proof of a confirmed pick/ban. */
  visualChangeCandidate:boolean;
};

export function compareDraftSlotCrops(
  before:DraftCropPixels,
  after:DraftCropPixels,
):DraftSlotDifference|null {
  const valid=(x:DraftCropPixels)=>Number.isSafeInteger(x?.width)&&
    Number.isSafeInteger(x?.height)&&x.width>=32&&x.height>=32&&
    x.width*x.height<=250_000&&x.data?.length===x.width*x.height*4;
  if(!valid(before)||!valid(after)||
    before.width!==after.width||before.height!==after.height)return null;

  // Focus on the picture, not the player's name, gadgets, green check,
  // purple power level, or the outer bright border. Another step handles
  // confirmation marks, which are too important to conflate with this diff.
  const left=Math.floor(before.width*.14);
  const right=Math.ceil(before.width*.86);
  const top=Math.floor(before.height*.22);
  const bottom=Math.ceil(before.height*.74);
  let pixels=0,changed=0,differenceTotal=0;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const i=(y*before.width+x)*4;
    if(before.data[i+3]<200||after.data[i+3]<200)continue;
    const difference=(
      Math.abs(before.data[i]-after.data[i])+
      Math.abs(before.data[i+1]-after.data[i+1])+
      Math.abs(before.data[i+2]-after.data[i+2])
    )/3;
    differenceTotal+=difference;
    if(difference>=48)changed++;
    pixels++;
  }
  if(pixels<64)return null;
  const changedFraction=Math.round(changed/pixels*1000)/1000;
  const meanChannelDifference=Math.round(differenceTotal/pixels*10)/10;
  return {
    changedFraction,
    meanChannelDifference,
    visualChangeCandidate:changedFraction>=.24&&meanChannelDifference>=35,
  };
}
