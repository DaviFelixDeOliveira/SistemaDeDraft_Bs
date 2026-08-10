import { supabase } from '../lib/supabase';
import { brawlersBackupData } from '../data/backups/brawlersBackup';
import { mapsBackupData } from '../data/backups/mapsBackup';
import { playersBackupData } from '../data/backups/playersBackup';

export const backupRestoreService = {
  /**
   * Restaurar todas as tabelas (brawlers, maps, players) no Supabase
   * a partir dos arquivos de backup originais.
   */
  restoreAll: async (): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Brawlers
      const { error: errBrawlers } = await supabase
        .from('brawlers')
        .upsert(brawlersBackupData, { onConflict: 'id' });

      if (errBrawlers) {
        console.error('Erro ao restaurar brawlers:', errBrawlers);
        return { success: false, message: `Erro em brawlers: ${errBrawlers.message}` };
      }

      // 2. Maps
      const { error: errMaps } = await supabase
        .from('maps')
        .upsert(mapsBackupData, { onConflict: 'id' });

      if (errMaps) {
        console.error('Erro ao restaurar mapas:', errMaps);
        return { success: false, message: `Erro em mapas: ${errMaps.message}` };
      }

      // 3. Players
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
