import { describe, expect, it } from 'vitest';
import { buildDraftHoldoutEvidence } from '../lib/draftAutoHoldoutExport';
import type { DraftHoldoutReport } from '../lib/draftAutoHoldout';

const fingerprint = { cells: Array.from({ length: 192 }, () => 120) };
const report: DraftHoldoutReport = {
  evaluated: 1, correct: 0, incorrect: 0, abstained: 1,
  memorized: 0, accuracy: 0, coverage: 0,
};

describe('Exportação local de evidência de reconhecimento', () => {
  it('contém exemplos, rótulos independentes e recortes faciais para reprodução', () => {
    const data = buildDraftHoldoutEvidence([
      {
        slot: 'blue-2', actual: 16000001, portrait: fingerprint,
        faceDataUrl: 'data:image/png;base64,abc',
        localMatch: {
          status: 'unknown', name: null, brawlerId: null,
          closestName: 'Mina', similarity: 0.95, margin: 0.17,
        },
        catalogMatch: null,
        emptyState: 'unknown',
      },
    ], [{ brawlerId: 16000001, name: 'Mina', fingerprint }],
      report, '2026-10-29T12:00:00.000Z');
    expect(data).toMatchObject({
      format: 'draft-auto-holdout-diagnostic',
      report: { evaluated: 1 },
      referenceFingerprints: [{ name: 'Mina' }],
      samples: [{
        slot: 'blue-2', actual: 16000001,
        localMatch: { closestName: 'Mina', status: 'unknown', similarity: 0.95 },
        faceDataUrl: 'data:image/png;base64,abc',
      }],
    });
    expect(JSON.stringify(data)).not.toContain('screenshotUrl');
    expect(JSON.stringify(data)).not.toContain('playerName');
  });

  it('copia as assinaturas sem alterar exemplos locais', () => {
    const data = buildDraftHoldoutEvidence([], [
      { brawlerId: 16000001, name: 'Mina', fingerprint },
    ], report, '2026-10-29T12:00:00.000Z');
    data.referenceFingerprints[0].fingerprint.cells[0] = 33;
    expect(fingerprint.cells[0]).toBe(120);
  });
});
