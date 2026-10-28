/**
 * Assess screenshots never used for teaching. A prediction on an exact
 * training example is excluded, not counted as an identification success.
 * No sample, label, or image is persisted by this evaluator.
 */
export type DraftHoldoutObservation = {
  actual: number | 'empty';
  predicted: number | 'empty' | null;
  memorized: boolean;
};

export type DraftHoldoutReport = {
  evaluated: number;
  correct: number;
  incorrect: number;
  abstained: number;
  memorized: number;
  accuracy: number | null;
  coverage: number | null;
};

export function evaluateDraftHoldout(
  observations: DraftHoldoutObservation[],
): DraftHoldoutReport {
  let correct=0,incorrect=0,abstained=0,memorized=0;
  for (const sample of observations) {
    if (sample.memorized) { memorized++; continue; }
    if (sample.predicted===null) { abstained++; continue; }
    if (sample.actual===sample.predicted) correct++;
    else incorrect++;
  }
  const evaluated=correct+incorrect+abstained;
  return {
    evaluated,correct,incorrect,abstained,memorized,
    // Accuracy = correct / all independently labeled examples,
    // counting abstentions as not yet solved.
    accuracy:evaluated?correct/evaluated:null,
    coverage:evaluated?(correct+incorrect)/evaluated:null,
  };
}
