import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { normalizeTeamUsername, isValidTeamUsername, getInternalTeamEmail, INTERNAL_TEAM_EMAIL_DOMAIN } from '../lib/teamIdentity';
export { normalizeTeamUsername, isValidTeamUsername, getInternalTeamEmail } from '../lib/teamIdentity';

/**
 * Identidade técnica do Supabase Auth, invisível para o usuário.
 * O Supabase Auth autentica com email/senha; usamos um identificador sintético.
 *
 * Importante: cadastro sem email exige confirmação de email DESATIVADA no projeto.
 * A aplicação deve implementar recuperação segura antes do lançamento público.
 */
export interface TeamAccount {
  id: string;
  username: string;
  displayName: string;
}

/** Metadados são apenas para exibição, nunca para autorizar acesso a dados. */
export function userToTeam(user: User | null): TeamAccount | null {
  if (!user || !user.email?.endsWith('@' + INTERNAL_TEAM_EMAIL_DOMAIN)) return null;
  const username = user.email.slice(0, -('@' + INTERNAL_TEAM_EMAIL_DOMAIN).length);
  if (!isValidTeamUsername(username)) return null;
  const rawName = user.user_metadata?.team_display_name;
  return {
    id: user.id,
    username,
    displayName: typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 60) : username,
  };
}

export const teamAuthService = {
  async current(): Promise<TeamAccount | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return userToTeam(data.user);
  },

  async login(teamName: string, password: string): Promise<TeamAccount> {
    const username = normalizeTeamUsername(teamName);
    if (!isValidTeamUsername(username)) throw new Error('Nome de equipe inválido.');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: getInternalTeamEmail(username),
      password,
    });
    if (error || !data.session) throw new Error('Nome da equipe ou senha incorretos.');
    const team = userToTeam(data.user);
    if (!team) {
      await supabase.auth.signOut();
      throw new Error('Esta conta não é uma equipe válida.');
    }
    return team;
  },

  async register(teamName: string, password: string): Promise<TeamAccount> {
    // Cadastro bloqueado até testes da autenticação, ativação do RLS e isolamento por equipe.
    if (import.meta.env.VITE_ENABLE_TEAM_SIGNUP !== 'true') {
      throw new Error('O cadastro de equipes ainda está em preparação. Não foi liberado neste ambiente.');
    }
    const displayName = teamName.trim().replace(/\s+/g, ' ');
    const username = normalizeTeamUsername(displayName);
    if (displayName.length < 3 || displayName.length > 60 || !isValidTeamUsername(username)) {
      throw new Error('Informe um nome com 3 a 60 caracteres. Use letras ou números.');
    }
    if (password.length < 12) throw new Error('A senha deve ter pelo menos 12 caracteres.');
    if (password.length > 128) throw new Error('A senha deve ter até 128 caracteres.');

    const { data, error } = await supabase.auth.signUp({
      email: getInternalTeamEmail(username),
      password,
      options: { data: { team_display_name: displayName } },
    });
    if (error) {
      if (/already registered|already been registered|user already exists/i.test(error.message)) {
        throw new Error('Já existe uma equipe com esse nome. Escolha outro.');
      }
      throw new Error('Não foi possível cadastrar esta equipe. Confira a configuração do Supabase.');
    }
    if (!data.session || !data.user) {
      throw new Error('Cadastro pendente: a confirmação de e-mail deve ser desativada no Supabase para contas sem e-mail.');
    }
    const team = userToTeam(data.user);
    if (!team) throw new Error('Não foi possível validar a equipe cadastrada.');
    return team;
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
