import { describe, expect, it } from 'vitest';
import { describeDraftFrame, draftFrameCrop, validateDraftFrame } from '../lib/draftAutoFrame';

describe('Preparação local de capturas para treinamento do reconhecimento', () => {
  it('aceita apenas formatos comuns e tamanho limitado', () => {
    expect(validateDraftFrame('image/png', 100_000)).toBeNull();
    expect(validateDraftFrame('image/jpeg', 10 * 1024 * 1024)).toBeNull();
    expect(validateDraftFrame('image/svg+xml', 1024)).not.toBeNull();
    expect(validateDraftFrame('image/png', 0)).not.toBeNull();
    expect(validateDraftFrame('image/png', 11 * 1024 * 1024)).not.toBeNull();
  });
  it('descreve orientação, resolução e rejeita imagens enormes', () => {
    expect(describeDraftFrame(1920, 1080)).toEqual({
      width: 1920, height: 1080, orientation: 'paisagem', megapixels: 2.07,
    });
    expect(describeDraftFrame(1080, 1920).orientation).toBe('retrato');
    expect(() => describeDraftFrame(10_000, 10_000)).toThrow();
    expect(() => describeDraftFrame(0, 0)).toThrow();
  });
  it('gera recortes consistentes sem alegar reconhecimento visual', () => {
    expect(draftFrameCrop(1200, 800, 'completa')).toEqual({ x:0,y:0,width:1200,height:800 });
    expect(draftFrameCrop(1200, 800, 'superior')).toEqual({ x:0,y:0,width:1200,height:320 });
    expect(draftFrameCrop(1200, 800, 'central')).toEqual({ x:0,y:240,width:1200,height:320 });
    expect(draftFrameCrop(1200, 800, 'inferior')).toEqual({ x:0,y:480,width:1200,height:320 });
  });
});
