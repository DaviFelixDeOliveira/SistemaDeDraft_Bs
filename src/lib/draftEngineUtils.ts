/**
 * draftEngineUtils.ts
 * ============================================================
 * Funções puras de pontuação do Draft Engine — sem dependências
 * de React, sem chamadas async. Totalmente testáveis via Vitest.
 *
 * Exporta utilitários usados por StepPicks.tsx (picks) e
 * StepMapAndBans.tsx (bans).
 * ============================================================
 */

import { Brawler, GameMode, MapTerrain } from '../types';

// ============================================================
// TIPOS PÚBLICOS
// ============================================================

export type ModeFit = 'good' | 'neutral' | 'poor';

/** Entrada de ameaça histórica: brawler inimigo que venceu contra o brawler alvo. */
export interface ThreatEntry {
  brawlerId: string;
  count: number; // Número de partidas em que este inimigo foi a ameaça
}

/**
 * Cache de ameaças históricas por brawler.
 * Map<brawlerAlvoId, ThreatEntry[]>
 * Carregado uma vez via analyticsService.getBrawlerThreatsMap().
 */
export type ThreatsCacheMap = Map<string, ThreatEntry[]>;

/** Estatística de pick de um brawler inimigo em um mapa específico. */
export interface EnemyPickStat {
  picks: number;
  wins: number;   // vezes em que o inimigo venceu (= nós perdemos) com esse brawler
  winrate: number; // winrate do inimigo com este brawler neste mapa
}

/**
 * Registro completo de picks inimigos num mapa.
 * Record<brawlerId, EnemyPickStat>
 * Retornado como allEnemyPickStats por getMapDetailStats (extensão 1.2).
 */
export type EnemyPickStatsMap = Record<string, EnemyPickStat>;

// ============================================================
// 1.1 — CLASSIFICAÇÃO DE ENCAIXE POR MODO (MODE-FIT)
// ============================================================
/**
 * Classifica o encaixe (roleFit) de um brawler em um modo de jogo.
 *
 * Usa apenas os campos já existentes no modelo de dados:
 *   type[]       — classes do brawler
 *   health       — 'Baixa' | 'Média' | 'Alta'
 *   breaksWalls  — se possui mecânica de quebrar paredes
 *   howBreaksWalls — 'N/A' = não quebra; qualquer outro valor = quebra
 *
 * Mapeamento por modo
 * -------------------
 * Roubo (Heist) — objetivo: danificar o cofre inimigo
 *   Forte:   Destruidores OU Tanque com breaksWalls (dano direto ao cofre)
 *   Neutro:  Controle (segura área de ataque)
 *   Fraco:   Suporte puro, Algoz puro, Tiro preciso de saúde Baixa
 *            (sem pressão de dano sustentado no cofre)
 *
 * Caça-Estrelas (Bounty) — objetivo: eliminar e não morrer
 *   Forte:   Tiro preciso, Algoz, Destruidores (dano de longa distância ou burst)
 *   Fraco:   Tanque de saúde Alta sem alcance (alvo lento e fácil de acumular estrelas)
 *
 * Zona Estratégica (Hot Zone) — objetivo: segurar zonas de controle
 *   Forte:   Controle, Suporte, Destruidores (presença sustentada na zona)
 *   Fraco:   Algoz puro sem capacidade de segurar zona (entra e sai, não ancora)
 *
 * Nocaute (Knockout) — objetivo: eliminar todos sem ressurreição
 *   Forte:   Algoz, Destruidores, Controle (pressão de eliminação)
 *   Fraco:   Suporte puro sem nenhum tipo de dano (cura sem pressão de elim)
 *
 * Fute-Brawl (Brawlball) — objetivo: marcar gols no campo adversário
 *   Forte:   Tanque, Algoz, qualquer brawler com breaksWalls (mobilidade de bola)
 *   Fraco:   Tiro preciso puro sem mobilidade (alcance, mas sem seguir a bola)
 *
 * Pique-Gema (Gem Grab) — objetivo: coletar e segurar gemas até o countdown
 *   Forte:   Controle, Suporte, Destruidores (carregam gemas e controlam área)
 *   Fraco:   Algoz puro sem Controle/Suporte (não consegue carregar gemas com segurança)
 */
