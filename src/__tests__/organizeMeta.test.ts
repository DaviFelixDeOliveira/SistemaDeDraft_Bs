import { describe, expect, it } from 'vitest';
import { findMetaCandidates, metaTierCounts } from '../components/brawlers/OrganizeMetaModal';
import type { Brawler } from '../types';

const brawler = (id: string, name: string, tier: string): Brawler => ({
  id, name, tier, rarity: 'Mítico', health: '0', type: ['Dano'],
  walksOnWater: false, breaksWalls: false
});

const roster = [
  brawler('gus', 'Gus', 'S'),
  brawler('mortis', 'Mortis', 'A'),
  brawler('piper', 'Piper', 'B'),
  brawler('otis', 'Otis', 'A'),
  brawler('nita', 'Nita', 'D'),
];

describe('Organizar Meta por equipe', () => {
  it('conta brawlers por tier sem modificar o catálogo', () => {
    expect(metaTierCounts(roster)).toEqual({ S: 1, A: 2, B: 1, C: 0, D: 1 });
    expect(roster[0].tier).toBe('S');
  });

  it('busca por nome ao escolher um tier', () => {
    expect(findMetaCandidates(roster, 'Mortis', 'S').map(b => b.id)).toEqual(['mortis']);
    expect(findMetaCandidates(roster, 'Otis', 'S').map(b => b.id)).toEqual(['otis']);
    expect(findMetaCandidates(roster, 'XXXX', 'S')).toEqual([]);
  });

  it('deixa membros do tier escolhido no fim como já classificados', () => {
    const ordered = findMetaCandidates(roster, '', 'A');
    expect(ordered.slice(-2).map(b => b.name)).toEqual(['Mortis', 'Otis']);
  });

  it('não muda um tier sem confirmação explícita', () => {
    findMetaCandidates(roster, 'Gus', 'A');
    expect(roster.find(b => b.id === 'gus')?.tier).toBe('S');
  });

  it('não confunde nomes de brawlers com diferentes raridades', () => {
    const same = [...roster, { ...brawler('other', 'Gus', 'C'), rarity: 'Lendário' }];
    expect(findMetaCandidates(same, 'Gus', 'B')).toHaveLength(2);
  });
});
