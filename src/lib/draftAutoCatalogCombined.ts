import { portraitSimilarity, type DraftPortraitFingerprint } from './draftAutoPortraitIdentity';
import { draftPortraitStructureSimilarity } from './draftAutoCatalogStructure';
import type { DraftCatalogReference } from './draftAutoCatalogVisual';

/**
 * Experimental color+structure ranking for locally annotated screenshots.
 * Weights are not calibrated; resulting score is NOT confidence.
 * Keep out of automatic event generation until evaluated on labeled frames.
 */
export type CombinedCandidate={id:number;name:string;score:number;rgb:number;structure:number};
export function rankDraftCatalogCombined(
  target:DraftPortraitFingerprint,
  references:DraftCatalogReference[],
): CombinedCandidate[] {
  return references.flatMap(ref=>{
    const rgb=portraitSimilarity(target,ref.fingerprint);
    const structure=draftPortraitStructureSimilarity(target,ref.fingerprint);
    if(rgb===null||structure===null)return [];
    const score=Math.round((rgb*.5+structure*.5)*1000)/1000;
    return [{id:ref.id,name:ref.name,score,rgb,structure}];
  }).sort((a,b)=>b.score-a.score||a.id-b.id);
}
export function diagnoseDraftCombinedLabel(
  target:DraftPortraitFingerprint,
  references:DraftCatalogReference[],
  humanSelectedId:number,
):{rank:number;total:number;score:number;bestName:string;topThree:CombinedCandidate[]}|null {
  const ranked=rankDraftCatalogCombined(target,references);
  const index=ranked.findIndex(v=>v.id===humanSelectedId);
  if(index<0)return null;
  return {rank:index+1,total:ranked.length,score:ranked[index].score,
    bestName:ranked[0].name,topThree:ranked.slice(0,3)};
}
