import { describe, it, expect } from 'vitest';
import { getModeFit } from '../lib/draftEngineUtils';
import { Brawler } from '../types';

const mockBrawler = (overrides: Partial<Brawler>): Brawler => ({
  id: 'b1',
  name: 'Test Brawler',
  rarity: 'Super Raro',
  tier: 'B',
  health: 'Média',
  type: ['Controle'],
  walksOnWater: false,
  breaksWalls: false,
  ...overrides,
});

describe('getModeFit - Encaixe de Brawler por Modo de Jogo', () => {
  it('retorna "good" para Tanque com quebra de parede em Roubo', () => {
    const brawler = mockBrawler({ type: ['Tanque'], breaksWalls: true });
    expect(getModeFit(brawler, 'Roubo')).toBe('good');
  });

  it('retorna "poor" para Suporte puro em Roubo', () => {
    const brawler = mockBrawler({ type: ['Suporte'] });
    expect(getModeFit(brawler, 'Roubo')).toBe('poor');
  });

  it('retorna "good" para Tiro preciso em Caça-Estrelas', () => {
    const brawler = mockBrawler({ type: ['Tiro preciso'] });
    expect(getModeFit(brawler, 'Caça-Estrelas')).toBe('good');
  });

  it('retorna "poor" para Tanque de saúde Alta sem alcance em Caça-Estrelas', () => {
    const brawler = mockBrawler({ type: ['Tanque'], health: 'Alta' });
    expect(getModeFit(brawler, 'Caça-Estrelas')).toBe('poor');
  });

  it('retorna "good" para Controle em Zona Estratégica', () => {
    const brawler = mockBrawler({ type: ['Controle'] });
    expect(getModeFit(brawler, 'Zona Estratégica')).toBe('good');
  });

  it('retorna "good" para Tanque ou brawler que quebra parede em Fute-Brawl', () => {
    const brawler = mockBrawler({ type: ['Tanque'] });
    expect(getModeFit(brawler, 'Fute-Brawl')).toBe('good');
  });

  it('retorna "poor" para Tiro preciso puro sem quebrar parede em Fute-Brawl', () => {
    const brawler = mockBrawler({ type: ['Tiro preciso'], breaksWalls: false });
    expect(getModeFit(brawler, 'Fute-Brawl')).toBe('poor');
  });

  it('retorna "good" para Algoz em Nocaute', () => {
    const brawler = mockBrawler({ type: ['Algoz'] });
    expect(getModeFit(brawler, 'Nocaute')).toBe('good');
  });

  it('retorna "good" para Controle ou Suporte em Pique-Gema', () => {
    const brawler = mockBrawler({ type: ['Suporte'] });
    expect(getModeFit(brawler, 'Pique-Gema')).toBe('good');
  });
});
