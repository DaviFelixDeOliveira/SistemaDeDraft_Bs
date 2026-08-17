import { supabase } from '../lib/supabase';
import { brawlersBackupData } from '../data/backups/brawlersBackup';
import { mapsBackupData } from '../data/backups/mapsBackup';
import { playersBackupData } from '../data/backups/playersBackup';

export interface FullBackupPayload {
  version: string;
  exportedAt: string;
  data: {
    brawlers: any[];
    maps: any[];
    players: any[];
    compositions?: any[];
    trainingSessions?: any[];
    matches?: any[];
    matchPicks?: any[];
    matchBans?: any[];
  };
}

export interface BackupSnapshotInfo {
  savedAt: string | null;
  matchCount: number;
  playerCount: number;
  brawlerCount: number;
  mapCount: number;
  sessionCount: number;
  payload?: FullBackupPayload;
}

const LOCAL_STORAGE_MATCHES_KEY = 'tbk_hub_matches';
const LOCAL_STORAGE_PICKS_KEY = 'tbk_hub_picks';
const LOCAL_STORAGE_BANS_KEY = 'tbk_hub_bans';
const LOCAL_STORAGE_SESSIONS_KEY = 'tbk_training_sessions';
const LOCAL_STORAGE_SNAPSHOT_KEY = 'tbk_latest_backup_snapshot';

