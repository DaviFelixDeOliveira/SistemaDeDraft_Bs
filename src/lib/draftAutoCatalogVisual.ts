import {
  portraitSimilarity,
  type DraftPortraitFingerprint,
} from './draftAutoPortraitIdentity';

/** Catalog names are display labels; external game IDs are not Supabase UUIDs. */
export type DraftCatalogPortrait = {
  id: number;
  name: string;
  imageUrl: string;
};

export type DraftCatalogReference = DraftCatalogPortrait & {
  fingerprint: DraftPortraitFingerprint;
};

export type DraftCatalogMatch = {
  status: 'possible-match' | 'uncertain' | 'no-references';
  name: string | null;
  gameId: number | null;
  similarity: number;
  margin: number;
  /** Raw visual nearest neighbors, not probabilities or confirmed IDs. */
  nearest: Array<{name: string;gameId: number;similarity: number}>;
};

const OFFICIAL_CDN = /^https:\/\/cdn\.brawlify\.com\/brawlers\/(?:borderless|borders)\/(160\d{5})\.png$/;

/** Validate third-party API records before image loads or rendering. */
export function parseDraftCatalog(payload: unknown): DraftCatalogPortrait[] {
  if(!payload || typeof payload!=='object' || !('list' in payload) ||
    !Array.isArray(payload.list))throw new Error('Formato inesperado do catálogo.');
  const entries:DraftCatalogPortrait[]=[];
  const usedIds=new Set<number>();
  const usedNames=new Set<string>();
  for(const raw of payload.list){
    if(!raw||typeof raw!=='object')continue;
    const obj=raw as Record<string,unknown>;
    const id=obj.id;
    if(typeof id!=='number'||!Number.isInteger(id)||id<16000000||id>16099999||
      obj.released===false||typeof obj.name!=='string'||obj.name.trim().length<2)continue;
    const name=obj.name.trim().slice(0,60);
    const urls=[obj.imageUrl2,obj.imageUrl];
    const selected=urls.find(url=>typeof url==='string'&&
      OFFICIAL_CDN.test(url) && Number(url.match(OFFICIAL_CDN)?.[1])===id);
    if(typeof selected!=='string'||usedIds.has(id)||usedNames.has(name.toLowerCase()))continue;
    usedIds.add(id);usedNames.add(name.toLowerCase());
    entries.push({id,name,imageUrl:selected});
    if(entries.length===160)break;
  }
  if(entries.length<2)throw new Error('O catálogo não trouxe imagens válidas suficientes.');
  return entries;
}

/**
 * Exact same cautious thresholds as the earlier manual-example lab.
 * Similarity is a RGB distance, NOT a calibrated probability.
 * A nearest label is never enough to emit a draft event.
 */
export function matchDraftCatalogPortrait(
  target:DraftPortraitFingerprint,
  references:DraftCatalogReference[],
):DraftCatalogMatch {
  const ranked:DraftCatalogMatch['nearest']=[];
  for(const ref of references){
    const score=portraitSimilarity(target,ref.fingerprint);
    if(score!==null)ranked.push({name:ref.name,gameId:ref.id,similarity:score});
  }
  ranked.sort((a,b)=>b.similarity-a.similarity);
  const nearest=ranked.slice(0,3);
  if(ranked.length<2)return {status:'no-references',name:null,gameId:null,
    similarity:nearest[0]?.similarity??0,margin:0,nearest};
  const best=ranked[0],second=ranked[1];
  const margin=Math.round((best.similarity-second.similarity)*1000)/1000;
  if(best.similarity<.9||margin<.08)return {status:'uncertain',
    name:null,gameId:null,similarity:best.similarity,margin,nearest};
  return {status:'possible-match',name:best.name,gameId:best.gameId,
    similarity:best.similarity,margin,nearest};
}

/**
 * Diagnostic of a HUMAN-labelled screenshot slot relative to this catalog.
 * Rank measures which public artwork fingerprint is visually closest, not
 * recognition accuracy. This function does not identify a brawler.
 */
export type DraftCatalogLabelDiagnostic = {
  rank:number;
  total:number;
  similarity:number;
  bestName:string;
  scoreGap:number;
};
export function diagnoseDraftCatalogLabel(
  target:DraftPortraitFingerprint,
  references:DraftCatalogReference[],
  humanSelectedId:number,
):DraftCatalogLabelDiagnostic|null {
  const ranked=references.flatMap(ref=>{
    const similarity=portraitSimilarity(target,ref.fingerprint);
    return similarity===null?[]:[{id:ref.id,name:ref.name,similarity}];
  }).sort((a,b)=>b.similarity-a.similarity||a.id-b.id);
  const index=ranked.findIndex(r=>r.id===humanSelectedId);
  if(index<0)return null;
  return {
    rank:index+1,total:ranked.length,similarity:ranked[index].similarity,
    bestName:ranked[0].name,
    scoreGap:Math.round((ranked[0].similarity-ranked[index].similarity)*1000)/1000,
  };
}
