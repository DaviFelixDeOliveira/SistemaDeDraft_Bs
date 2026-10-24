import type { GameMap, Match, MatchPick, Player } from '../types';

/** Estimativas DESCRITIVAS, não provas de causalidade ou matchups 1v1. */
export interface Sample {
  matches: number;
  wins: number;
  winrate: number | null;
  adjustedWinrate: number;
  recentWins: number;
  recentMatches: number;
}
export interface Evidence {
  global: Sample;
  mode: Sample;
  map: Sample;
}
type Observation = { matchId: string; date: number; won: boolean; mapId: string; mode: string; allies: string[]; enemies: string[]; playerByBrawler: Map<string, string> };
const empty = (): Sample => ({ matches: 0, wins: 0, winrate: null, adjustedWinrate: 50, recentWins: 0, recentMatches: 0 });
const rate = (items: Observation[]): Sample => {
  if (!items.length) return empty();
  const wins = items.filter(x => x.won).length;
  const recent = [...items].sort((a, b) => b.date - a.date).slice(0, 5);
  return {
    matches: items.length, wins, winrate: Math.round(wins * 100 / items.length),
    // Prior de 4 partidas a 50% evita transformar uma vitória isolada em "100% de vantagem".
    adjustedWinrate: Math.round((wins + 2) * 100 / (items.length + 4)),
    recentMatches: recent.length, recentWins: recent.filter(x => x.won).length,
  };
};
export interface Relation extends Sample { id: string; manual: boolean; inferred: boolean }
export interface ModeBreakdown { mode: string; sample: Sample; maps: { id: string; name: string; sample: Sample }[] }
export interface ComfortEvidence { playerId: string; playerName: string; sample: Sample; share: number; manual: boolean; inferred: boolean }

/**
 * Cada partida conta uma única vez por personagem; escolha de inimigos, aliados,
 * modo e mapa são observações de partidas inteiras, NÃO resultados de duelos.
 */