function getLocalData<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export const backupRestoreService = {
  /**
   * Salva um snapshot completo do estado atual no Supabase (tabela `latest_backup`)
   * e atualiza o localStorage. Não realiza download de arquivo.
   */
  saveSnapshotToDatabase: async (): Promise<{ success: boolean; message: string; savedAt: string }> => {
    try {
      const [
        { data: brawlers },
        { data: maps },
        { data: players },
        { data: compositions },
        { data: trainingSessions },
        { data: matches },
        { data: matchPicks },
        { data: matchBans }
      ] = await Promise.all([
        supabase.from('brawlers').select('*'),
        supabase.from('maps').select('*'),
        supabase.from('players').select('*'),
        supabase.from('compositions').select('*'),
        supabase.from('training_sessions').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('match_picks').select('*'),
        supabase.from('match_bans').select('*')
      ]);

      const finalSessions = (trainingSessions && trainingSessions.length > 0) ? trainingSessions : getLocalData(LOCAL_STORAGE_SESSIONS_KEY);
      const finalMatches = (matches && matches.length > 0) ? matches : getLocalData(LOCAL_STORAGE_MATCHES_KEY);
      const finalPicks = (matchPicks && matchPicks.length > 0) ? matchPicks : getLocalData(LOCAL_STORAGE_PICKS_KEY);
      const finalBans = (matchBans && matchBans.length > 0) ? matchBans : getLocalData(LOCAL_STORAGE_BANS_KEY);

      const savedAt = new Date().toISOString();

      const backup: FullBackupPayload = {
        version: '1.2',
        exportedAt: savedAt,
        data: {
          brawlers: brawlers || [],
          maps: maps || [],
          players: players || [],
          compositions: compositions || [],
          trainingSessions: finalSessions || [],
          matches: finalMatches || [],
          matchPicks: finalPicks || [],
          matchBans: finalBans || []
        }
      };

      // Tenta persistir no Supabase (sobrescreve a linha 'latest')
      try {
        const { error } = await supabase
          .from('latest_backup')
          .upsert([{ id: 'latest', payload: backup, saved_at: savedAt }], { onConflict: 'id' });
        if (error) console.warn('Aviso ao salvar snapshot no Supabase:', error);
      } catch (err) {
        console.warn('Fallback: salvando snapshot no localStorage:', err);
      }

      // Salva em cache local do snapshot
      localStorage.setItem(LOCAL_STORAGE_SNAPSHOT_KEY, JSON.stringify({ savedAt, payload: backup }));

      return {
        success: true,
        savedAt,
        message: `Snapshot salvo com sucesso! (${finalMatches?.length || 0} partidas salvas)`
      };
    } catch (err: any) {
      console.error('Erro ao salvar snapshot:', err);
      return { success: false, savedAt: '', message: err?.message || 'Erro ao salvar snapshot.' };
    }
  },

  /**
   * Obtém informações do último snapshot salvo no banco / localStorage.
   */
  getLatestSnapshotInfo: async (): Promise<BackupSnapshotInfo | null> => {
    try {
      // Tenta buscar do Supabase
      const { data, error } = await supabase
        .from('latest_backup')
        .select('*')
        .eq('id', 'latest')
        .single();

      if (!error && data && data.payload) {
        const payload: FullBackupPayload = data.payload;
        return {
          savedAt: data.saved_at || payload.exportedAt,
          matchCount: payload.data.matches?.length || 0,
          playerCount: payload.data.players?.length || 0,
          brawlerCount: payload.data.brawlers?.length || 0,
          mapCount: payload.data.maps?.length || 0,
          sessionCount: payload.data.trainingSessions?.length || 0,
          payload
        };
      }
    } catch (err) {
      console.warn('Supabase latest_backup não retornou, tentando localStorage:', err);
    }

    // Fallback para localStorage
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_SNAPSHOT_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        const payload: FullBackupPayload = parsed.payload;
        return {
          savedAt: parsed.savedAt || payload.exportedAt,
          matchCount: payload.data.matches?.length || 0,
          playerCount: payload.data.players?.length || 0,
          brawlerCount: payload.data.brawlers?.length || 0,
          mapCount: payload.data.maps?.length || 0,
          sessionCount: payload.data.trainingSessions?.length || 0,
          payload
        };
      }
    } catch {
      return null;
    }

    return null;
  },

  /**
   * Baixa um arquivo JSON com o snapshot atual do sistema.
   */
  exportBackupJSON: async (): Promise<void> => {
    try {
      const [
        { data: brawlers },
        { data: maps },
        { data: players },
        { data: compositions },
        { data: trainingSessions },
        { data: matches },
        { data: matchPicks },
        { data: matchBans }
      ] = await Promise.all([
        supabase.from('brawlers').select('*'),
        supabase.from('maps').select('*'),
        supabase.from('players').select('*'),
        supabase.from('compositions').select('*'),
        supabase.from('training_sessions').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('match_picks').select('*'),
        supabase.from('match_bans').select('*')
      ]);

      const finalSessions = (trainingSessions && trainingSessions.length > 0) ? trainingSessions : getLocalData(LOCAL_STORAGE_SESSIONS_KEY);
      const finalMatches = (matches && matches.length > 0) ? matches : getLocalData(LOCAL_STORAGE_MATCHES_KEY);
      const finalPicks = (matchPicks && matchPicks.length > 0) ? matchPicks : getLocalData(LOCAL_STORAGE_PICKS_KEY);
      const finalBans = (matchBans && matchBans.length > 0) ? matchBans : getLocalData(LOCAL_STORAGE_BANS_KEY);

      const backup: FullBackupPayload = {
        version: '1.2',
        exportedAt: new Date().toISOString(),
        data: {
          brawlers: brawlers || [],
          maps: maps || [],
          players: players || [],
          compositions: compositions || [],
          trainingSessions: finalSessions || [],
          matches: finalMatches || [],
          matchPicks: finalPicks || [],
          matchBans: finalBans || []
        }
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateStr = `${day}-${month}-${year}`;

      const link = document.createElement('a');
      link.href = url;
      link.download = `tbk_hub_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar backup em JSON:', err);
      alert('Ocorreu um erro ao gerar o arquivo de backup.');
    }
  },

  /**
   * Executa a restauração destrutiva a partir de um payload recebido.
   */
  applyRestorePayload: async (payload: FullBackupPayload): Promise<{ success: boolean; message: string }> => {
    try {
      if (!payload.data || !payload.data.brawlers || !payload.data.maps || !payload.data.players) {
        return { success: false, message: 'Estrutura de backup inválida.' };
      }

      const { brawlers, maps, players, compositions, trainingSessions, matches, matchPicks, matchBans } = payload.data;

      // 1. LIMPEZA NA ORDEM INVERSA DE DEPENDÊNCIA
      const dummyUuid = '00000000-0000-0000-0000-000000000000';
      const dummyText = '__DELETE_ALL_DUMMY__';

      await supabase.from('match_picks').delete().neq('id', dummyUuid);
      await supabase.from('match_bans').delete().neq('id', dummyUuid);
      await supabase.from('matches').delete().neq('id', dummyUuid);
      await supabase.from('training_sessions').delete().neq('id', dummyUuid);
      await supabase.from('compositions').delete().neq('id', dummyUuid);
      await supabase.from('players').delete().neq('id', dummyText);
      await supabase.from('maps').delete().neq('id', dummyText);
      await supabase.from('brawlers').delete().neq('id', dummyText);

      // Limpa caches locais
      localStorage.removeItem(LOCAL_STORAGE_MATCHES_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PICKS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_BANS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SESSIONS_KEY);

      // 2. INSERÇÃO NA ORDEM DE DEPENDÊNCIA DIRETA
      if (brawlers && brawlers.length > 0) {
        await supabase.from('brawlers').insert(brawlers);
      }
      if (maps && maps.length > 0) {
        await supabase.from('maps').insert(maps);
      }
      if (players && players.length > 0) {
        await supabase.from('players').insert(players);
      }
      if (compositions && compositions.length > 0) {
        await supabase.from('compositions').insert(compositions);
      }
      if (trainingSessions && trainingSessions.length > 0) {
        await supabase.from('training_sessions').insert(trainingSessions);
        localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(trainingSessions));
      }
      if (matches && matches.length > 0) {
        await supabase.from('matches').insert(matches);
        localStorage.setItem(LOCAL_STORAGE_MATCHES_KEY, JSON.stringify(matches));
      }
      if (matchPicks && matchPicks.length > 0) {
        await supabase.from('match_picks').insert(matchPicks);
        localStorage.setItem(LOCAL_STORAGE_PICKS_KEY, JSON.stringify(matchPicks));
      }
      if (matchBans && matchBans.length > 0) {
        await supabase.from('match_bans').insert(matchBans);
        localStorage.setItem(LOCAL_STORAGE_BANS_KEY, JSON.stringify(matchBans));
      }

      return {
        success: true,
        message: `Backup restaurado com sucesso! (${brawlers?.length || 0} brawlers, ${maps?.length || 0} mapas, ${players?.length || 0} atletas, ${matches?.length || 0} partidas)`
      };
    } catch (err: any) {
      console.error('Erro ao aplicar payload de restauração:', err);
      return { success: false, message: err?.message || 'Falha ao restaurar dados.' };
    }
  },

  /**
   * Importa e restaura os dados de um arquivo JSON enviado pelo usuário.
   */
  importBackupJSON: async (jsonContent: string): Promise<{ success: boolean; message: string }> => {
    try {
      const payload: FullBackupPayload = JSON.parse(jsonContent);
      return await backupRestoreService.applyRestorePayload(payload);
    } catch (err: any) {
      return { success: false, message: err?.message || 'Arquivo JSON malformado.' };
    }
  },

  /**
   * Restaura o sistema a partir do último snapshot salvo no banco/localStorage.
   */
  restoreFromLatestSnapshot: async (): Promise<{ success: boolean; message: string }> => {
    const info = await backupRestoreService.getLatestSnapshotInfo();
    if (!info || !info.payload) {
      return { success: false, message: 'Nenhum snapshot de backup salvo foi encontrado no banco de dados.' };
    }
    return await backupRestoreService.applyRestorePayload(info.payload);
  },

  /**
   * Retorna a contagem atual de partidas do sistema para comparação.
   */
  getCurrentMatchCount: async (): Promise<number> => {
    try {
      const { data } = await supabase.from('matches').select('id');
      if (data && data.length > 0) return data.length;
    } catch {
      // ignore
    }
    return getLocalData(LOCAL_STORAGE_MATCHES_KEY).length;
  }
};