export function getModeFit(brawler: Brawler, mode: GameMode): ModeFit {
  const types = brawler.type ?? [];
  const health = brawler.health;
  const hasBreaksWalls =
    brawler.breaksWalls ||
    (!!brawler.howBreaksWalls && brawler.howBreaksWalls !== 'N/A');

  const hasType = (...t: string[]): boolean => t.some(cls => types.includes(cls));

  switch (mode) {
    case 'Roubo': {
      // Forte: Destruidores ou Tanque com breaksWalls
      if (hasType('Destruidores', 'Tanque') && hasBreaksWalls) return 'good';
      // Neutro: Controle (segura área)
      if (hasType('Controle') && !hasType('Algoz')) return 'neutral';
      // Fraco: Suporte sem dano, Algoz puro, Sniper de saúde Baixa
      if (hasType('Suporte') && !hasType('Destruidores', 'Tanque', 'Controle')) return 'poor';
      if (hasType('Algoz') && !hasType('Destruidores', 'Tanque', 'Controle')) return 'poor';
      if (hasType('Tiro preciso') && health === 'Baixa' && !hasType('Destruidores', 'Tanque')) return 'poor';
      return 'neutral';
    }

    case 'Caça-Estrelas': {
      // Forte: Tiro preciso, Algoz, Destruidores
      if (hasType('Tiro preciso', 'Algoz', 'Destruidores')) return 'good';
      // Fraco: Tanque de saúde Alta sem alcance (acumula estrelas p/ o inimigo)
      if (
        hasType('Tanque') &&
        health === 'Alta' &&
        !hasType('Tiro preciso', 'Algoz', 'Destruidores')
      ) return 'poor';
      return 'neutral';
    }

    case 'Zona Estratégica': {
      // Forte: Controle, Suporte, Destruidores
      if (hasType('Controle', 'Suporte', 'Destruidores')) return 'good';
      // Fraco: Algoz puro (sem capacidade de segurar zona)
      if (
        hasType('Algoz') &&
        !hasType('Controle', 'Suporte', 'Destruidores', 'Tanque')
      ) return 'poor';
      return 'neutral';
    }

    case 'Nocaute': {
      // Forte: Algoz, Destruidores, Controle (pressão de eliminação)
      if (hasType('Algoz', 'Destruidores', 'Controle')) return 'good';
      // Fraco: Suporte puro sem pressão de dano
      if (
        hasType('Suporte') &&
        !hasType('Destruidores', 'Algoz', 'Controle', 'Tanque', 'Tiro preciso')
      ) return 'poor';
      return 'neutral';
    }

    case 'Fute-Brawl': {
      // Forte: Tanque, Algoz, qualquer um com breaksWalls (seguem a bola)
      if (hasType('Tanque', 'Algoz') || hasBreaksWalls) return 'good';
      // Fraco: Tiro preciso puro sem mobilidade
      if (hasType('Tiro preciso') && !hasType('Algoz', 'Tanque') && !hasBreaksWalls) return 'poor';
      return 'neutral';
    }

    case 'Pique-Gema': {
      // Forte: Controle, Suporte, Destruidores (carregam e protegem gemas)
      if (hasType('Controle', 'Suporte', 'Destruidores')) return 'good';
      // Fraco: Algoz puro (sem capacidade de carregar gemas com segurança)
      if (
        hasType('Algoz') &&
        !hasType('Controle', 'Suporte', 'Destruidores', 'Tanque')
      ) return 'poor';
      return 'neutral';
    }

    default:
      return 'neutral';
  }
}

// ============================================================
// 1.1 — BÔNUS DE CONFORTO COM VERIFICAÇÃO DE MODO
// ============================================================

/** Bônus completo de conforto (encaixe bom ou neutro no modo) */
const COMFORT_BONUS_FULL = 350;
/** Bônus reduzido de conforto quando o brawler tem encaixe fraco no modo */
const COMFORT_BONUS_WEAK_FIT = 100;

/**
 * Calcula o bônus de conforto aplicando verificação de encaixe de modo.
 *
 * - Bom/Neutro no modo  → +350 pts (comportamento original preservado)
 * - Fraco no modo       → +100 pts (redução de ~71%) + badge de aviso no UI
 * - Não é comfort pick  → 0
 */
export function computeComfortBonus(
  brawler: Brawler,
  mode: GameMode | undefined,
  isComfort: boolean,
): number {
  if (!isComfort) return 0;
  if (!mode) return COMFORT_BONUS_FULL;
  const fit = getModeFit(brawler, mode);
  return fit === 'poor' ? COMFORT_BONUS_WEAK_FIT : COMFORT_BONUS_FULL;
}

// ============================================================
// 1.2 — SCORE DE BAN (HEURÍSTICO + HISTÓRICO BLENDADO)
// ============================================================

