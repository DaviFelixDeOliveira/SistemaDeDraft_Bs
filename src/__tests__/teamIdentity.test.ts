import { describe, it, expect } from 'vitest';
import { getInternalTeamEmail, isValidTeamUsername, normalizeTeamUsername } from '../lib/teamIdentity';

describe('Identidade normalizada das equipes', () => {
  it('normaliza acentos, espaços e caracteres especiais', () => {
    expect(normalizeTeamUsername('  Fênix Esports  ')).toBe('fenix-esports');
    expect(normalizeTeamUsername('Equipe__XP!')).toBe('equipe-xp');
  });

  it('rejeita nomes curtos e identificadores malformados', () => {
    for (const invalid of ['a', 'ab', 'abc', '-minha-equipe', 'equipe-', 'equipe@email.com']) {
      expect(isValidTeamUsername(invalid)).toBe(false);
    }
    expect(isValidTeamUsername('time-01')).toBe(true);
    expect(isValidTeamUsername('abcd')).toBe(true);
    expect(isValidTeamUsername('x'.repeat(33))).toBe(false);
  });

  it('converte um identificador válido para o endereço interno usado pelo Auth', () => {
    expect(getInternalTeamEmail('fenix-esports')).toBe('fenix-esports@teams.sistema-de-draft.invalid');
    expect(() => getInternalTeamEmail('')).toThrow();
  });
});
