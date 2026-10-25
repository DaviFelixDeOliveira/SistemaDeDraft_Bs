import { describe, expect, it } from 'vitest';
import { allyStartsFromBanner, detectFirstPickAnnouncement } from '../lib/draftAutoVision';

function imageFrame(banner: 'red' | 'blue' | 'none', background: 'gray' | 'red' | 'blue' = 'gray') {
  const width = 500, height = 300;
  const data = new Uint8ClampedArray(width * height * 4);
  const fill = background === 'red' ? [220, 35, 35] : background === 'blue' ? [30, 105, 235] : [23, 27, 38];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const inBanner = x >= width * 0.19 && x < width * 0.75 && y >= height * 0.32 && y < height * 0.47;
      const rgb = inBanner && banner !== 'none' ?
        (banner === 'red' ? [247, 34, 25] : [39, 104, 251]) : fill;
      data[p] = rgb[0]; data[p + 1] = rgb[1]; data[p + 2] = rgb[2]; data[p + 3] = 255;
    }
  }
  return {width,height,data};
}

describe('Detecção local conservadora da faixa de quem começa', () => {
  it('identifica azul como a equipe que começa, sem assumir que ela é aliada', () => {
    const r = detectFirstPickAnnouncement(imageFrame('blue'));
    expect(r.kind).toBe('first-pick-announcement');
    expect(r.startingColour).toBe('blue');
    expect(allyStartsFromBanner(r.startingColour,'blue')).toBe(true);
    expect(allyStartsFromBanner(r.startingColour,'red')).toBe(false);
    expect(allyStartsFromBanner(r.startingColour,null)).toBeNull();
  });
  it('identifica faixa vermelha com fundo neutro', () => {
    expect(detectFirstPickAnnouncement(imageFrame('red')).startingColour).toBe('red');
  });
  it('não confunde cara ou coroa sem faixa com uma escolha já realizada', () => {
    expect(detectFirstPickAnnouncement(imageFrame('none')).kind).toBe('unknown');
  });
  it('não confunde fundo todo vermelho/azul da fase de picks com faixa de anúncio', () => {
    expect(detectFirstPickAnnouncement(imageFrame('none','red')).kind).toBe('unknown');
    expect(detectFirstPickAnnouncement(imageFrame('none','blue')).kind).toBe('unknown');
  });
  it('não inventa eventos para frames inválidos', () => {
    expect(detectFirstPickAnnouncement({width:500,height:300,data:new Uint8ClampedArray(10)}).kind).toBe('unknown');
  });
});