/** Pesos de tier para o score de ban */
const TIER_BAN_SCORES: Record<string, number> = {
  S: 100,
  A: 80,
  B: 60,
  C: 40,
  D: 20,
};

/**
 * Calcula o score de sugestão de ban combinando heurísticas com histórico real.
 *
 * Fórmula:
 *   banScore = ruleScore + historicalBanBonus
 *
 *   ruleScore = tierScore + terrainTypeBonus
 *     tierScore:       S=100, A=80, B=60, C=40, D=20
 *     terrainBonus (inimigo tem first pick, mapa Aberto + Tiro preciso): +20
 *     terrainBonus (TBK tem first pick, Algoz ou Controle): +15
 *
 *   historicalBanBonus = (winrateInimigo - 50) * min(picksNesteMapaInimigo, 10) * 8
 *     Padrão análogo ao historicalBonus de picks (weight=10), com weight=8
 *     para preservar mais peso às regras base no cenário de ban.
 *
 * Cold start (0 picks históricos no mapa): historicalBanBonus = 0 (regra pura).
 */
export function computeBanScore(
  brawler: Brawler,
  terrain: MapTerrain,
  tbkStarts: boolean,
  enemyPickStats: EnemyPickStatsMap,
): number {
  let ruleScore = TIER_BAN_SCORES[brawler.tier] ?? 0;

  // Bônus de heurística de terreno
  if (!tbkStarts) {
    // Inimigo tem first pick → prioriza banir Snipers e Tier S
    if (terrain === 'Aberto' && brawler.type.includes('Tiro preciso')) ruleScore += 20;
  } else {
    // TBK tem first pick → elimina counters versáteis
    if (brawler.type.includes('Algoz') || brawler.type.includes('Controle')) ruleScore += 15;
  }

  // Bônus histórico (zero em cold start)
  const stat = enemyPickStats[brawler.id];
  if (stat && stat.picks > 0) {
    const historicalBanBonus = (stat.winrate - 50) * Math.min(stat.picks, 10) * 8;
    ruleScore += historicalBanBonus;
  }

  return ruleScore;
}

// ============================================================
// 1.3 — PENALIDADE DE MATCHUP ESPECÍFICO (BRAWLER vs BRAWLER)
// ============================================================

/**
 * Calcula a penalidade de score para um brawler quando existem ameaças
 * históricas já presentes na equipe inimiga do draft atual.
 *
 * Fórmula por ameaça encontrada no time inimigo:
 *   penalty -= min(count, 10) * 10
 *
 * count = número de derrotas históricas TBK quando o brawler alvo encontrou
 * o brawler ameaça no lado inimigo — proxy da força do matchup desfavorável.
 *
 * Padrão: (winrate - 50) * min(picks, 10) * weight, com a distinção de que
 * as entradas de threats já representam derrotas implícitas, então
 * aplicamos a penalidade diretamente pela contagem.
 *
 * @returns número negativo (a ser somado ao score total)
 */
export function computeMatchupPenalty(
  brawlerId: string,
  enemyBrawlerIds: string[],
  threatsCache: ThreatsCacheMap,
): number {
  if (enemyBrawlerIds.length === 0) return 0;
  const threats = threatsCache.get(brawlerId);
  if (!threats || threats.length === 0) return 0;

  let penalty = 0;
  for (const threat of threats) {
    if (enemyBrawlerIds.includes(threat.brawlerId)) {
      penalty -= Math.min(threat.count, 10) * 10;
    }
  }
  return penalty;
}

// ============================================================
// 1.5 — BÔNUS HISTÓRICO (exposto para testes unitários)
// ============================================================

/**
 * Bônus histórico baseado no winrate do brawler TBK em um mapa específico.
 *
 * Fórmula: (winrate - 50) * min(picks, 10) * 10
 *
 * Comportamento garantido pelos testes em draftEngine.test.ts:
 *   Dia 0 (picks === 0)         → bônus = 0
 *   Tier S, wr=30%, picks=10   → -2000 pts → total Tier S < top-3
 *   Tier C, wr=80%, picks=10   → +3000 pts → entra no top-3 à frente de Tier S neutro
 *   Tier D, wr=80%, picks=5    → +1500 pts
 *
 * O multiplicador 10 foi calibrado para que 5–15 partidas registradas
 * sejam suficientes para sobrescrever a diferença máxima de tier base (800 pts).
 */
export function computeHistoricalBonus(winrate: number, picks: number): number {
  return (winrate - 50) * Math.min(picks, 10) * 10;
}
