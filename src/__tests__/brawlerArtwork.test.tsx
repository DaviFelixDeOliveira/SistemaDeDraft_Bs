import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrawlerArtwork } from '../components/ui/BrawlerArtwork';

describe('BrawlerArtwork', () => {
  it('mostra um substituto legível quando ainda não há retrato', () => {
    const html = renderToStaticMarkup(<BrawlerArtwork name="Vince" large />);
    expect(html).toContain('aria-label="Vince"');
    expect(html).toContain('VI');
    expect(html).not.toContain('<img');
    expect(html).toContain('Imagem do brawler ainda indisponível na fonte');
  });

  it('mantém o substituto desenhado por trás da imagem enquanto carrega', () => {
    const html = renderToStaticMarkup(
      <BrawlerArtwork name="Cosmo"
        iconUrl="https://cdn.brawlify.com/brawlers/borders/16000109.png"
        imageUrl="https://cdn.brawlify.com/brawlers/borderless/16000109.png" />
    );
    expect(html).toContain('CO');
    expect(html).toContain('aria-label="Cosmo"');
    expect(html).toContain('<img');
    expect(html).toContain('borders/16000109.png');
  });
});
