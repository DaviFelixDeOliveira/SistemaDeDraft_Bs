import { useEffect, useState } from 'react';
import {
  greenCheckSearchRect, inspectGreenCheckPresence,
} from '../../lib/draftAutoGreenCheck';
import type { DraftHudRegion } from '../../lib/draftAutoLayout';

type CheckSummary = {
  possible: string[];
  reviewed: number;
};

/**
 * One-image hints only. A visible green check could be from an EARLIER pick;
 * no new pick, player identity, brawler or event is inferred from this.
 */
export function DraftAutoSingleCheckLab({
  imageUrl, regions,
}: { imageUrl: string; regions: DraftHudRegion[] }) {
  const [summary, setSummary] = useState<CheckSummary | null>(null);

  useEffect(() => {
    let live = true;
    const image = new Image();
    setSummary(null);
    image.onload = () => {
      if (!live) return;
      try {
        const possible: string[] = [];
        let reviewed = 0;
        for (const region of regions) {
          const bounds = greenCheckSearchRect(
            region, image.naturalWidth, image.naturalHeight,
          );
          if (!bounds) continue;
          const canvas = document.createElement('canvas');
          canvas.width = 120;
          canvas.height = 96;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) continue;
          ctx.drawImage(image,
            bounds.x, bounds.y, bounds.width, bounds.height,
            0, 0, canvas.width, canvas.height);
          const result = inspectGreenCheckPresence(
            ctx.getImageData(0, 0, canvas.width, canvas.height),
          );
          if (result.status === 'unavailable') continue;
          reviewed++;
          if (result.status === 'possible-check-visible') possible.push(region.label);
        }
        if (live) setSummary({ possible, reviewed });
      } catch {
        if (live) setSummary(null);
      }
    };
    image.onerror = () => { if (live) setSummary(null); };
    image.src = imageUrl;
    return () => {
      live = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [imageUrl, regions]);

  if (!summary || !summary.reviewed) return null;
  return <p className="text-xs text-zinc-300">
    <strong>Checks verdes na imagem:</strong>{' '}
    {summary.possible.length
      ? `possíveis em ${summary.possible.join(', ')}`
      : 'nenhum formato reconhecido'}.
    {' '}Isso não confirma pick novo. Sem check também pode haver pré-seleção.
  </p>;
}
