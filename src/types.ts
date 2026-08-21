export type Tier = string;
export type Rarity = string;
export type BrawlerClass = string;

export interface Brawler {
  id: string; // UUID in Supabase
  name: string;
  rarity: Rarity;
  tier: Tier;
  health: string;
  healthValue?: string;
  type: BrawlerClass[];
  walksOnWater: boolean;
  breaksWalls: boolean;
  howBreaksWalls?: string;
  imageUrl?: string;
  iconUrl?: string;
  isHotPick?: boolean;
  is_active?: boolean;
  counters?: string[]; // IDs de brawlers que ele countera (vantagem sobre)
  counteredBy?: string[]; // IDs de brawlers para os quais ele sofre (desvantagem contra)
}

export type MapTerrain = 'Aberto' | 'Semi-Aberto' | 'Fechado' | 'Misto';
export type GameMode = 'Fute-Brawl' | 'Roubo' | 'Pique-Gema' | 'Zona Estratégica' | 'Caça-Estrelas' | 'Nocaute';

export interface GameMap {
  id: string; // UUID
  name: string;
  mode: GameMode;
  terrain: MapTerrain;
  isActive: boolean;
  is_active?: boolean;
  imageUrl?: string;
}

export interface Player {
  id: string; // UUID
  name: string;
  nickname: string;
  status?: 'Titular' | 'Reserva';
  isActive: boolean;
  is_active?: boolean;
  comfortBrawlers: string[]; // Brawler IDs
  tags?: string[];
}

export interface Composition {
  id: string; // UUID
  mapId: string; // FK
  brawlers: [string, string, string]; // Brawler IDs
  description?: string;
  winrate: number;
  matchesPlayed: number;
  is_active?: boolean;
}

export interface TrainingSession {
  id: string;
  start_date: string;
  end_date: string | null;
  notes?: string;
  opponent_name?: string;
}

export interface Match {
  id: string;
  session_id?: string | null;
  match_date: string;
  map_id: string;
  result: 'victory' | 'defeat';
  opponent_name?: string;
  notes?: string;
}

export interface MatchPick {
  id?: string;
  match_id: string;
  team: 'tbk' | 'enemy';
  player_id?: string | null;
  brawler_id: string;
}

export interface MatchBan {
  id?: string;
  match_id: string;
  team: 'tbk' | 'enemy';
  brawler_id: string;
}

export interface MatchRecordData {
  mapId: string;
  sessionId?: string | null;
  result: 'victory' | 'defeat';
  tbkPicks: { brawlerId: string; playerId?: string }[];
  enemyPicks: string[];
  tbkBans: string[];
  enemyBans: string[];
  opponentName?: string;
  notes?: string;
  variationTested?: {
    brawlerOut: string;
    brawlerIn: string;
    isWin: boolean;
  };
}


