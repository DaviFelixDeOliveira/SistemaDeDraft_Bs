import { expectedPickingTeam, type DraftAutoTeam } from './draftAutoProtocol';
import { allyStartsFromBanner, type DraftVisionBannerColour } from './draftAutoVision';

/**
 * Draft order, not a screenshot classification. Brawl Stars snake order:
 * first team gets pick 1; opposite team gets pick 6.
 */
export type DraftAutoOrderSummary = {
  first: DraftAutoTeam;
  last: DraftAutoTeam;
};
export function draftAutoOrderFromAnnouncement(
  bannerColour: DraftVisionBannerColour | null,
  ourColour: DraftVisionBannerColour | null,
): DraftAutoOrderSummary | null {
  const allyStarts = allyStartsFromBanner(bannerColour, ourColour);
  if (allyStarts === null) return null;
  const first = expectedPickingTeam(allyStarts,0);
  const last = expectedPickingTeam(allyStarts,5);
  if(!first||!last)return null;
  return {first,last};
}
