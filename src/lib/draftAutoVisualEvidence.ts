/**
 * First visual gate for a CROPPED individual bottom draft slot.
 *
 * A red no-entry icon may indicate a confirmed ban; a green tick may indicate
 * a confirmed pick. These are colour-evidence candidates, NOT verified
 * decisions. This utility cannot identify the brawler, team, player, phase,
 * or whether the supplied crop actually contains a full game slot.
 *
 * Do not create an event or assign fabricated confidence based on its output.
 */
export type SlotMarkerKind = 'ban' | 'pick';
export type SlotMarkerEvidence =
  | { status: 'candidate'; marker: SlotMarkerKind; redShare: number; greenShare: number }
  | { status: 'unknown'; reason: string; redShare: number; greenShare: number };

export type SlotPixelFrame = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

/**
 * Measured against the individual slot examples supplied by the user. Input
 * must already be tightly cropped to ONE complete card. This does NOT locate
 * cards in screenshots and is NOT a trained brawler/image classifier.
 */
export function inspectSlotMarker(frame: SlotPixelFrame): SlotMarkerEvidence {
  const unknown = (reason: string, redShare = 0, greenShare = 0): SlotMarkerEvidence =>
    ({ status: 'unknown', reason, redShare, greenShare });
  if (!Number.isSafeInteger(frame?.width) || !Number.isSafeInteger(frame?.height) ||
    frame.width < 64 || frame.height < 64 ||
    frame.width * frame.height > 24_000_000 ||
    frame.data?.length !== frame.width * frame.height * 4) {
    return unknown('Recorte inválido.');
  }
  // Bottom-right marker area, excluding the upper-right star power and
  // the bottom-left gadget/gear badges. Do not apply to whole screenshots.
  const left = Math.floor(frame.width * .72);
  const top = Math.floor(frame.height * .40);
  const bottom = Math.ceil(frame.height * .78);
  const step = Math.max(1, Math.floor(Math.min(frame.width,frame.height)/150));
  let pixels = 0, reds = 0, greens = 0;
  for (let y = top; y < bottom; y += step) {
    for (let x = left; x < frame.width; x += step) {
      const i = (y * frame.width + x) * 4;
      const [r,g,b,a] = frame.data.subarray(i, i+4);
      if (a < 200) continue;
      pixels++;
      if (r > 150 && r > g*1.55 && r > b*1.3 && r-g > 50) reds++;
      if (g > 110 && g > r*1.35 && g > b*1.15 && g-r > 45) greens++;
    }
  }
  if (pixels === 0) return unknown('Recorte sem pixels utilizáveis.');
  const redShare = Math.round(reds/pixels*1000)/1000;
  const greenShare = Math.round(greens/pixels*1000)/1000;
  const redEvidence = redShare >= .08;
  const greenEvidence = greenShare >= .05;
  if (redEvidence === greenEvidence) {
    return unknown(redEvidence
      ? 'Cores de ban e pick no mesmo recorte. Confirmação ambígua.'
      : 'Nenhum ícone de confirmação identificado. Pode ser pré-seleção, slot vazio ou imagem incompatível.',
      redShare,greenShare);
  }
  return {
    status:'candidate',
    marker:redEvidence?'ban':'pick',
    redShare,greenShare,
  };
}

/** No automatic event is ever authorized from colour evidence alone. */
export function hasVerifiedVisualDecision(
  marker: SlotMarkerEvidence,
  confirmedIdentityId: string | null,
  confirmedTeam: 'ally' | 'enemy' | null,
  confirmedSlot: number | null,
): boolean {
  return marker.status === 'candidate' && typeof confirmedIdentityId === 'string' &&
    confirmedIdentityId.length > 0 && confirmedTeam !== null &&
    confirmedSlot !== null && Number.isInteger(confirmedSlot) &&
    confirmedSlot >= 0 && confirmedSlot < (marker.marker === 'ban' ? 3 : 6);
}
