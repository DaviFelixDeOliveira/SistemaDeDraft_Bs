import { describe, expect, it } from 'vitest';
import { fromDbTeam, toDbTeam } from '../lib/utils';

describe('Nomenclatura neutra do lado aliado no draft', () => {
  it('preserva o valor de banco existente para a nossa equipe', () => {
    expect(toDbTeam('ally')).toBe('nos');
    expect(fromDbTeam('nos')).toBe('ally');
  });

  it('preserva o valor existente para a equipe inimiga', () => {
    expect(toDbTeam('enemy')).toBe('inimigo');
    expect(fromDbTeam('inimigo')).toBe('enemy');
  });
});
