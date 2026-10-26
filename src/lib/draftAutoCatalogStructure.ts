import type { DraftPortraitFingerprint } from './draftAutoPortraitIdentity';
import type { DraftCatalogReference } from './draftAutoCatalogVisual';

/**
 * Experimental diagnostic metric (NOT a trained recognizer).
 * Compares the spatial pattern of brightness in the same 8x8 portrait grid,
 * rather than comparing absolute RGB. It tolerates changes to global
 * brightness/color but cannot reliably identify brawlers across skins.
 */
export function draftPortraitStructureSimilarity(
  first:DraftPortraitFingerprint,
  second:DraftPortraitFingerprint,
):number|null {
  const valid=(value:DraftPortraitFingerprint)=>
    value?.cells?.length===192&&value.cells.every(v=>
      Number.isFinite(v)&&v>=0&&v<=255);
  if(!valid(first)||!valid(second))return null;
  const grayscale=(fp:DraftPortraitFingerprint)=>{
    const lum:number[]=[];
    for(let i=0;i<192;i+=3){
      lum.push(.2126*fp.cells[i]+.7152*fp.cells[i+1]+.0722*fp.cells[i+2]);
    }
    const mean=lum.reduce((sum,v)=>sum+v,0)/lum.length;
    const spread=Math.sqrt(lum.reduce((sum,v)=>sum+(v-mean)**2,0)/lum.length);
    const scale=Math.max(spread,20);
    return lum.map(v=>Math.max(-3,Math.min(3,(v-mean)/scale)));
  };
  const a=grayscale(first),b=grayscale(second);
  let shadeError=0;
  for(let i=0;i<64;i++){
    shadeError+=Math.min(4,Math.abs(a[i]-b[i]))/4;
  }
  let edges=0,edgeError=0;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const i=y*8+x;
    if(x<7){
      edgeError+=Math.min(6,Math.abs((a[i+1]-a[i])-(b[i+1]-b[i])))/6;
      edges++;
    }
    if(y<7){
      edgeError+=Math.min(6,Math.abs((a[i+8]-a[i])-(b[i+8]-b[i])))/6;
      edges++;
    }
  }
  const difference=.65*shadeError/64+.35*edgeError/edges;
  return Math.round(Math.max(0,Math.min(1,1-difference))*1000)/1000;
}

export type DraftStructureRanking={
  id:number;
  name:string;
  similarity:number;
};
export function rankDraftCatalogByStructure(
  target:DraftPortraitFingerprint,
  references:DraftCatalogReference[],
):DraftStructureRanking[] {
  return references.flatMap(ref=>{
    const similarity=draftPortraitStructureSimilarity(target,ref.fingerprint);
    return similarity===null?[]:[{id:ref.id,name:ref.name,similarity}];
  }).sort((a,b)=>b.similarity-a.similarity||a.id-b.id);
}

export type DraftStructureDiagnostic={
  rank:number;
  total:number;
  similarity:number;
  bestName:string;
  topThree:DraftStructureRanking[];
};
export function diagnoseDraftStructureLabel(
  target:DraftPortraitFingerprint,
  references:DraftCatalogReference[],
  humanSelectedId:number,
):DraftStructureDiagnostic|null {
  const ranked=rankDraftCatalogByStructure(target,references);
  const index=ranked.findIndex(r=>r.id===humanSelectedId);
  if(index<0)return null;
  return {rank:index+1,total:ranked.length,
    similarity:ranked[index].similarity,
    bestName:ranked[0].name,topThree:ranked.slice(0,3)};
}
