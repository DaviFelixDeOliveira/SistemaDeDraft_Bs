/**
 * Conservative first-pick announcement detector for full Brawl Stars screenshots.
 *
 * This detects only the large BLUE TEAM STARTS / RED TEAM STARTS coloured
 * central banner, never identifies brawlers, bans, maps or team identities.
 * The caller must ask the player which screen colour belongs to their team.
 *
 * Geometry is normalized for screenshots with letterboxing. If a screenshot
 * does not match the supported arrangement, abstain instead of guessing.
 */

export type DraftVisionBannerColour = 'blue' | 'red';
export type DraftVisionResult = {
  kind: 'first-pick-announcement' | 'unknown';
  startingColour: DraftVisionBannerColour | null;
  evidence: { redShare: number; blueShare: number; baselineRedShare: number; baselineBlueShare: number };
  explanation: string;
};

type PixelFrame = Pick<ImageData, 'data' | 'width' | 'height'>;

function share(frame: PixelFrame, x0: number, x1: number, y0: number, y1: number) {
  const { data, width, height } = frame;
  let count = 0, reds = 0, blues = 0;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 150));
  for (let y = Math.floor(y0 * height); y < Math.floor(y1 * height); y += step) {
    for (let x = Math.floor(x0 * width); x < Math.floor(x1 * width); x += step) {
      const index = (y * width + x) * 4;
      const r = data[index], g = data[index + 1], b = data[index + 2], a = data[index + 3];
      if (a < 200) continue;
      count++;
      if (r > 150 && r > g * 1.55 && r > b * 1.3 && r - g > 50) reds++;
      if (b > 145 && b > r * 1.3 && b > g * 1.07 && b - r > 50) blues++;
    }
  }
  return { red: count ? reds / count : 0, blue: count ? blues / count : 0 };
}

/**
 * No claims of calibrated ML confidence. The fractions expose the actual
 * pixel evidence so it can later be compared against labeled screenshots.
 */
export function detectFirstPickAnnouncement(frame: PixelFrame): DraftVisionResult {
  const empty = { redShare: 0, blueShare: 0, baselineRedShare: 0, baselineBlueShare: 0 };
  if (!frame || !Number.isInteger(frame.width) || !Number.isInteger(frame.height) ||
      frame.width < 300 || frame.height < 200 ||
      frame.data.length !== frame.width * frame.height * 4) {
    return { kind: 'unknown', startingColour: null, evidence: empty, explanation: 'Imagem com resolução ou dados inválidos.' };
  }

  // Based on the supplied full-frame announcement examples (1920x1080).
  // The banner occupies the central middle band, whereas the upper reference
  // area is dark. This contrast guards against the red/blue PICK background.
  const banner = share(frame, 0.23, 0.68, 0.34, 0.44);
  const baseline = share(frame, 0.23, 0.68, 0.22, 0.28);
  const evidence = {
    redShare: Math.round(banner.red * 100) / 100,
    blueShare: Math.round(banner.blue * 100) / 100,
    baselineRedShare: Math.round(baseline.red * 100) / 100,
    baselineBlueShare: Math.round(baseline.blue * 100) / 100,
  };
  const redDetected = banner.red >= 0.42 && baseline.red <= 0.10 &&
    banner.red > banner.blue + 0.30 && banner.red - baseline.red >= 0.35;
  const blueDetected = banner.blue >= 0.42 && baseline.blue <= 0.10 &&
    banner.blue > banner.red + 0.30 && banner.blue - baseline.blue >= 0.35;

  if (redDetected !== blueDetected) {
    const startingColour = redDetected ? 'red' : 'blue';
    return {
      kind: 'first-pick-announcement', startingColour, evidence,
      explanation: `Faixa central ${startingColour === 'red' ? 'vermelha' : 'azul'} identificada. Resultado experimental: confirme antes de enviar.`,
    };
  }
  return {
    kind: 'unknown', startingColour: null, evidence,
    explanation: 'O padrão visual da faixa de início não foi identificado com segurança nesta imagem. Não será enviado nenhum palpite.',
  };
}

export function allyStartsFromBanner(
  startingColour: DraftVisionBannerColour | null,
  allyColour: DraftVisionBannerColour | null,
): boolean | null {
  if (!startingColour || !allyColour) return null;
  return startingColour === allyColour;
}
