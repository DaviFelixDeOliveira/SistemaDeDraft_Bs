import type { DraftPortraitFingerprint } from './draftAutoPortraitIdentity';
import type { DraftLearnedPortrait, DraftLearnedMatch } from './draftAutoLearnedPortrait';
import type { DraftHoldoutReport } from './draftAutoHoldout';

export type DraftHoldoutExportSample = {
  slot: string;
  actual: number | 'empty';
  portrait: DraftPortraitFingerprint;
  /** Cropped portrait only, not the original screenshot or player name. */
  faceDataUrl: string;
  localMatch: DraftLearnedMatch | null;
  catalogMatch: {
    name: string | null;
    gameId: number | null;
    similarity: number;
    margin: number;
    status: string;
  } | null;
  emptyState: string;
};

/**
 * Explicit local download for investigating failures on unseen screenshots.
 * No network, persistence, or automatic training. Do not include original
 * screenshots, player names, room codes, or other draft session data.
 */
export function buildDraftHoldoutEvidence(
  samples: readonly DraftHoldoutExportSample[],
  references: readonly DraftLearnedPortrait[],
  report: DraftHoldoutReport,
  createdAt: string,
) {
  return {
    version: 1 as const,
    format: 'draft-auto-holdout-diagnostic' as const,
    generatedAt: createdAt,
    report: { ...report },
    referenceFingerprints: references.map(ref => ({
      brawlerId: ref.brawlerId,
      name: ref.name,
      fingerprint: { cells: [...ref.fingerprint.cells] },
    })),
    samples: samples.map(sample => ({
      slot: sample.slot,
      actual: sample.actual,
      fingerprint: { cells: [...sample.portrait.cells] },
      faceDataUrl: sample.faceDataUrl,
      localMatch: sample.localMatch ? { ...sample.localMatch } : null,
      catalogMatch: sample.catalogMatch ? { ...sample.catalogMatch } : null,
      emptyState: sample.emptyState,
    })),
  };
}
