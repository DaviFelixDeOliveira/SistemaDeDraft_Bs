// Backup dos brawlers em formato Supabase row
import brawlersRaw from '../../../Json do banco de dados/Json da tabela brawlers.txt?raw';

export const brawlersBackupData = JSON.parse(brawlersRaw);
