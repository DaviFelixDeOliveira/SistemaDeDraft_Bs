import { supabase } from '../lib/supabase';
import { Match, MatchPick, MatchBan, MatchRecordData, Brawler, GameMap, Player } from '../types';
import { toDbResult, fromDbResult, toDbTeam, fromDbTeam } from '../lib/utils';
import { brawlerService } from './brawlerService';
import { mapService } from './mapService';
import { playerService } from './playerService';

// Armazenamento local de fallback caso o Supabase não responda
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

function setLocalData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Erro ao salvar ${key} no localStorage:`, e);
  }
}

export const analyticsService = {
  /**
   * Grava uma nova partida no banco de dados (matches, match_picks, match_bans)
   */
  recordScrim: async (data: MatchRecordData): Promise<Match> => {
    const matchId = crypto.randomUUID();
    const matchDate = new Date().toISOString();

    const matchRow: Match = {
      id: matchId,
      match_date: matchDate,
      map_id: data.mapId,
      result: data.result,
      opponent_name: data.opponentName || 'Inimigo',
      notes: data.notes || ''
    };

    const pickRows: MatchPick[] = [];
    data.tbkPicks.forEach(pick => {
      if (pick.brawlerId) {
        pickRows.push({
          match_id: matchId,
          team: 'tbk',
          player_id: pick.playerId || null,
          brawler_id: pick.brawlerId
        });
      }
    });

    data.enemyPicks.forEach(bId => {
      if (bId) {
        pickRows.push({
          match_id: matchId,
          team: 'enemy',
          player_id: null,
          brawler_id: bId
        });
      }
    });

    const banRows: MatchBan[] = [];
    data.tbkBans.forEach(bId => {
      if (bId) {
        banRows.push({
          match_id: matchId,
          team: 'tbk',
          brawler_id: bId
        });
      }
    });

    data.enemyBans.forEach(bId => {
      if (bId) {
        banRows.push({
          match_id: matchId,
          team: 'enemy',
          brawler_id: bId
        });
      }
    });

    // Tenta persistir no Supabase
    // ATENÇÃO: o banco usa português ('vitoria'/'derrota', 'nos'/'inimigo').
    // Usamos as funções de mapeamento de utils.ts para converter antes do insert.
    try {
      const matchRowDb = { ...matchRow, result: toDbResult(matchRow.result) };
      const { error: matchError } = await supabase.from('matches').insert([matchRowDb]);
      if (matchError) console.warn('Erro ao inserir partida no Supabase:', matchError);

      if (pickRows.length > 0) {
        const pickRowsDb = pickRows.map(p => ({ ...p, team: toDbTeam(p.team as 'tbk' | 'enemy') }));
        const { error: pickError } = await supabase.from('match_picks').insert(pickRowsDb);
        if (pickError) console.warn('Erro ao inserir picks no Supabase:', pickError);
      }

      if (banRows.length > 0) {
        const banRowsDb = banRows.map(b => ({ ...b, team: toDbTeam(b.team as 'tbk' | 'enemy') }));
        const { error: banError } = await supabase.from('match_bans').insert(banRowsDb);
        if (banError) console.warn('Erro ao inserir bans no Supabase:', banError);
      }
    } catch (err) {
      console.error('Erro ao conectar com Supabase ao gravar partida:', err);
    }

    // Sempre salva em fallback local para resiliência
    const localMatches = getLocalData<Match>(LOCAL_STORAGE_MATCHES_KEY);
    const localPicks = getLocalData<MatchPick>(LOCAL_STORAGE_PICKS_KEY);
    const localBans = getLocalData<MatchBan>(LOCAL_STORAGE_BANS_KEY);

    setLocalData(LOCAL_STORAGE_MATCHES_KEY, [matchRow, ...localMatches]);
    setLocalData(LOCAL_STORAGE_PICKS_KEY, [...pickRows, ...localPicks]);
    setLocalData(LOCAL_STORAGE_BANS_KEY, [...banRows, ...localBans]);

    return matchRow;
  },

  /**
   * Retorna todas as partidas registradas diretamente do Supabase
   */
  getAllMatches: async (): Promise<Match[]> => {
    try {
      const { data, error } = await supabase.from('matches').select('*').order('match_date', { ascending: false });
      if (!error && data) {
        // Se a busca no Supabase funcionou (mesmo retornando 0 partidas), retorna os dados reais do banco
        return data.map(m => ({ ...m, result: fromDbResult(m.result) }));
      }
    } catch (err) {
      console.warn('Erro ao buscar partidas do Supabase:', err);
    }
    return getLocalData<Match>(LOCAL_STORAGE_MATCHES_KEY);
  },

  /**
   * Retorna todos os picks gravados
   */
  getAllPicks: async (): Promise<MatchPick[]> => {
    try {
      const { data, error } = await supabase.from('match_picks').select('*');
      if (!error && data) {
        return data.map(p => ({ ...p, team: fromDbTeam(p.team) }));
      }
    } catch (err) {
      console.warn('Erro ao buscar picks do Supabase:', err);
    }
    return getLocalData<MatchPick>(LOCAL_STORAGE_PICKS_KEY);
  },

  /**
   * Retorna todos os bans gravados
   */
  getAllBans: async (): Promise<MatchBan[]> => {
    try {
      const { data, error } = await supabase.from('match_bans').select('*');
      if (!error && data) {
        return data.map(b => ({ ...b, team: fromDbTeam(b.team) }));
      }
    } catch (err) {
      console.warn('Erro ao buscar bans do Supabase:', err);
    }
    return getLocalData<MatchBan>(LOCAL_STORAGE_BANS_KEY);
  },

  /**
   * Estatísticas Principais do Dashboard (Resumo Geral)
   */
  getDashboardStats: async () => {
    const matches = await analyticsService.getAllMatches();
    const totalMatches = matches.length;
    const wins = matches.filter(m => m.result === 'victory').length;
    const losses = totalMatches - wins;
    const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return {
      totalMatches,
      wins,
      losses,
      winrate
    };
  },

  /**
   * Retorna métricas de brawlers quentes (com contagem real de picks e winrate real)
   */
  getBrawlerStats: async () => {
    const brawlers = await brawlerService.getBrawlers();
    const picks = await analyticsService.getAllPicks();
    const bans = await analyticsService.getAllBans();
    const matches = await analyticsService.getAllMatches();

    const matchesMap = new Map<string, Match>();
    matches.forEach(m => matchesMap.set(m.id, m));

    return brawlers.map(b => {
      const bPicks = picks.filter(p => p.brawler_id === b.id);
      const bBans = bans.filter(bn => bn.brawler_id === b.id);

      // Separar bans por time para o filtro Nossos/Inimigos do Dashboard
      const tbkBans = bBans.filter(bn => bn.team === 'tbk');
      const enemyBans = bBans.filter(bn => bn.team === 'enemy');

      const tbkPicks = bPicks.filter(p => p.team === 'tbk');
      let wins = 0;
      tbkPicks.forEach(p => {
        const match = matchesMap.get(p.match_id);
        if (match && match.result === 'victory') {
          wins++;
        }
      });

      const totalPicks = bPicks.length;
      const winrate = tbkPicks.length > 0 ? Math.round((wins / tbkPicks.length) * 100) : 0;

      return {
        id: b.id,
        name: b.name,
        iconUrl: b.iconUrl,
        imageUrl: b.imageUrl,
        tier: b.tier,
        pick: totalPicks,
        ban: bBans.length,       // total (Geral)
        tbkBan: tbkBans.length,  // apenas nossos bans
        enemyBan: enemyBans.length, // apenas bans do inimigo
        tbkPickCount: tbkPicks.length,
        winrate
      };
    });
  },

  /**
   * Retorna estatísticas detalhadas de um brawler específico para os modais e o BrawlersHub
   */
  getBrawlerDetailStats: async (brawlerId: string) => {
    const [matches, picks, bans, maps, players, brawlers] = await Promise.all([
      analyticsService.getAllMatches(),
      analyticsService.getAllPicks(),
      analyticsService.getAllBans(),
      mapService.getMaps(),
      playerService.getPlayers(),
      brawlerService.getBrawlers()
    ]);

    const matchesMap = new Map<string, Match>(matches.map(m => [m.id, m]));
    const mapsMap = new Map<string, GameMap>(maps.map(m => [m.id, m]));
    const brawlersMap = new Map<string, Brawler>(brawlers.map(b => [b.id, b]));

    // Bans deste brawler
    const brawlerBans = bans.filter(b => b.brawler_id === brawlerId);
    const totalBans = brawlerBans.length;

    // Bans por modo
    const modeBansCount: Record<string, number> = {};
    const mapBansCount: Record<string, number> = {};

    brawlerBans.forEach(b => {
      const match = matchesMap.get(b.match_id);
      if (match) {
        const gameMap = mapsMap.get(match.map_id);
        if (gameMap) {
          modeBansCount[gameMap.mode] = (modeBansCount[gameMap.mode] || 0) + 1;
          mapBansCount[gameMap.name] = (mapBansCount[gameMap.name] || 0) + 1;
        }
      }
    });

    const topModeBans = Object.entries(modeBansCount)
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topMapBans = Object.entries(mapBansCount)
      .map(([mapName, count]) => ({ mapName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);

    // Picks deste brawler
    const brawlerPicks = picks.filter(p => p.brawler_id === brawlerId);
    const tbkPicks = brawlerPicks.filter(p => p.team === 'tbk');
    const enemyPicks = brawlerPicks.filter(p => p.team === 'enemy');

    let tbkWins = 0;
    tbkPicks.forEach(p => {
      const match = matchesMap.get(p.match_id);
      if (match && match.result === 'victory') tbkWins++;
    });

    const winrate = tbkPicks.length > 0 ? Math.round((tbkWins / tbkPicks.length) * 100) : 0;

    // Comfort picks (atletas que usaram este brawler)
    const playerPicksCount: Record<string, { total: number; wins: number }> = {};
    tbkPicks.forEach(p => {
      if (p.player_id) {
        if (!playerPicksCount[p.player_id]) playerPicksCount[p.player_id] = { total: 0, wins: 0 };
        playerPicksCount[p.player_id].total++;
        const match = matchesMap.get(p.match_id);
        if (match && match.result === 'victory') {
          playerPicksCount[p.player_id].wins++;
        }
      }
    });

    const comfortStats = Object.entries(playerPicksCount).map(([pId, data]) => {
      const player = players.find(p => p.id === pId);
      const wr = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
      return {
        playerName: player?.nickname || player?.name || 'Atleta',
        matches: data.total,
        winrate: wr
      };
    }).sort((a, b) => b.matches - a.matches);

    // Sinergias (Melhores Parceiros TBK)
    const partnerCounts: Record<string, number> = {};
    const enemyCounterCounts: Record<string, number> = {}; // Brawlers inimigos que foram derrotados por este
    const threatCounts: Record<string, number> = {}; // Brawlers inimigos que venceram contra este

    tbkPicks.forEach(p => {
      const match = matchesMap.get(p.match_id);
      if (!match) return;

      const sameMatchPicks = picks.filter(pk => pk.match_id === p.match_id);
      const tbkPartners = sameMatchPicks.filter(pk => pk.team === 'tbk' && pk.brawler_id !== brawlerId);
      const enemyEnemies = sameMatchPicks.filter(pk => pk.team === 'enemy');

      if (match.result === 'victory') {
        tbkPartners.forEach(partner => {
          partnerCounts[partner.brawler_id] = (partnerCounts[partner.brawler_id] || 0) + 1;
        });
        enemyEnemies.forEach(e => {
          enemyCounterCounts[e.brawler_id] = (enemyCounterCounts[e.brawler_id] || 0) + 1;
        });
      } else {
        enemyEnemies.forEach(e => {
          threatCounts[e.brawler_id] = (threatCounts[e.brawler_id] || 0) + 1;
        });
      }
    });

    const partners = Object.entries(partnerCounts)
      .map(([id, count]) => ({ brawler: brawlersMap.get(id), count }))
      .filter(item => item.brawler)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.brawler as Brawler);

    const counters = Object.entries(enemyCounterCounts)
      .map(([id, count]) => ({ brawler: brawlersMap.get(id), count }))
      .filter(item => item.brawler)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.brawler as Brawler);

    const threats = Object.entries(threatCounts)
      .map(([id, count]) => ({ brawler: brawlersMap.get(id), count }))
      .filter(item => item.brawler)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.brawler as Brawler);

    return {
      totalBans,
      topModeBans,
      topMapBans,
      winrate,
      tbkPicksCount: tbkPicks.length,
      enemyPicksCount: enemyPicks.length,
      totalPicksCount: brawlerPicks.length,
      comfortStats,
      partners,
      counters,
      threats
    };
  },

  /**
   * Retorna estatísticas detalhadas de um mapa específico para MapsHub
   */
  getMapDetailStats: async (mapId: string) => {
    const [matches, picks, bans, brawlers] = await Promise.all([
      analyticsService.getAllMatches(),
      analyticsService.getAllPicks(),
      analyticsService.getAllBans(),
      brawlerService.getBrawlers()
    ]);

    const brawlersMap = new Map<string, Brawler>(brawlers.map(b => [b.id, b]));
    const mapMatches = matches.filter(m => m.map_id === mapId);
    const totalMatches = mapMatches.length;

    const mapMatchesIds = new Set(mapMatches.map(m => m.id));
    const wins = mapMatches.filter(m => m.result === 'victory').length;
    const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    const mapPicks = picks.filter(p => mapMatchesIds.has(p.match_id));
    const mapBans = bans.filter(b => mapMatchesIds.has(b.match_id));

    // Picks TBK no Mapa
    const tbkPickCounts: Record<string, { total: number; wins: number }> = {};
    // Picks inimigos no Mapa — agora com contagem de vitórias inimigo (1.2)
    const enemyPickCounts: Record<string, { total: number; wins: number }> = {};

    mapPicks.forEach(p => {
      if (p.team === 'tbk') {
        if (!tbkPickCounts[p.brawler_id]) tbkPickCounts[p.brawler_id] = { total: 0, wins: 0 };
        tbkPickCounts[p.brawler_id].total++;
        const match = mapMatches.find(m => m.id === p.match_id);
        if (match && match.result === 'victory') tbkPickCounts[p.brawler_id].wins++;
      } else {
        if (!enemyPickCounts[p.brawler_id]) enemyPickCounts[p.brawler_id] = { total: 0, wins: 0 };
        enemyPickCounts[p.brawler_id].total++;
        // Vitória do inimigo = derrota da TBK
        const match = mapMatches.find(m => m.id === p.match_id);
        if (match && match.result === 'defeat') enemyPickCounts[p.brawler_id].wins++;
      }
    });

    const topTbkPicks = Object.entries(tbkPickCounts)
      .map(([bId, data]) => {
        const b = brawlersMap.get(bId);
        const wr = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
        return { brawler: b, picks: data.total, winrate: wr };
      })
      .filter(item => item.brawler)
      .sort((a, b) => b.picks - a.picks)
      .slice(0, 5);

    const topEnemyPicks = Object.entries(enemyPickCounts)
      .map(([bId, data]) => ({ brawler: brawlersMap.get(bId), picks: data.total }))
      .filter(item => item.brawler)
      .sort((a, b) => b.picks - a.picks)
      .slice(0, 5);

    /**
     * allEnemyPickStats — registro completo de picks inimigos no mapa.
     * Usado pelo motor de bans para blending histórico (1.2).
     * Record<brawlerId, { picks, wins, winrate }>
     */
    const allEnemyPickStats: Record<string, { picks: number; wins: number; winrate: number }> = {};
    Object.entries(enemyPickCounts).forEach(([bId, data]) => {
      const winrate = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 50;
      allEnemyPickStats[bId] = { picks: data.total, wins: data.wins, winrate };
    });

    // Bans no Mapa
    const totalBansCount: Record<string, number> = {};
    const tbkBansCount: Record<string, number> = {};
    const enemyBansCount: Record<string, number> = {};

    mapBans.forEach(b => {
      totalBansCount[b.brawler_id] = (totalBansCount[b.brawler_id] || 0) + 1;
      if (b.team === 'tbk') {
        tbkBansCount[b.brawler_id] = (tbkBansCount[b.brawler_id] || 0) + 1;
      } else {
        enemyBansCount[b.brawler_id] = (enemyBansCount[b.brawler_id] || 0) + 1;
      }
    });

    const topTotalBans = Object.entries(totalBansCount)
      .map(([bId, count]) => ({ brawler: brawlersMap.get(bId), count }))
      .filter(i => i.brawler)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topTbkBans = Object.entries(tbkBansCount)
      .map(([bId, count]) => ({ brawler: brawlersMap.get(bId), count }))
      .filter(i => i.brawler)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topEnemyBans = Object.entries(enemyBansCount)
      .map(([bId, count]) => ({ brawler: brawlersMap.get(bId), count }))
      .filter(i => i.brawler)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalMatches,
      wins,
      winrate,
      topTbkPicks,
      topEnemyPicks,
      topTotalBans,
      topTbkBans,
      topEnemyBans,
      allEnemyPickStats // (1.2) registro completo para motor de bans
    };
  },

  /**
   * Carrega ameaças históricas para múltiplos brawlers em uma única passagem.
   * Retorna Map<brawlerId, ThreatEntry[]> onde cada ThreatEntry é um
   * brawler inimigo que venceu contra o brawler alvo.
   *
   * Mais eficiente que N chamadas a getBrawlerDetailStats para o loop de scoring.
   * Usado por StepPicks.tsx para a penalidade de matchup específico (1.3).
   */
  getBrawlerThreatsMap: async (
    brawlerIds: string[]
  ): Promise<Map<string, { brawlerId: string; count: number }[]>> => {
    const [matches, picks] = await Promise.all([
      analyticsService.getAllMatches(),
      analyticsService.getAllPicks()
    ]);

    const matchesMap = new Map<string, Match>(matches.map(m => [m.id, m]));
    const brawlerIdSet = new Set(brawlerIds);

    // Pré-agrupa picks por partida para evitar O(n²) de buscas
    const picksByMatch = new Map<string, typeof picks>();
    for (const pick of picks) {
      if (!picksByMatch.has(pick.match_id)) picksByMatch.set(pick.match_id, []);
      picksByMatch.get(pick.match_id)!.push(pick);
    }

    // Acumula contagens de ameaças: Map<brawlerAlvo, Map<brawlerInimigo, count>>
    const threatCountMap = new Map<string, Map<string, number>>();
    brawlerIdSet.forEach(id => threatCountMap.set(id, new Map()));

    // Itera picks TBK que pertencem aos brawlers alvo
    for (const pick of picks) {
      if (pick.team !== 'tbk' || !brawlerIdSet.has(pick.brawler_id)) continue;
      const match = matchesMap.get(pick.match_id);
      if (!match || match.result !== 'defeat') continue; // apenas derrotas

      const matchPicks = picksByMatch.get(pick.match_id) ?? [];
      const enemyPicks = matchPicks.filter(p => p.team === 'enemy');
      const innerMap = threatCountMap.get(pick.brawler_id)!;

      for (const ep of enemyPicks) {
        innerMap.set(ep.brawler_id, (innerMap.get(ep.brawler_id) ?? 0) + 1);
      }
    }

    // Converte para o formato final: Map<brawlerId, ThreatEntry[]> ordenado por count desc
    const result = new Map<string, { brawlerId: string; count: number }[]>();
    for (const [bId, innerMap] of threatCountMap) {
      const threats = Array.from(innerMap.entries())
        .map(([enemyId, count]) => ({ brawlerId: enemyId, count }))
        .sort((a, b) => b.count - a.count);
      result.set(bId, threats);
    }
    return result;
  },

  /**
   * Retorna estatísticas reais de um jogador específico
   */
  getPlayerStats: async (playerId: string) => {
    const matches = await analyticsService.getAllMatches();
    const picks = await analyticsService.getAllPicks();

    const matchesMap = new Map<string, Match>(matches.map(m => [m.id, m]));
    const playerPicks = picks.filter(p => p.player_id === playerId && p.team === 'tbk');

    const totalMatches = playerPicks.length;
    let wins = 0;
    const recentMatches: boolean[] = [];

    // Ordenar picks da mais recente para a mais antiga
    const sortedPlayerPicks = [...playerPicks].sort((a, b) => {
      const mA = matchesMap.get(a.match_id);
      const mB = matchesMap.get(b.match_id);
      if (!mA || !mB) return 0;
      return new Date(mB.match_date).getTime() - new Date(mA.match_date).getTime();
    });

    sortedPlayerPicks.forEach(p => {
      const match = matchesMap.get(p.match_id);
      if (match) {
        const isWin = match.result === 'victory';
        if (isWin) wins++;
        if (recentMatches.length < 5) {
          recentMatches.push(isWin);
        }
      }
    });

    const winrate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return {
      winrate,
      matches: totalMatches,
      recentMatches
    };
  },

  /**
   * Desempenho por Modo para Gráficos
   */
  getWinrateByMode: async () => {
    const matches = await analyticsService.getAllMatches();
    const maps = await mapService.getMaps();

    if (matches.length === 0) {
      return [];
    }

    const mapsMap = new Map<string, GameMap>(maps.map(m => [m.id, m]));
    const modeStats: Record<string, { total: number; wins: number }> = {};

    matches.forEach(match => {
      const map = mapsMap.get(match.map_id);
      if (map) {
        if (!modeStats[map.mode]) modeStats[map.mode] = { total: 0, wins: 0 };
        modeStats[map.mode].total++;
        if (match.result === 'victory') modeStats[map.mode].wins++;
      }
    });

    const modeColors: Record<string, string> = {
      'Fute-Brawl': '#3B82F6',
      'Caça-Estrelas': '#F59E0B',
      'Roubo': '#EF4444',
      'Pique-Gema': '#8B5CF6',
      'Nocaute': '#10B981',
      'Zona Estratégica': '#EC4899'
    };

    return Object.entries(modeStats).map(([mode, data]) => ({
      name: mode,
      value: data.total,
      winrate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
      color: modeColors[mode] || '#6B7280'
    }));
  },

  /**
   * Retorna desempenho real por mapa (vitórias, derrotas, winrate)
   * Usada pelo Dashboard no bloco "Desempenho por Modo"
   */
  getMapPerformance: async () => {
    const [matches, maps] = await Promise.all([
      analyticsService.getAllMatches(),
      mapService.getMaps()
    ]);

    const mapsMap = new Map<string, GameMap>(maps.map(m => [m.id, m]));

    const mapStats: Record<string, { map: GameMap; wins: number; total: number }> = {};

    matches.forEach(match => {
      const gameMap = mapsMap.get(match.map_id);
      if (gameMap) {
        if (!mapStats[match.map_id]) {
          mapStats[match.map_id] = { map: gameMap, wins: 0, total: 0 };
        }
        mapStats[match.map_id].total++;
        if (match.result === 'victory') mapStats[match.map_id].wins++;
      }
    });

    return Object.values(mapStats).map(({ map, wins, total }) => ({
      map,
      wins,
      total,
      losses: total - wins,
      winrate: total > 0 ? Math.round((wins / total) * 100) : 0
    }));
  },

  /**
   * Progresso de Winrate Semanal
   */
  getWeeklyWinrate: async () => {
    const matches = await analyticsService.getAllMatches();
    if (matches.length === 0) {
      return [];
    }

    // Agrupar partidas por data (ou semana simples)
    const sorted = [...matches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
    
    // Divide em até 6 grupos para gerar a curva temporal real
    const total = sorted.length;
    const chunkSize = Math.max(1, Math.ceil(total / 6));
    const result = [];

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = sorted.slice(i, i + chunkSize);
      const wins = chunk.filter(m => m.result === 'victory').length;
      const wr = Math.round((wins / chunk.length) * 100);
      const label = `Bloco ${Math.floor(i / chunkSize) + 1}`;
      result.push({ name: label, winrate: wr });
    }

    return result;
  },

  /**
   * Retorna estatísticas de cada brawler jogado por um jogador específico.
   * Usa os dados reais de match_picks (player_id preenchido na etapa pós-partida).
   * Retorna array ordenado por total de partidas desc.
   */
  getPlayerBrawlerStats: async (playerId: string): Promise<
    Array<{
      brawlerId: string;
      brawlerName: string;
      brawlerIconUrl?: string;
      brawlerImageUrl?: string;
      matches: number;
      wins: number;
      winrate: number;
    }>
  > => {
    const [matches, picks, brawlers] = await Promise.all([
      analyticsService.getAllMatches(),
      analyticsService.getAllPicks(),
      brawlerService.getBrawlers(),
    ]);

    const matchesMap = new Map<string, Match>(matches.map(m => [m.id, m]));
    const brawlersMap = new Map(brawlers.map(b => [b.id, b]));

    // Filtra apenas picks TBK deste jogador
    const playerPicks = picks.filter(
      p => p.player_id === playerId && p.team === 'tbk'
    );

    // Agrega por brawler
    const brawlerCounts: Record<string, { total: number; wins: number }> = {};
    playerPicks.forEach(p => {
      if (!brawlerCounts[p.brawler_id]) {
        brawlerCounts[p.brawler_id] = { total: 0, wins: 0 };
      }
      brawlerCounts[p.brawler_id].total++;
      const match = matchesMap.get(p.match_id);
      if (match && match.result === 'victory') {
        brawlerCounts[p.brawler_id].wins++;
      }
    });

    return Object.entries(brawlerCounts)
      .map(([brawlerId, data]) => {
        const brawler = brawlersMap.get(brawlerId);
        const winrate =
          data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
        return {
          brawlerId,
          brawlerName: brawler?.name || 'Brawler Desconhecido',
          brawlerIconUrl: brawler?.iconUrl,
          brawlerImageUrl: brawler?.imageUrl,
          matches: data.total,
          wins: data.wins,
          winrate,
        };
      })
      .sort((a, b) => b.matches - a.matches);
  },
};
