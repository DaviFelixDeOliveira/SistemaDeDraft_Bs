/**
 * Identificador público e estável da equipe.
 * Estes helpers não validam credenciais e não autorizam acesso ao banco.
 */
export const INTERNAL_TEAM_EMAIL_DOMAIN = 'teams.sistema-de-draft.invalid';

export function normalizeTeamUsername(input: string): string {
  return input.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function isValidTeamUsername(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,30}[a-z0-9]$/.test(value);
}

/**
 * Identificador experimental para fluxo Supabase Auth email+password.
 * A estrategia depende de validacao real da API, nao deve ser lancada
 * sem testar e projetar recuperacao de conta.
 */
export function getInternalTeamEmail(username: string): string {
  if (!isValidTeamUsername(username)) throw new Error('O nome deve gerar um identificador de 4 a 32 caracteres.');
  return username + '@' + INTERNAL_TEAM_EMAIL_DOMAIN;
}
