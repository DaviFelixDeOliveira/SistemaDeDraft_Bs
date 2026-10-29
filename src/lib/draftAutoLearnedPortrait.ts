import { portraitSimilarity, type DraftPortraitFingerprint } from './draftAutoPortraitIdentity';

/**
 * Opt-in examples manually labeled from screenshots of the actual game.
 * Store ONLY the 8x8 color descriptor in the browser, never the screenshot.
 * No learned identity is proof of a confirmed pick or ban.
 */
export const DRAFT_LOCAL_PORTRAITS_KEY = 'draft-auto-local-game-portraits-v1';

export type DraftLearnedPortrait = {
  brawlerId: number;
  name: string;
  fingerprint: DraftPortraitFingerprint;
};

function validFingerprint(fp: DraftPortraitFingerprint | undefined): boolean {
  return Array.isArray(fp?.cells) && fp.cells.length === 192 &&
    fp.cells.every(value => Number.isInteger(value) && value >= 0 && value <= 255);
}

function validExample(value: unknown): value is DraftLearnedPortrait {
  if (!value || typeof value !== 'object') return false;
  const example = value as Partial<DraftLearnedPortrait>;
  return Number.isInteger(example.brawlerId) &&
    example.brawlerId! >= 16000000 && example.brawlerId! <= 16099999 &&
    typeof example.name === 'string' && example.name.trim().length >= 2 &&
    example.name.length <= 60 && validFingerprint(example.fingerprint);
}

export function parseDraftLearnedPortraits(value: unknown): DraftLearnedPortrait[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-400).filter(validExample).map(example => ({
    brawlerId: example.brawlerId,
    name: example.name.trim(),
    fingerprint: { cells: [...example.fingerprint.cells] },
  }));
}

/** Keep up to six different screenshots per brawler and 400 total. */
export function addDraftLearnedPortrait(
  previous: DraftLearnedPortrait[], example: DraftLearnedPortrait,
): DraftLearnedPortrait[] {
  if (!validExample(example)) return parseDraftLearnedPortraits(previous);
  const clean = parseDraftLearnedPortraits(previous);
  // Two nearly identical captures of the same default portrait should not
  // consume separate reference slots. Keep visually distinct variants (e.g.
  // an occasional alternate Colt portrait) under the same brawler ID.
  // Similarity is rounded to 0.001; this is deduplication, NOT confidence.
  const duplicate = clean.some(item => item.brawlerId === example.brawlerId &&
    (portraitSimilarity(item.fingerprint, example.fingerprint) ?? 0) >= .995);
  if (duplicate) return clean;
  const otherExamples = clean.filter(item => item.brawlerId !== example.brawlerId);
  const sameBrawler = clean.filter(item => item.brawlerId === example.brawlerId).slice(-5);
  return [...otherExamples, ...sameBrawler, {
    brawlerId: example.brawlerId,
    name: example.name.trim(),
    fingerprint: { cells: [...example.fingerprint.cells] },
  }].slice(-400);
}

export type DraftLearnedMatch = {
  status: 'possible' | 'unknown' | 'seen-example';
  name: string | null;
  brawlerId: number | null;
  similarity: number;
  margin: number;
  /** Diagnostic-only nearest neighbor, even when thresholds reject a prediction. */
  closestName: string | null;
};

/** Cautious nearest example: at least two distinct labels and a clear winner. */
export function matchDraftLearnedPortrait(
  target: DraftPortraitFingerprint, references: DraftLearnedPortrait[],
): DraftLearnedMatch {
  const blank = (similarity = 0, margin = 0, closestName: string | null = null): DraftLearnedMatch =>
    ({ status: 'unknown', name: null, brawlerId: null, similarity, margin, closestName });
  if (!validFingerprint(target)) return blank();
  const byId = new Map<number, { id: number; name: string; score: number }>();
  for (const ref of parseDraftLearnedPortraits(references)) {
    const score = portraitSimilarity(target, ref.fingerprint);
    if (score === null) continue;
    if (score > (byId.get(ref.brawlerId)?.score ?? -1)) {
      byId.set(ref.brawlerId, { id: ref.brawlerId, name: ref.name, score });
    }
  }
  if (byId.size < 2) return blank();
  const ranked = [...byId.values()].sort((a, b) => b.score - a.score);
  const best = ranked[0], runnerUp = ranked[1];
  const margin = Math.round((best.score - runnerUp.score) * 1000) / 1000;
  if (best.score < .96 || margin < .04) return blank(best.score, margin, best.name);
  // An exact fingerprint is a remembered training example, not an
  // independent recognition success on unseen game imagery.
  if (best.score === 1) return {
    status: 'seen-example', name: best.name, brawlerId: best.id,
    similarity: best.score, margin, closestName: best.name,
  };
  return {
    status: 'possible', name: best.name, brawlerId: best.id,
    similarity: best.score, margin, closestName: best.name,
  };
}
