import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrawlerArtwork, getBrawlerArtworkSources } from '../components/ui/BrawlerArtwork';

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
  it('mantém URL original como primeira opção e tenta a BSInfo se ela falhar', () => {
    const sources = getBrawlerArtworkSources(
      'https://cdn.brawlify.com/brawlers/borders/16000110.png',
      'https://cdn.brawlify.com/brawlers/borderless/16000110.png'
    );
    expect(sources[0]).toContain('cdn.brawlify.com/brawlers/borders/16000110.png');
    expect(sources).toContain('https://cdn.bsinfox.com/brawlers/border/16000110.png');
    expect(sources).toContain('https://raw.githubusercontent.com/lot-xq/BSInfo-CDN/main/brawlers/border/16000110.png');
  });

  it('usa retrato como primeira opção no card maior e não duplica URLs', () => {
    const sources = getBrawlerArtworkSources(
      'https://cdn.bsinfox.com/brawlers/portrait/16000110.png',
      'https://cdn.bsinfox.com/brawlers/portrait/16000110.png',
      true
    );
    expect(sources[0]).toBe('https://cdn.bsinfox.com/brawlers/portrait/16000110.png');
    expect(sources.length).toBe(new Set(sources).size);
  });

  it('não inventa caminhos para imagens que não possuam ID confiável', () => {
    const sources = getBrawlerArtworkSources('https://example.org/brawler/unknown.png');
    expect(sources).toEqual(['https://example.org/brawler/unknown.png']);
  });

});
