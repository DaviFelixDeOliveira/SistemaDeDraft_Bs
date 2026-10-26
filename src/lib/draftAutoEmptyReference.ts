import { portraitSimilarity, type DraftPortraitFingerprint } from './draftAutoPortraitIdentity';
import type { DraftEmptySlotEvidence } from './draftAutoEmptySlot';

export type DraftEmptyCardSample = {
  portrait: DraftPortraitFingerprint;
  emptyEvidence: DraftEmptySlotEvidence;
};

export type DraftEmptyCardDecision = 'likely-empty' | 'similar-to-empty' | 'unknown';

/**
 * Second-pass abstaining check using two separately located empty-card
 * examples FROM THE SAME FRAME. A player portrait must never be labelled
 * empty by a nearest-neighbor result alone. This is diagnostic only.
 *
 * Requirement of two agreeing anchors avoids learning a dark skin as the
 * question-mark template from a single false positive.
 */
export function corroborateDraftEmptyCards(
  samples: Record<string, DraftEmptyCardSample>,
): Record<string, DraftEmptyCardDecision> {
  const entries=Object.entries(samples);
  const seedEntries=entries.filter(([,sample])=>sample.emptyEvidence.status==='likely-empty');
  const corroborated=seedEntries.filter(([id,seed])=>seedEntries.some(([otherId,other])=>
    id!==otherId&&(portraitSimilarity(seed.portrait,other.portrait)??0)>=.90));
  const results:Record<string,DraftEmptyCardDecision>={};

  for(const [id,sample] of entries){
    if(sample.emptyEvidence.status==='likely-empty'){
      results[id]='likely-empty';
      continue;
    }
    const e=sample.emptyEvidence;
    const close=corroborated.filter(([seedId,anchor])=>
      seedId!==id&&(portraitSimilarity(sample.portrait,anchor.portrait)??0)>=.90);
    // Also require the candidate's own pixels to resemble the dark purple
    // placeholder; do not mark colorful/dark characters just because they
    // happen to share some colors with a reference.
    const plausible=e.purpleShare>=.55&&e.darkShare>=.86&&
      e.luminanceSpread>=8&&e.luminanceSpread<=48;
    results[id]=plausible&&close.length>=2?'similar-to-empty':'unknown';
  }
  return results;
}
