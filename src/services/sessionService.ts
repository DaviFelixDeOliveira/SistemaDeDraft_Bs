import { supabase } from '../lib/supabase';
import { TrainingSession } from '../types';

export type { TrainingSession };

const STORAGE_KEY = 'tbk_training_sessions';

// ── Helpers de cache local ──────────────────────────────────────────────────

function getLocalSessions(): TrainingSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: TrainingSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Erro ao salvar sessões no localStorage:', e);
  }
}

// ── Serviço principal ───────────────────────────────────────────────────────

export const sessionService = {
  /**
   * Busca todas as sessões do Supabase como FONTE DA VERDADE.
   * Atualiza o cache local com os dados reais do banco.
   */
  getSessions: async (): Promise<TrainingSession[]> => {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .order('start_date', { ascending: false });

      if (!error && data) {
        saveLocalSessions(data);
        return data;
      }
    } catch (err) {
      console.warn('Erro ao buscar sessões do Supabase, usando local:', err);
    }
    return getLocalSessions();
  },

  /**
   * Retorna a sessão ativa (em andamento) a partir do cache local (síncrono).
   */
  getActiveSession: (): TrainingSession | null => {
    const sessions = getLocalSessions();
    return sessions.find(s => s.end_date === null) || null;
  },

  /**
   * Consulta o Supabase como FONTE DA VERDADE para saber se há sessão ativa.
   * Auto-corrige o cache local se houver divergência entre banco e localStorage.
   */
  fetchActiveSession: async (): Promise<TrainingSession | null> => {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .is('end_date', null)
        .order('start_date', { ascending: false })
        .limit(1);

      if (!error) {
        if (data && data.length > 0) {
          const dbActive = data[0];
          // Sincroniza cache local garantindo que a sessão ativa do banco exista no localStorage
          const local = getLocalSessions();
          if (!local.some(s => s.id === dbActive.id && s.end_date === null)) {
            saveLocalSessions([dbActive, ...local.filter(s => s.id !== dbActive.id)]);
          }
          return dbActive;
        } else {
          // Não há sessão aberta no Supabase!
          // Auto-correção: se o localStorage achar que tem sessão aberta, limpa/encerra localmente
          const local = getLocalSessions();
          const hasStaleLocal = local.some(s => s.end_date === null);
          if (hasStaleLocal) {
            console.warn('[sessionService] Auto-correção: localStorage tinha sessão ativa mas Supabase não. Sincronizando com o banco...');
            const cleaned = local.map(s => s.end_date === null ? { ...s, end_date: new Date().toISOString() } : s);
            saveLocalSessions(cleaned);
          }
          return null;
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar sessão ativa do Supabase:', err);
    }
    // Fallback apenas se a rede falhar
    return sessionService.getActiveSession();
  },

  /**
   * Inicia uma nova sessão de treino.
   * SEMPRE valida primeiro contra o Supabase para evitar falsos positivos de "treino em andamento".
   */
  startSession: async (opponentName?: string, notes?: string): Promise<TrainingSession> => {
    // 1. Consulta o Supabase diretamente como fonte de verdade
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id')
        .is('end_date', null)
        .limit(1);

      if (!error) {
        if (data && data.length > 0) {
          throw new Error('Já existe um treino em andamento no banco de dados.');
        } else {
          // Se o banco confirmou que NÃO há sessão aberta, limpa qualquer resquício órfão do localStorage
          const local = getLocalSessions();
          if (local.some(s => s.end_date === null)) {
            console.warn('[sessionService] Limpando sessão fantasma órfã do localStorage antes de iniciar nova.');
            saveLocalSessions(local.map(s => s.end_date === null ? { ...s, end_date: new Date().toISOString() } : s));
          }
        }
      }
    } catch (err: any) {
      if (err.message?.includes('Já existe um treino')) {
        throw err;
      }
      console.warn('Aviso ao validar sessão ativa com Supabase, procedendo com cautela:', err);
    }

    const newSession: TrainingSession = {
      id: crypto.randomUUID(),
      start_date: new Date().toISOString(),
      end_date: null,
      notes: notes || '',
      opponent_name: opponentName || ''
    };

    // 2. Persiste primeiro no Supabase
    try {
      const { error } = await supabase.from('training_sessions').insert([newSession]);
      if (error) {
        console.error('Erro ao inserir sessão no Supabase:', error);
        throw new Error(`Falha ao registrar sessão no banco: ${error.message}`);
      }
    } catch (err: any) {
      if (err.message?.includes('Falha ao registrar')) {
        throw err;
      }
      console.warn('Erro de rede ao salvar sessão no Supabase:', err);
    }

    // 3. Atualiza cache local com a sessão recém-criada
    const currentLocal = getLocalSessions();
    saveLocalSessions([newSession, ...currentLocal.filter(s => s.id !== newSession.id)]);

    return newSession;
  },

  /**
   * Encerra a sessão de treino (grava end_date) no Supabase + localStorage.
   */
  endSession: async (id?: string): Promise<void> => {
    const localSessions = getLocalSessions();
    const active = id
      ? localSessions.find(s => s.id === id)
      : localSessions.find(s => s.end_date === null);

    const endDate = new Date().toISOString();

    if (active) {
      active.end_date = endDate;
      saveLocalSessions(localSessions);
    }

    // Atualiza no Supabase
    try {
      const targetId = id || active?.id;
      if (targetId) {
        const { error } = await supabase
          .from('training_sessions')
          .update({ end_date: endDate })
          .eq('id', targetId);
        if (error) console.warn('Erro ao encerrar sessão no Supabase:', error);
      } else {
        // Encerra qualquer sessão que estiver com end_date nula
        await supabase
          .from('training_sessions')
          .update({ end_date: endDate })
          .is('end_date', null);
      }
    } catch (err) {
      console.error('Erro ao comunicar encerramento ao Supabase:', err);
    }
  },

  /**
   * Deleta uma sessão do Supabase + localStorage.
   * Usado para excluir treinos vazios ou remoção manual no histórico.
   */
  deleteSession: async (id: string): Promise<void> => {
    const localSessions = getLocalSessions();
    saveLocalSessions(localSessions.filter(s => s.id !== id));

    try {
      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', id);
      if (error) console.warn('Erro ao deletar sessão do Supabase:', error);
    } catch (err) {
      console.error('Erro ao comunicar exclusão ao Supabase:', err);
    }
  },

  /**
   * Assina atualizações em tempo real da tabela training_sessions.
   * Qualquer INSERT/UPDATE/DELETE nessa tabela dispara o callback.
   */
  subscribeToSessions: (callback: (payload: any) => void) => {
    return supabase
      .channel('public:training_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'training_sessions' },
        callback
      )
      .subscribe();
  }
};
