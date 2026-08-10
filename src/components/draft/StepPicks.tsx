import { getBrawlerBgColor, getBrawlerClassIcon } from "../../lib/utils";
import React from "react";
import { useState, useMemo, useEffect } from 'react';
import { DraftState } from './DraftWizard';
import { brawlerService } from '../../services/brawlerService';
import { mapService } from '../../services/mapService';
import { playerService } from '../../services/playerService';
import { analyticsService } from '../../services/analyticsService';
import {
  getModeFit,
  computeComfortBonus,
  computeMatchupPenalty,
  computeHistoricalBonus,
  ThreatsCacheMap,
} from '../../lib/draftEngineUtils';

import { Brawler, GameMap, Player } from '../../types';
import { cn, fuzzySearch } from '../../lib/utils';
import { Search, Shield, Target, Swords, Flame, AlertTriangle } from 'lucide-react';

interface StepPicksProps {
  draftState: DraftState;
  setDraftState: React.Dispatch<React.SetStateAction<DraftState>>;
  onNext: () => void;
  onPrev: () => void;
}

// 1-2-2-1 snake draft order
const getPickOrder = (tbkStarts: boolean): ('tbk' | 'enemy')[] => {
  return tbkStarts 
    ? ['tbk', 'enemy', 'enemy', 'tbk', 'tbk', 'enemy'] 
    : ['enemy', 'tbk', 'tbk', 'enemy', 'enemy', 'tbk'];
};

