import type { DraftSlotInterpretation } from './draftAutoSlotInterpretation';

export type DraftAutoBrawlerGuess = {
  status: 'possible' | 'empty' | 'unknown';
  name?: string;
} | null;

/**
 * Combine two independent weak signals without elevating either to a
 * game-verified decision. Never authorize event emission or apply a draft pick.
 */
export function reviewDraftAutoSlot(
  visual: DraftSlotInterpretation,
  catalog: DraftAutoBrawlerGuess,
): { stateLabel: string; brawlerLabel: string; requiresReview: true; conflict: boolean } {
  const conflict = visual.state === 'possible-pick' && catalog?.status === 'empty';
  let brawlerLabel = 'Brawler: não analisado';
  if (catalog) {
    if (catalog.status === 'empty') brawlerLabel = 'Brawler: slot possivelmente vazio';
    else if (catalog.status === 'possible' && catalog.name)
      brawlerLabel = `Brawler: talvez ${catalog.name} (não confirmado)`;
    else brawlerLabel = 'Brawler: não identificado';
  }
  return {
    stateLabel: conflict ? 'Sinais contraditórios — revisar' : visual.label,
    brawlerLabel,
    requiresReview: true,
    conflict,
  };
}