export function buildEvidence(matches: Match[], picks: MatchPick[], maps: GameMap[]) {
  const mapById = new Map(maps.map(m => [m.id, m]));
  const picksByMatch = new Map<string, MatchPick[]>();
  for (const p of picks) {
    if (!picksByMatch.has(p.match_id)) picksByMatch.set(p.match_id, []);
    picksByMatch.get(p.match_id)!.push(p);
  }
  const observations: Observation[] = matches.map(m => {
    const ps = picksByMatch.get(m.id) || [];
    const allies = [...new Set(ps.filter(p => p.team === 'ally').map(p => p.brawler_id))];
    const enemies = [...new Set(ps.filter(p => p.team === 'enemy').map(p => p.brawler_id))];
    const playerByBrawler = new Map<string, string>();
    for (const p of ps) if (p.team === 'ally' && p.player_id) playerByBrawler.set(p.brawler_id, p.player_id);
    return { matchId: m.id, date: new Date(m.match_date).getTime() || 0,
      won: m.result === 'victory', mapId: m.map_id, mode: mapById.get(m.map_id)?.mode ?? '',
      allies, enemies, playerByBrawler };
  });
  const byAlly = new Map<string, Observation[]>();
  for (const m of observations) for (const id of m.allies) {
    if (!byAlly.has(id)) byAlly.set(id, []);
    byAlly.get(id)!.push(m);
  }
  const get = (id: string) => byAlly.get(id) || [];
  const performance = (id: string, mode?: string, mapId?: string): Evidence => {
    const all = get(id);
    return {
      global: rate(all),
      mode: mode ? rate(all.filter(m => m.mode === mode)) : empty(),
      map: mapId ? rate(all.filter(m => m.mapId === mapId)) : empty(),
    };
  };
  const against = (allyId: string, enemyId: string, mode?: string, mapId?: string): Evidence => {
    const all = get(allyId).filter(m => m.enemies.includes(enemyId));
    return {
      global: rate(all),
      mode: mode ? rate(all.filter(m => m.mode === mode)) : empty(),
      map: mapId ? rate(all.filter(m => m.mapId === mapId)) : empty(),
    };
  };
  const withAlly = (allyId: string, partnerId: string) =>
    rate(get(allyId).filter(m => m.allies.includes(partnerId)));

  const relationEntries = (id: string, kind: 'partner' | 'counter' | 'threat',
    manualIds: string[] = [], mode?: string, mapId?: string): Relation[] => {
    const target = get(id);
    const possible = new Set(manualIds);
    for (const m of target) {
      for (const related of kind === 'partner' ? m.allies : m.enemies) {
        if (related !== id) possible.add(related);
      }
    }
    const relations: Relation[] = [];
    for (const related of possible) {
      if (related === id) continue;
      const manual = manualIds.includes(related);
      const all = kind === 'partner' ? withAlly(id, related) : against(id, related).global;
      // Automaticamente inferido apenas com 5+ confrontos e sinal consistente.
      const inferred = all.matches >= 5 && (kind === 'partner' ||
        (kind === 'counter' ? all.winrate !== null && all.winrate >= 60 : all.winrate !== null && all.winrate <= 40));
      if (!manual && !inferred) continue;
      const contextual = kind === 'partner' ? all : against(id, related, mode, mapId).global;
      relations.push({ ...contextual, id: related, manual, inferred });
    }
    return relations.sort((a, b) => {
      // A qualidade histórica vem primeiro; amostras maiores desempatem.
      const aScore = kind === 'threat' ? 100 - a.adjustedWinrate : a.adjustedWinrate;
      const bScore = kind === 'threat' ? 100 - b.adjustedWinrate : b.adjustedWinrate;
      return bScore - aScore || b.matches - a.matches;
    });
  };

  const comfort = (id: string, players: Player[]): ComfortEvidence[] => {
    const all = get(id);
    const assigned = all.filter(m => m.playerByBrawler.has(id));
    const entries: ComfortEvidence[] = [];
    for (const player of players) {
      const sample = rate(assigned.filter(m => m.playerByBrawler.get(id) === player.id));
      const share = assigned.length ? sample.matches / assigned.length : 0;
      const manual = (player.comfortBrawlers || []).some(value =>
        value.toLowerCase() === id.toLowerCase());
      const inferred = sample.matches >= 5 && share >= 0.7 && sample.adjustedWinrate >= 55;
      if (manual || inferred) entries.push({
        playerId: player.id, playerName: player.nickname || player.name,
        sample, share: Math.round(share * 100), manual, inferred,
      });
    }
    return entries.sort((a,b) => Number(b.manual) - Number(a.manual)
      || b.sample.adjustedWinrate - a.sample.adjustedWinrate || b.sample.matches - a.sample.matches);
  };

  const breakdown = (id: string): ModeBreakdown[] => {
    const all = get(id);
    const modes = [...new Set(all.map(m => m.mode).filter(Boolean))];
    return modes.map(mode => {
      const filtered = all.filter(m => m.mode === mode);
      const mapIds = [...new Set(filtered.map(m => m.mapId))];
      const detail = mapIds.map(mapId => ({
        id: mapId, name: mapById.get(mapId)?.name || mapId,
        sample: rate(filtered.filter(m => m.mapId === mapId)),
      })).sort((a,b) => b.sample.matches - a.sample.matches || b.sample.adjustedWinrate-a.sample.adjustedWinrate);
      return { mode, sample: rate(filtered), maps: detail };
    }).sort((a,b) => b.sample.matches - a.sample.matches);
  };

  return { performance, against, withAlly, relationEntries, comfort, breakdown };
}

/** Combina evidência global, de modo e de mapa, reduzindo peso de amostras pequenas. */
export function evidenceBonus(e: Evidence): number {
  const weights = [
    { sample: e.global, weight: 2 },
    { sample: e.mode, weight: 3 },
    { sample: e.map, weight: 5 },
  ];
  return Math.round(weights.reduce((total,{sample,weight}) => {
    const reliability = Math.min(sample.matches / 8, 1);
    return total + (sample.adjustedWinrate - 50) * weight * reliability;
  }, 0));
}

/** Confrontos são correlações; impacto negativo no mapa pesa mais que vitória global. */
export function confrontationBonus(e: Evidence): number {
  if (e.global.matches === 0) return 0;
  return Math.max(-400,Math.min(400,evidenceBonus(e) * 0.7));
}
