/** Checks screenshot inputs before they are ever rendered or sent anywhere. */
export const DRAFT_FRAME_LIMIT_BYTES = 10 * 1024 * 1024;
export const DRAFT_FRAME_MAX_PIXELS = 24_000_000;
export const DRAFT_FRAME_ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export interface FrameMetadata {
  width: number;
  height: number;
  orientation: 'paisagem' | 'retrato' | 'quadrado';
  megapixels: number;
}

export function validateDraftFrame(mime: string, bytes: number): string | null {
  if (!DRAFT_FRAME_ALLOWED_MIMES.includes(mime as typeof DRAFT_FRAME_ALLOWED_MIMES[number]))
    return 'Escolha uma imagem PNG, JPEG ou WebP. Outros formatos não são aceitos.';
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > DRAFT_FRAME_LIMIT_BYTES)
    return 'O arquivo precisa ter entre 1 byte e 10 MB.';
  return null;
}

export function describeDraftFrame(width: number, height: number): FrameMetadata {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 200 || height < 200 || width * height > DRAFT_FRAME_MAX_PIXELS) {
    throw new Error('A imagem precisa ter pelo menos 200 px por lado e no máximo 24 megapixels.');
  }
  return {
    width, height,
    orientation: width > height ? 'paisagem' : height > width ? 'retrato' : 'quadrado',
    megapixels: Math.round(width * height / 10_000) / 100,
  };
}

export type FrameArea = 'completa' | 'superior' | 'central' | 'inferior';

export function draftFrameCrop(width: number, height: number, area: FrameArea) {
  // Crops retain full width; proportions are only a user-controlled view.
  // Neither these coordinates nor geometry represent detected map/pick/ban.
  const fractions = area === 'superior' ? [0, 0.4]
    : area === 'central' ? [0.3, 0.7]
    : area === 'inferior' ? [0.6, 1] : [0, 1];
  const y = Math.floor(fractions[0] * height);
  const lower = Math.ceil(fractions[1] * height);
  return { x: 0, y, width, height: lower - y };
}
