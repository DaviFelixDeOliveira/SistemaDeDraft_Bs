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
    matches?: any[];
    matchPicks?: any[];
    matchBans?: any[];
  };
}

const LOCAL_STORAGE_MATCHES_KEY = 'tbk_hub_matches';
const LOCAL_STORAGE_PICKS_KEY = 'tbk_hub_picks';
const LOCAL_STORAGE_BANS_KEY = 'tbk_hub_bans';

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
   * Exporta todos os dados do sistema em um arquivo JSON para download.
   * Inclui brawlers, mapas, players (tags customizadas + picks conforto),
   * composições meta e todo o histórico de partidas (picks, bans, resultados).
   */
  exportBackupJSON: async (): Promise<void> => {
    try {
      const [
        { data: brawlers },
        { data: maps },
        { data: players },
        { data: compositions },
        { data: matches },
        { data: matchPicks },
        { data: matchBans }
      ] = await Promise.all([
        supabase.from('brawlers').select('*'),
        supabase.from('maps').select('*'),
        supabase.from('players').select('*'),
        supabase.from('compositions').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('match_picks').select('*'),
        supabase.from('match_bans').select('*')
      ]);

      // Se o Supabase estiver offline ou sem partidas, complementa com fallback do localStorage
      const finalMatches = (matches && matches.length > 0) ? matches : getLocalData(LOCAL_STORAGE_MATCHES_KEY);
      const finalPicks = (matchPicks && matchPicks.length > 0) ? matchPicks : getLocalData(LOCAL_STORAGE_PICKS_KEY);
      const finalBans = (matchBans && matchBans.length > 0) ? matchBans : getLocalData(LOCAL_STORAGE_BANS_KEY);

      const backup: FullBackupPayload = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {
          brawlers: brawlers || [],
          maps: maps || [],
          players: players || [],
          compositions: compositions || [],
          matches: finalMatches || [],
          matchPicks: finalPicks || [],
          matchBans: finalBans || []
        }
      };

      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toISOString().split('T')[0];
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
   * Importa e restaura os dados de um arquivo JSON enviado pelo usuário.
   * Restaura no Supabase e atualiza o localStorage para máxima resiliência.
   */
  importBackupJSON: async (jsonContent: string): Promise<{ success: boolean; message: string }> => {
    try {
      const payload: FullBackupPayload = JSON.parse(jsonContent);

      if (!payload.data || !payload.data.brawlers || !payload.data.maps || !payload.data.players) {
        return { success: false, message: 'Arquivo JSON inválido. Estrutura de dados não reconhecida.' };
      }

      const { brawlers, maps, players, compositions, matches, matchPicks, matchBans } = payload.data;

      // 1. Restaura no Supabase
      if (brawlers && brawlers.length > 0) {
        await supabase.from('brawlers').upsert(brawlers, { onConflict: 'id' });
      }
      if (maps && maps.length > 0) {
        await supabase.from('maps').upsert(maps, { onConflict: 'id' });
      }
      if (players && players.length > 0) {
        await supabase.from('players').upsert(players, { onConflict: 'id' });
      }
      if (compositions && compositions.length > 0) {
        await supabase.from('compositions').upsert(compositions, { onConflict: 'id' });
      }
      if (matches && matches.length > 0) {
        await supabase.from('matches').upsert(matches, { onConflict: 'id' });
        localStorage.setItem(LOCAL_STORAGE_MATCHES_KEY, JSON.stringify(matches));
      }
      if (matchPicks && matchPicks.length > 0) {
        await supabase.from('match_picks').upsert(matchPicks, { onConflict: 'id' });
        localStorage.setItem(LOCAL_STORAGE_PICKS_KEY, JSON.stringify(matchPicks));
      }
      if (matchBans && matchBans.length > 0) {
        await supabase.from('match_bans').upsert(matchBans, { onConflict: 'id' });
        localStorage.setItem(LOCAL_STORAGE_BANS_KEY, JSON.stringify(matchBans));
      }

      return {
        success: true,
        message: `Backup restaurado com sucesso! (${brawlers?.length || 0} brawlers, ${maps?.length || 0} mapas, ${players?.length || 0} atletas, ${matches?.length || 0} partidas)`
      };
    } catch (err: any) {
      console.error('Erro ao importar JSON:', err);
      return { success: false, message: err?.message || 'Arquivo JSON malformado.' };
    }
  },

  /**
   * Restaurar todas as tabelas (brawlers, maps, players) no Supabase
   * a partir dos arquivos de backup originais.
   */
  restoreAll: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const { error: errBrawlers } = await supabase
        .from('brawlers')
        .upsert(brawlersBackupData, { onConflict: 'id' });

      if (errBrawlers) {
        console.error('Erro ao restaurar brawlers:', errBrawlers);
        return { success: false, message: `Erro em brawlers: ${errBrawlers.message}` };
      }

      const { error: errMaps } = await supabase
        .from('maps')
        .upsert(mapsBackupData, { onConflict: 'id' });

      if (errMaps) {
        console.error('Erro ao restaurar mapas:', errMaps);
        return { success: false, message: `Erro em mapas: ${errMaps.message}` };
      }

      const { error: errPlayers } = await supabase
        .from('players')
        .upsert(playersBackupData, { onConflict: 'id' });

      if (errPlayers) {
        console.error('Erro ao restaurar players:', errPlayers);
        return { success: false, message: `Erro em players: ${errPlayers.message}` };
      }

      return {
        success: true,
        message: `Banco restaurado com sucesso! (${brawlersBackupData.length} brawlers, ${mapsBackupData.length} mapas, ${playersBackupData.length} atletas)`,
      };
    } catch (err: any) {
      console.error('Erro ao restaurar backup:', err);
      return { success: false, message: err?.message || 'Erro ao comunicar com Supabase.' };
    }
  },
};