export function StepPicks({ draftState, setDraftState, onNext, onPrev }: StepPicksProps) {
  const [search, setSearch] = useState('');
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [mapDetailStats, setMapDetailStats] = useState<any>(null);
  const [threatsCache, setThreatsCache] = useState<ThreatsCacheMap>(new Map());

  useEffect(() => {
    async function loadRealData() {
      const [bData, mData, pData] = await Promise.all([
        brawlerService.getBrawlers(),
        mapService.getMaps(),
        playerService.getPlayers()
      ]);
      setBrawlers(bData);
      setMaps(mData);
      setPlayers(pData);

      // Carrega o cache de ameaças históricas para todos os brawlers (1.3)
      // Uma única passagem nos dados — evita N chamadas ao analyticsService.
      if (bData.length > 0) {
        const allIds = bData.map(b => b.id);
        analyticsService.getBrawlerThreatsMap(allIds).then(cache => {
          setThreatsCache(cache);
        });
      }
    }
    loadRealData();
  }, []);

  useEffect(() => {
    if (draftState.mapId) {
      analyticsService.getMapDetailStats(draftState.mapId).then(setMapDetailStats);
    }
  }, [draftState.mapId]);

  
  const pickOrder = getPickOrder(draftState.tbkStarts);
  const currentPickIndex = draftState.picks.length;
  const isDraftComplete = currentPickIndex === 6;
  
  const currentTeamPicking = isDraftComplete ? null : pickOrder[currentPickIndex];

  // Combine bans and already picked brawlers
  const unavailableBrawlerIds = [
    ...draftState.tbkBans,
    ...draftState.enemyBans,
    ...draftState.picks.map(p => p.brawlerId)
  ].filter(id => id !== null) as string[];

  const handlePick = (brawlerId: string) => {
    if (isDraftComplete) return;
    
    setDraftState(prev => ({
      ...prev,
      picks: [...prev.picks, { brawlerId, team: currentTeamPicking! }]
    }));
    setSearch('');
  };

  const handleUndoPick = () => {
    setDraftState(prev => ({
      ...prev,
      picks: prev.picks.slice(0, -1)
    }));
  };

  /**
   * DRAFT ENGINE RECOMMENDATION ALGORITHM (Algoritmo de Recomendação do Draft Wizard)
   * ---------------------------------------------------------------------------------
   * O cálculo de recomendação de brawlers opera sob a regra estrita de DIA 0.
   *
   * Fórmula de Pontuação Base (Dia 0):
   * 1. Meta Tier Base:
   *    - Tier S: +1000 pts
   *    - Tier A: +800 pts
   *    - Tier B: +600 pts
   *    - Tier C: +400 pts
   *    - Tier D: +200 pts
   * 2. Comfort Picks do Elenco Ativo (1.1 — verificação de modo):
   *    - Encaixe bom/neutro no modo: +350 pts.
   *    - Encaixe FRACO no modo: +100 pts + badge de aviso "Conforto fraco neste modo".
   * 3. Adaptação de Terreno e Mecânica do Mapa:
   *    - Terreno Fechado + Quebra Paredes (breaksWalls / howBreaksWalls): +200 pts.
   *    - Terreno Aberto + Sniper (Tiro preciso): +150 pts.
   *    - Terreno Aberto + Curto Alcance (Tanque/Vida Alta sem Tiro preciso): -500 pts.
   *    - Caminha na Água (walksOnWater): +100 pts.
   * 4. Counters e Sinergias:
   *    - Contra 2+ Lançadores inimigos (Hard counters Mortis/Edgar/Mico): +10000 pts.
   *    - Contra 1+ Tanque inimigo (Destruidores/Controle): +150 pts.
   *    - Equilíbrio de Papéis do Trio TBK: +30 pts.
   * 5. Penalidade de Matchup Específico (1.3):
   *    - Por ameaça histórica já na equipe inimiga: -min(count,10)*10 pts por ameaça.
   *
   * Ponderação Histórica Progressiva (Com Partidas Gravadas — 1.5):
   *    - Bônus Histórico = (winrateNoMapa - 50) * Math.min(qtdPicksNoMapa, 10) * 10
   *    - No "Dia 0" (qtdPicksNoMapa === 0), o Bônus Histórico é exatamente 0.
   *
   * Aviso Preditivo de Counter-Threat (1.4):
   *    - Não afeta score. Exibido como badge na recomendação quando ameaças
   *      históricas do brawler ainda estão disponíveis para o inimigo draftar.
   */
  const getRecommendedBrawlers = (): (Brawler & {
    score: number;
    isComfort: boolean;
    comfortPlayerName: string;
    isStrongMapComfort: boolean;
    mapWinrate: number;
    mapPicksCount: number;
    modeFit: 'good' | 'neutral' | 'poor';
    counterThreatWarning?: string;
  })[] => {
    if (!currentTeamPicking || currentTeamPicking === 'enemy') return [];

    const available = brawlers.filter(b => !unavailableBrawlerIds.includes(b.id));
    const enemyTeamIds = draftState.picks.filter(p => p.team === 'enemy').map(p => p.brawlerId);
    const tbkTeamIds = draftState.picks.filter(p => p.team === 'tbk').map(p => p.brawlerId);

    const enemyBrawlers = enemyTeamIds.map(id => brawlers.find(b => b.id === id)!).filter(Boolean);
    const tbkBrawlers = tbkTeamIds.map(id => brawlers.find(b => b.id === id)!).filter(Boolean);

    const map = maps.find(m => m.id === draftState.mapId);

    // IDs banidos + já pickados (para filtro do aviso de counter-threat)
    const allUsedIds = new Set(unavailableBrawlerIds);

    const scoredBrawlers = available.map(brawler => {
      let score = 0;
      let isComfort = false;
      let comfortPlayerName = '';
      let isStrongMapComfort = false;
      let mapWinrate = 50;
      let mapPicksCount = 0;

      // 1. Meta Tier Base (Peso Primário no Dia 0)
      if (brawler.tier === 'S') score += 1000;
      else if (brawler.tier === 'A') score += 800;
      else if (brawler.tier === 'B') score += 600;
      else if (brawler.tier === 'C') score += 400;
      else if (brawler.tier === 'D') score += 200;

      // 2. Comfort Picks do Elenco Ativo — com verificação de encaixe de modo (1.1)
      const comfortPlayer = players.find(p => {
        if (p.isActive === false || p.is_active === false) return false;
        if (!p.comfortBrawlers || !Array.isArray(p.comfortBrawlers)) return false;
        return p.comfortBrawlers.some(cb =>
          cb === brawler.id ||
          cb.toLowerCase() === brawler.id.toLowerCase() ||
          cb.toLowerCase() === brawler.name.toLowerCase()
        );
      });

      // Classificação de encaixe no modo atual
      const modeFit = map ? getModeFit(brawler, map.mode) : 'neutral';

      if (comfortPlayer) {
        isComfort = true;
        comfortPlayerName = comfortPlayer.nickname || comfortPlayer.name;
        // computeComfortBonus aplica +350 (bom/neutro) ou +100 (fraco) conforme modeFit
        score += computeComfortBonus(brawler, map?.mode, true);
      }

      // 3. Adaptação ao Terreno e Mecânicas Únicas
      if (map) {
        // Quebra paredes em mapas fechados (corrigido: usa camelCase do modelo)
        if (map.terrain === 'Fechado' && (brawler.breaksWalls || (brawler.howBreaksWalls && brawler.howBreaksWalls !== 'N/A'))) {
          score += 200;
        }
        // Atirador de longo alcance em mapa aberto
        if (map.terrain === 'Aberto' && brawler.type.includes('Tiro preciso')) {
          score += 150;
        }
        // Terreno semi-aberto
        if (map.terrain === 'Semi-Aberto' && (brawler.type.includes('Controle') || brawler.type.includes('Algoz'))) {
          score += 150;
        }
        // Caminha sobre a água (corrigido: usa camelCase do modelo)
        if (brawler.walksOnWater) {
          score += 100;
        }
      }

      // 4. Counters Diretos e Sinergias do Trio
      const enemyTanksCount = enemyBrawlers.filter(b => b.type.includes('Tanque')).length;
      if (enemyTanksCount >= 1 && (brawler.type.includes('Destruidores') || brawler.type.includes('Controle'))) {
        score += 150;
      }

      const enemyThrowersCount = enemyBrawlers.filter(b => b.type.includes('Lancadores')).length;
      if (enemyThrowersCount >= 2 && (brawler.name === 'Mortis' || brawler.name === 'Mico' || brawler.name === 'Edgar')) {
        score += 10000; // Absolute top hard counter
      } else if (enemyThrowersCount >= 1 && (brawler.type.includes('Algoz') || brawler.type.includes('Tanque'))) {
        score += 250;
      }

      // Sinergia com picks do time TBK
      if (tbkBrawlers.length > 0) {
        const hasTank = tbkBrawlers.some(b => b.type.includes('Tanque'));
        const hasSniper = tbkBrawlers.some(b => b.type.includes('Tiro preciso'));
        if (!hasTank && brawler.type.includes('Tanque')) score += 30;
        if (!hasSniper && brawler.type.includes('Tiro preciso')) score += 30;
      }

      // Penalidades de Terreno (Curto Alcance em Mapa Aberto)
      if (map?.terrain === 'Aberto' && (brawler.type.includes('Tanque') || (brawler.health === 'Alta' && !brawler.type.includes('Tiro preciso')))) {
        score -= 500;
      }

      // 5. Ponderação Histórica Progressiva (Picks e Winrate no Mapa — 1.5)
      if (mapDetailStats?.topTbkPicks) {
        const brawlerMapPick = mapDetailStats.topTbkPicks.find((tp: any) =>
          tp.brawler?.id === brawler.id || tp.brawler?.name === brawler.name
        );
        if (brawlerMapPick) {
          mapPicksCount = brawlerMapPick.picks || 0;
          mapWinrate = brawlerMapPick.winrate || 50;
          score += computeHistoricalBonus(mapWinrate, mapPicksCount);

          // Super bônus: comfort pick E alto winrate no mapa
          if (isComfort && mapWinrate >= 70 && mapPicksCount >= 2) {
            isStrongMapComfort = true;
            score += 500;
          }
        }
      }

      // 6. Penalidade de Matchup Específico (1.3)
      // Aplica penalidade se o brawler tem ameaças históricas já no time inimigo
      score += computeMatchupPenalty(brawler.id, enemyTeamIds, threatsCache);

      // 7. Aviso Preditivo de Counter-Threat (1.4 — não afeta score)
      // Verifica se as ameaças históricas deste brawler ainda estão disponíveis para o inimigo
      let counterThreatWarning: string | undefined;
      const brawlerThreats = threatsCache.get(brawler.id) ?? [];
      const availableThreats = brawlerThreats.filter(t => !allUsedIds.has(t.brawlerId));
      if (availableThreats.length > 0) {
        const threatNames = availableThreats
          .slice(0, 3)
          .map(t => brawlers.find(b => b.id === t.brawlerId)?.name)
          .filter((name): name is string => !!name);
        if (threatNames.length > 0) {
          const namesStr = threatNames.join(', ');
          counterThreatWarning =
            `Atenção: historicamente perde para ${namesStr}, que o inimigo ainda pode pegar.`;
        }
      }

      return {
        ...brawler,
        score,
        isComfort,
        comfortPlayerName,
        isStrongMapComfort,
        mapWinrate,
        mapPicksCount,
        modeFit,
        counterThreatWarning,
      };
    });

    return scoredBrawlers.sort((a, b) => b.score - a.score).slice(0, 3);
  };

  const recommendations = useMemo(
    () => getRecommendedBrawlers(),
    // threatsCache incluído para que o aviso de counter-threat e a penalidade de matchup
    // sejam recalculados quando o cache carrega ou quando o draft muda
    [draftState, unavailableBrawlerIds, brawlers, maps, players, mapDetailStats, threatsCache]
  );
  const bestRecommendationId = recommendations[0]?.id;

  const unbalancedAlert = useMemo(() => {
    const tbkTeamIds = draftState.picks.filter(p => p.team === 'tbk').map(p => p.brawlerId);
    const tbkBrawlers = tbkTeamIds.map(id => brawlers.find(b => b.id === id)!).filter(Boolean);
    const map = maps.find(m => m.id === draftState.mapId);

    const snipers = tbkBrawlers.filter(b => b.type.includes('Tiro preciso')).length;
    const throwers = tbkBrawlers.filter(b => b.type.includes('Lancadores')).length;
    const tanks = tbkBrawlers.filter(b => b.type.includes('Tanque')).length;

    if (snipers >= 3) return "Atenção: Composição com 3 Atiradores — Alto risco contra Assassinos/Tanques avançados.";
    if (throwers >= 3) return "Atenção: Composição com 3 Lançadores — Vulnerabilidade crítica contra Assassinos.";
    if (tanks >= 3) return "Atenção: Composição com 3 Tanques — Risco contra Brawlers de Controle e Anti-Tanques.";
    
    if (map?.terrain === 'Aberto' && tbkBrawlers.length >= 2 && snipers === 0) {
      return "Atenção: Faltam Atiradores/Controle para este mapa longo.";
    }

    return null;
  }, [draftState.picks, draftState.mapId, brawlers, maps]);

  // Composições serão planejadas em sessão futura com tabela dedicada no banco
  const recommendedComp = null;

  const filteredBrawlers = useMemo(() => {
    return brawlers.filter(b => fuzzySearch(search, b.name));
  }, [search, brawlers]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredBrawlers.length > 0) {
      const firstAvailable = filteredBrawlers.find(b => !unavailableBrawlerIds.includes(b.id));
      if (firstAvailable) {
        handlePick(firstAvailable.id);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Pick Progress & Current Turn */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={onPrev} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:text-white px-4 py-2">Voltar</button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {isDraftComplete ? "Draft Concluído" : `Vez da ${currentTeamPicking === 'tbk' ? 'TBK' : 'Inimigo'} escolher`}
          </h2>
          {!isDraftComplete && (
            <p className="text-sm text-slate-500 dark:text-zinc-400">Pick {currentPickIndex + 1} de 6</p>
          )}
        </div>
        <button 
          onClick={onNext} 
          disabled={!isDraftComplete}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:bg-zinc-800 disabled:text-zinc-600 text-slate-900 dark:text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Avançar
        </button>
      </div>

      {/* Draft Slots Visualization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
        {/* TBK Team */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4 border-b border-emerald-500/30 pb-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-emerald-400">Time TBK</span>
          </div>
          {pickOrder.map((team, index) => {
            if (team !== 'tbk') return null;
            const pick = draftState.picks[index];
            const brawler = pick ? brawlers.find(b => b.id === pick.brawlerId) : null;
            const isCurrentPick = currentPickIndex === index;

            return (
              <div 
                key={`tbk-slot-${index}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
                  brawler ? "bg-white dark:bg-[#1A1A1A] border-emerald-500/50 shadow-sm" : 
                  isCurrentPick ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A]"
                )}
              >
                <div className="w-12 h-12 rounded bg-slate-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-[#2A2A2A]">
                   {brawler && <img src={brawler.imageUrl || brawler.iconUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  {brawler ? (
                    <>
                      <span className="font-bold text-slate-900 dark:text-white leading-tight">{brawler.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {brawler.type.map((t, i) => (
                          <span key={i} className="text-[10px] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">{getBrawlerClassIcon(t, "w-3 h-3")}{t}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-zinc-500 italic">
                      {isCurrentPick ? "Escolhendo..." : "Aguardando..."}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Enemy Team */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4 border-b border-red-500/30 pb-2 flex-row-reverse">
            <Swords className="w-5 h-5 text-red-400" />
            <span className="font-bold text-red-400">Inimigo</span>
          </div>
          {pickOrder.map((team, index) => {
            if (team !== 'enemy') return null;
            const pick = draftState.picks[index];
            const brawler = pick ? brawlers.find(b => b.id === pick.brawlerId) : null;
            const isCurrentPick = currentPickIndex === index;

            return (
              <div 
                key={`enemy-slot-${index}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 flex-row-reverse",
                  brawler ? "bg-white dark:bg-[#1A1A1A] border-red-500/50 shadow-sm" : 
                  isCurrentPick ? "bg-red-500/10 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse" : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A]"
                )}
              >
                <div className="flex-1 flex flex-col justify-center text-right items-end">
                  {brawler ? (
                    <>
                      <span className="font-bold text-slate-900 dark:text-white leading-tight">{brawler.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1 justify-end">
                        {brawler.type.map((t, i) => (
                          <span key={i} className="text-[10px] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">{getBrawlerClassIcon(t, "w-3 h-3")}{t}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-zinc-500 italic w-full">
                      {isCurrentPick ? "Escolhendo..." : "Aguardando..."}
                    </span>
                  )}
                </div>
                <div className="w-12 h-12 rounded bg-slate-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-[#2A2A2A]">
                   {brawler && <img src={brawler.imageUrl || brawler.iconUrl} alt="" className="w-full h-full object-cover" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composition Recommendation */}
      {!isDraftComplete && currentTeamPicking === 'tbk' && recommendedComp && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-4 mb-6 relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-emerald-400">Composição Recomendada: {recommendedComp.description}</h3>
            <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">{recommendedComp.winrate}% WR</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {recommendedComp.brawlersList.map((brawler, i) => {
              const isPickedByUs = draftState.picks.some(p => p.team === 'tbk' && p.brawlerId === brawler.id);
              return (
                <div 
                  key={`rec-comp-${brawler.id}`} 
                  onClick={() => !isPickedByUs && handlePick(brawler.id)}
                  className={cn(
                    "flex-1 border rounded-lg p-3 flex items-start gap-3 transition-all",
                    isPickedByUs 
                      ? "bg-emerald-500/20 border-emerald-500 opacity-50 cursor-default" 
                      : "bg-slate-50 dark:bg-[#0A0A0A] border-emerald-500/30 hover:border-emerald-500 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                  )}
                >
                   <div className="w-10 h-10 rounded bg-slate-200 dark:bg-zinc-800 flex-shrink-0 overflow-hidden">
                     {brawler.iconUrl && <img src={brawler.iconUrl} alt="" className="w-full h-full object-cover" />}
                   </div>
                   <div>
                     <div className="font-medium text-slate-900 dark:text-white text-sm">{brawler.name}</div>
                     <div className="text-[10px] text-slate-500 dark:text-zinc-500">{isPickedByUs ? 'Já Selecionado' : 'Clique para Pickar'}</div>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Engine Recommendations */}
      {!isDraftComplete && currentTeamPicking === 'tbk' && !recommendedComp && recommendations.length > 0 && (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#FFCC00]/50 rounded-xl p-4 mb-6 relative overflow-hidden shadow-[0_0_15px_rgba(255,204,0,0.1)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFCC00]/10 rounded-full blur-3xl animate-pulse" />
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-[#FFCC00]" />
            <h3 className="font-semibold text-[#FFCC00]">Recomendação da IA</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {recommendations.map((rec, i) => (
              <div 
                key={rec.id} 
                onClick={() => handlePick(rec.id)}
                className={cn(
                  "flex-1 border rounded-lg p-3 flex items-start gap-3 cursor-pointer transition-all",
                  i === 0 
                    ? "bg-[#FFCC00]/10 border-[#FFCC00]/50 hover:bg-[#FFCC00]/20 hover:border-[#FFCC00]" 
                    : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A] hover:border-zinc-500"
                )}
              >
                 <div className="w-10 h-10 rounded bg-slate-200 dark:bg-zinc-800 flex-shrink-0 overflow-hidden">
                   {rec.iconUrl && <img src={rec.iconUrl} alt="" className="w-full h-full object-cover" />}
                 </div>
                 <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white flex items-center justify-between gap-1">
                      <span>{rec.name}</span>
                      {i === 0 && <span className="text-[10px] text-[#FFCC00] font-bold uppercase tracking-wider bg-[#FFCC00]/20 px-1.5 py-0.5 rounded">Top Pick</span>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Score: <span className={rec.score > 0 ? "text-emerald-400" : "text-red-400"}>{rec.score}</span></div>
                    {rec.isStrongMapComfort && (
                      <div className="text-[10px] text-emerald-400 font-semibold mt-1 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded leading-tight">
                        🔥 Conforto Forte ({rec.mapWinrate}% WR)
                      </div>
                    )}
                    {!rec.isStrongMapComfort && rec.isComfort && rec.modeFit !== 'poor' && (
                      <div className="text-[10px] text-sky-400 font-semibold mt-1 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded leading-tight">
                        ⭐ Conforto de {rec.comfortPlayerName}
                      </div>
                    )}
                    {!rec.isStrongMapComfort && rec.isComfort && rec.modeFit === 'poor' && (
                      <div className="text-[10px] text-amber-400 font-semibold mt-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded leading-tight flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        Pick de conforto, mas fraco neste modo
                      </div>
                    )}
                    {rec.counterThreatWarning && (
                      <div className="text-[10px] text-orange-400 font-medium mt-1 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded leading-tight flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        {rec.counterThreatWarning}
                      </div>
                    )}
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unbalanced Alert */}
      {unbalancedAlert && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 mb-6 flex items-center gap-3">
           <Flame className="w-5 h-5 text-red-500 flex-shrink-0" />
           <span className="text-sm font-medium text-red-400">{unbalancedAlert}</span>
        </div>
      )}

      {/* Brawler Selection Grid */}
      {!isDraftComplete && (
        <>
        <div className="space-y-4">
          


          <div className="flex justify-between items-center">
             <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar brawler..."
                  className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
             </div>
             {draftState.picks.length > 0 && (
               <button onClick={handleUndoPick} className="text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white underline">
                 Desfazer último pick
               </button>
             )}
          </div>
          </div>
          
          <div className="flex-1 max-h-[50vh] min-h-[300px] overflow-y-auto pr-2 pb-4 scrollbar-thin">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {filteredBrawlers.map(brawler => {
                const isUnavailable = unavailableBrawlerIds.includes(brawler.id);
                const isFirstAvailable = brawler.id === filteredBrawlers.find(b => !unavailableBrawlerIds.includes(b.id))?.id;
                const isTierS = brawler.tier === 'S';
                const isTopPick = brawler.id === bestRecommendationId && !isDraftComplete && currentTeamPicking === 'tbk';
                const isComfort = players.some(p => p.isActive !== false && p.comfortBrawlers?.includes(brawler.id));
                const isStrong = false; // composições serão implementadas em sessão futura
                return (
                  <div
                    key={brawler.id}
                    onClick={() => !isUnavailable && handlePick(brawler.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-all relative overflow-hidden",
                      isUnavailable 
                        ? "opacity-30 cursor-not-allowed grayscale" 
                        : cn(
                            "cursor-pointer bg-white dark:bg-[#1A1A1A] hover:bg-slate-100 dark:hover:bg-[#2A2A2A]",
                            isFirstAvailable ? "ring-2 ring-offset-2 ring-[#FF3366] dark:ring-offset-[#121212]" : "",
                            isTopPick ? "border-2 border-amber-400 animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_15px_rgba(251,191,36,0.6)]" : 
                            isTierS ? "border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]" : "border border-slate-200 dark:border-[#2A2A2A] hover:border-[#FF3366]"
                          )
                    )}
                  >
                    <div className="absolute top-1 right-1 z-10 flex flex-col gap-1">
                      {isComfort && (
                        <div className="bg-emerald-500 rounded-full p-0.5" title="Comfort Pick 🟢">
                          <Shield className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {isStrong && (
                        <div className="bg-violet-500 rounded-full p-0.5" title="Forte no Mapa 🟣">
                          <Target className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {brawler.isHotPick && (
                        <div className="bg-black/60 rounded-full p-0.5" title="Hot Pick 🔥">
                           <Flame className="w-3 h-3 text-orange-500" fill="currentColor" />
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 rounded bg-slate-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                      {brawler.iconUrl && <img src={brawler.iconUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-xs font-medium text-slate-900 dark:text-white truncate w-full text-center">{brawler.name}</span>
                    {!isUnavailable && <span className={cn("text-[10px] font-bold", isTierS ? "text-[#FFCC00]" : "text-slate-500 dark:text-zinc-500")}>Tier {brawler.tier}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {isDraftComplete && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <Swords className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Fase de Picks Concluída</h3>
          <p className="text-slate-500 dark:text-zinc-400 mb-6 max-w-md">Os dois times já selecionaram seus brawlers. Avance para jogar a partida e registrar os resultados.</p>
          <button 
            onClick={handleUndoPick}
            className="text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white underline mb-8"
          >
            Desfazer último pick
          </button>
        </div>
      )}
    </div>
  );
}
