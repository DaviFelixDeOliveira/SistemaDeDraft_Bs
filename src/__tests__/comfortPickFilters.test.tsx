import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyBrawlerFilters, BrawlerFilterBar, type BrawlerFiltersState } from '../components/BrawlerFilters';
import type { Brawler } from '../types';

const mk = (id: string, name: string, tier: string, cls: string, rarity = 'Mítico') => ({
  id, name, tier, rarity, type: [cls], health: '1000',
  walksOnWater: false, breaksWalls: false
} satisfies Brawler);

const sample = [mk('a', 'Angelo', 'A', 'Tiro preciso'), mk('b', 'Brock', 'B', 'Dano'),
  mk('c', 'Vince', 'S', 'Dano')];

const filters = (overrides: Partial<BrawlerFiltersState> = {}): BrawlerFiltersState => ({
  search: '', setSearch: vi.fn(), tier: '', setTier: vi.fn(), brawlerClass: '',
  setBrawlerClass: vi.fn(), rarity: '', setRarity: vi.fn(), sortOrder: 'none',
  setSortOrder: vi.fn(), ...overrides
});

describe('Comfort Picks / BrawlerFilterBar', () => {
  it('busca um brawler pelo nome e respeita classe/tier combinados', () => {
    expect(applyBrawlerFilters(sample, filters({ search: 'vince' })).map(x => x.id)).toEqual(['c']);
    expect(applyBrawlerFilters(sample, filters({ brawlerClass: 'Dano', tier: 'S' })).map(x => x.id)).toEqual(['c']);
    expect(applyBrawlerFilters(sample, filters({ search: 'brock', tier: 'S' }))).toEqual([]);
  });

  it('não dispara envio de formulário ao clicar no botão de filtros', () => {
    const markup = renderToStaticMarkup(<BrawlerFilterBar filters={filters()} compact />);
    expect(markup).toContain('aria-label="Mostrar filtros de brawlers"');
    expect(markup).toContain('type="button"');
  });
});
