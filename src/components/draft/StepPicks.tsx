import { BrawlerFilterBar, useBrawlerFilters, applyBrawlerFilters } from "../BrawlerFilters";
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
  ThreatsCacheMap,
} from '../../lib/draftEngineUtils';

import { Brawler, GameMap, Player } from '../../types';
import { buildEvidence, evidenceBonus, confrontationBonus } from '../../lib/matchupEvidence';
import { analyzeCompositions, compositionBalanceAlert, type CompositionInsight } from '../../lib/draftStrategyInsights';
import { cn, fuzzySearch } from '../../lib/utils';
import { Search, Shield, Target, Swords, Flame, AlertTriangle, MapPin, Gamepad2, Undo2, ArrowLeft, ArrowRight } from 'lucide-react';
import { BrawlerArtwork } from '../ui/BrawlerArtwork';

interface StepPicksProps {
  onUndo?: () => void;
  draftState: DraftState;
  setDraftState: React.Dispatch<React.SetStateAction<DraftState>>;
  onNext: () => void;
  onPrev: () => void;
}

// 1-2-2-1 snake draft order
const getPickOrder = (allyStarts: boolean): ('ally' | 'enemy')[] => {
  return allyStarts 
    ? ['ally', 'enemy', 'enemy', 'ally', 'ally', 'enemy'] 
    : ['enemy', 'ally', 'ally', 'enemy', 'enemy', 'ally'];
};

export function StepPicks({ onUndo, draftState, setDraftState, onNext, onPrev }: StepPicksProps) {
  const brawlerFilters = useBrawlerFilters();
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [threatsCache, setThreatsCache] = useState<ThreatsCacheMap>(new Map());
  const [evidence, setEvidence] = useState<ReturnType<typeof buildEvidence> | null>(null);
  const [savedCompositions, setSavedCompositions] = useState<CompositionInsight[]>([]);

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

      // Índice único de partidas para recomendações de todos os brawlers.
      const [recordedMatches, recordedPicks] = await Promise.all([
        analyticsService.getAllMatches(), analyticsService.getAllPicks()
      ]);
      const index = buildEvidence(recordedMatches,recordedPicks,mData);
      setEvidence(index);
      const threats = new Map<string,{brawlerId:string; count:number}[]>();
      for(const b of bData) threats.set(b.id,index.relationEntries(b.id,'threat',b.counteredBy)
        .map(t => ({brawlerId:t.id,count:t.matches})));
      setThreatsCache(threats);
    }
    loadRealData();
  }, []);



  
  useEffect(()=>{
    let cancelled=false;
    if(!draftState.mapId){setSavedCompositions([]);return;}
    Promise.all([mapService.getCompsByMap(draftState.mapId),analyticsService.getAllMatches(),analyticsService.getAllPicks()])
      .then(([comps,matches,picks])=>{if(!cancelled)setSavedCompositions(analyzeCompositions(comps,matches,picks));})
      .catch(error=>{console.warn('Composições indisponíveis',error);if(!cancelled)setSavedCompositions([]);});
    return ()=>{cancelled=true;};
  },[draftState.mapId]);

  const pickOrder = getPickOrder(draftState.allyStarts);
  const currentPickIndex = draftState.picks.length;
  const isDraftComplete = currentPickIndex === 6;
  
  const currentTeamPicking = isDraftComplete ? null : pickOrder[currentPickIndex];

  // Combine bans and already picked brawlers
  const unavailableBrawlerIds = [
    ...draftState.allyBans,
    ...draftState.enemyBans,
    ...draftState.picks.map(p => p.brawlerId)
  ].filter(id => id !== null) as string[];

  const handlePick = (brawlerId: string) => {
    if (isDraftComplete) return;
    
    setDraftState(prev => ({
      ...prev,
      picks: [...prev.picks, { brawlerId, team: currentTeamPicking! }]
    }));
    brawlerFilters.setSearch('');
  };

  const handleUndoPick = () => {
    if (onUndo) {
      onUndo();
    } else {
      setDraftState(prev => ({
        ...prev,
        picks: prev.picks.slice(0, -1)
      }));
    }
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
   *    - Contra 1+ Tanque inimigo (Destruidor/Controle): +150 pts.
   *    - Equilíbrio de Papéis do Trio Nossa equipe: +30 pts.
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
    contextSummary?: string;
    interactionNotes?: string[];
    modeFit: 'good' | 'neutral' | 'poor';
    counterThreatWarning?: string;
  })[] => {
    if (!currentTeamPicking || currentTeamPicking === 'enemy') return [];

    const available = brawlers.filter(b => !unavailableBrawlerIds.includes(b.id));
    const enemyTeamIds = draftState.picks.filter(p => p.team === 'enemy').map(p => p.brawlerId);
    const allyTeamIds = draftState.picks.filter(p => p.team === 'ally').map(p => p.brawlerId);

    const enemyBrawlers = enemyTeamIds.map(id => brawlers.find(b => b.id === id)!).filter(Boolean);
    const allyBrawlers = allyTeamIds.map(id => brawlers.find(b => b.id === id)!).filter(Boolean);

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
      const comfortPlayer = evidence?.comfort(brawler.id,
         players.filter(p => p.isActive !== false && p.is_active !== false))[0]
         ?? players.filter(p => p.isActive !== false && p.is_active !== false)
           .find(p => (p.comfortBrawlers || []).includes(brawler.id));
       // Classificação de encaixe no modo atual
      const modeFit = map ? getModeFit(brawler, map.mode) : 'neutral';
       if (modeFit === 'poor') score -= 340;
       if (modeFit === 'good') score += 80;

      if (comfortPlayer) {
        isComfort = true;
        comfortPlayerName = 'playerName' in comfortPlayer ? comfortPlayer.playerName : (comfortPlayer.nickname || comfortPlayer.name);
        // computeComfortBonus aplica +350 (bom/neutro) ou +100 (fraco) conforme modeFit
        score += computeComfortBonus(brawler, map?.mode, true);
        if ('sample' in comfortPlayer && comfortPlayer.sample.matches >= 5) {
          if (comfortPlayer.sample.adjustedWinrate >= 60) score += 130;
          if (comfortPlayer.sample.adjustedWinrate <= 40) score -= 150;
        }
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
      if (enemyTanksCount >= 1 && (brawler.type.includes('Destruidor') || brawler.type.includes('Controle'))) {
        score += 150;
      }

      const enemyThrowersCount = enemyBrawlers.filter(b => b.type.includes('Artilharia')).length;
      if (enemyThrowersCount >= 2 && (brawler.name === 'Mortis' || brawler.name === 'Mico' || brawler.name === 'Edgar')) {
        score += 180; // bônus heurístico limitado
      } else if (enemyThrowersCount >= 1 && (brawler.type.includes('Algoz') || brawler.type.includes('Tanque'))) {
        score += 250;
      }

      // 4.1 Matchup Híbrido com Curadoria Manual (Ele Countera vs Sofre Para)
      // Identifica quais picks do time inimigo este brawler countera ou sofre para
      const activeEnemyCountersList: string[] = []; // Inimigos que ele countera
      const activeEnemySufferingList: string[] = []; // Inimigos para os quais ele sofre
      const interactionNotes: string[] = [];
      let interactionScore = 0;

      enemyBrawlers.forEach(enemy => {
        // Verifica se o nosso brawler tem esse inimigo na lista 'counters' (ou se o inimigo tem o nosso na lista 'counteredBy')
        if (brawler.counters?.includes(enemy.id) || enemy.counteredBy?.includes(brawler.id)) {
          activeEnemyCountersList.push(enemy.name);
          score += 170; // bônus manual
        }
        // Verifica se o nosso brawler sofre para esse inimigo
        if (brawler.counteredBy?.includes(enemy.id) || enemy.counters?.includes(brawler.id)) {
          activeEnemySufferingList.push(enemy.name);
          score -= 170; // penalidade manual
        }
      });

      // Sinergia com picks do time Nossa equipe
      if (allyBrawlers.length > 0) {
        const hasTank = allyBrawlers.some(b => b.type.includes('Tanque'));
        const hasSniper = allyBrawlers.some(b => b.type.includes('Tiro preciso'));
        if (!hasTank && brawler.type.includes('Tanque')) score += 30;
        if (!hasSniper && brawler.type.includes('Tiro preciso')) score += 30;
      }

      // Penalidades de Terreno (Curto Alcance em Mapa Aberto)
      if (map?.terrain === 'Aberto' && (brawler.type.includes('Tanque') || (brawler.health === 'Alta' && !brawler.type.includes('Tiro preciso')))) {
        score -= 500;
      }

      // Todos os brawlers são analisados por histórico geral, modo e mapa.
      let contextSummary: string | undefined;
      if (evidence && map) {
        const perf = evidence.performance(brawler.id,map.mode,map.id);
        mapPicksCount = perf.map.matches;
        mapWinrate = perf.map.winrate ?? 50;
        score += evidenceBonus(perf);
        const fmt = (sample: typeof perf.global) => sample.matches
          ? `${sample.winrate}% (${sample.wins}/${sample.matches})` : 'sem dados';
        contextSummary = `Geral: ${fmt(perf.global)} · Modo: ${fmt(perf.mode)} · Mapa: ${fmt(perf.map)}`;
        if (isComfort && perf.map.matches >= 5 && perf.map.adjustedWinrate >= 60) {
          isStrongMapComfort = true;
          score += 140;
        }
        for (const ally of allyBrawlers) {
          const together = evidence.withAlly(brawler.id,ally.id);
          if (together.matches >= 5) score += Math.round((together.adjustedWinrate-50)*2*Math.min(together.matches/10,1));
        }
        for (const enemy of enemyBrawlers) {
          const vs = evidence.against(brawler.id,enemy.id,map.mode,map.id);
          interactionScore += confrontationBonus(vs);
          if (vs.global.matches >= 5 && vs.global.winrate !== null) {
            if (vs.global.winrate >= 60 && !activeEnemyCountersList.includes(enemy.name)) activeEnemyCountersList.push(enemy.name);
            if (vs.global.winrate <= 40 && !activeEnemySufferingList.includes(enemy.name)) activeEnemySufferingList.push(enemy.name);
            const modeNote = vs.mode.matches >= 3 && vs.mode.winrate !== null
              ? ` · modo ${vs.mode.winrate}%/${vs.mode.matches}j` : '';
            const mapNote = vs.map.matches >= 3 && vs.map.winrate !== null
              ? ` · mapa ${vs.map.winrate}%/${vs.map.matches}j` : '';
            interactionNotes.push(`Contra equipe com ${enemy.name}: geral ${vs.global.winrate}% em ${vs.global.matches}j; últimas ${vs.global.recentMatches}: ${vs.global.recentWins} vitória(s)${modeNote}${mapNote}. Resultado do trio, não duelo isolado.`);
          }
        }
        // Os confrontos contra três inimigos da mesma partida não são independentes.
        score += Math.max(-450,Math.min(450,interactionScore));
      }

      // 7. Aviso Preditivo de Counter-Threat (1.4 — não afeta score)
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
            `Possível ameaça (curadoria ou histórico): ${namesStr}. Não é prova de duelo.`;
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
        contextSummary,
        interactionNotes,
        modeFit,
        counterThreatWarning,
        activeEnemyCountersList,
        activeEnemySufferingList,
      };
    });

    return scoredBrawlers.sort((a, b) => b.score - a.score).slice(0, 3);
  };

  const recommendations = useMemo(
    () => getRecommendedBrawlers(),
    // threatsCache incluído para que o aviso de counter-threat e a penalidade de matchup
    // sejam recalculados quando o cache carrega ou quando o draft muda
    [draftState, unavailableBrawlerIds, brawlers, maps, players, evidence, threatsCache]
  );
  const bestRecommendationId = recommendations[0]?.id;

  const unbalancedAlert = useMemo(() => {
    const allyTeamIds = draftState.picks.filter(p => p.team === 'ally').map(p => p.brawlerId);
    const allyBrawlers = allyTeamIds.map(id => brawlers.find(b => b.id === id)!).filter(Boolean);
    const map = maps.find(m => m.id === draftState.mapId);

    return compositionBalanceAlert(allyBrawlers,map??null);
  }, [draftState.picks, draftState.mapId, brawlers, maps]);

  // Composições serão planejadas em sessão futura com tabela dedicada no banco
  const recommendedComp = useMemo(()=>{
    if(!currentTeamPicking || currentTeamPicking!=='ally')return null;
    const allies=draftState.picks.filter(p=>p.team==='ally').map(p=>p.brawlerId);
    const enemies=draftState.picks.filter(p=>p.team==='enemy').map(p=>p.brawlerId);
    const blocked=new Set([...draftState.allyBans,...draftState.enemyBans,...enemies]);
    const options=savedCompositions.filter(entry=>
      entry.composition.mapId===draftState.mapId
      && entry.composition.brawlers.every(id=>!blocked.has(id))
      && allies.every(id=>entry.composition.brawlers.includes(id))
    ).map(entry=>{
      const brawlersList=entry.composition.brawlers.map(id=>brawlers.find(b=>b.id===id)).filter((b):b is Brawler=>Boolean(b));
      const threats=entry.threats.filter(t=>
        !draftState.allyBans.includes(t.brawlerId) && !draftState.enemyBans.includes(t.brawlerId));
      const manualWarnings=enemies.flatMap(enemyId=>{
        const enemy=brawlers.find(b=>b.id===enemyId);
        if(!enemy)return [];
        return brawlersList.filter(member=>member.counteredBy?.includes(enemyId)
          || enemy.counters?.includes(member.id)).map(member=>`${enemy.name} ameaça ${member.name} (curadoria manual)`);
      });
      const manualAdvantages=enemies.flatMap(enemyId=>{
        const enemy=brawlers.find(b=>b.id===enemyId);
        if(!enemy)return [];
        return brawlersList.filter(member=>member.counters?.includes(enemyId)
          || enemy.counteredBy?.includes(member.id)).map(member=>`${member.name} apresenta vantagem cadastrada sobre ${enemy.name}`);
      });
      return {...entry,brawlersList,threats,manualWarnings,manualAdvantages,description:entry.composition.description||'Trio cadastrado',
        weight:allies.length*150+brawlersList.reduce((total,b)=>total+(({S:100,A:80,B:60,C:40,D:20} as Record<string,number>)[b.tier]??40),0)
          +Math.min(entry.matches,10)*(entry.winrate===null?0:(entry.winrate-50)*0.6)
          -threats.reduce((total,t)=>total+Math.min(35,t.matches*8),0)
          -manualWarnings.length*45+Math.min(manualAdvantages.length*30,90)
      };
    }).filter(entry=>entry.brawlersList.length===3);
    return options.sort((a,b)=>b.weight-a.weight)[0]??null;
  },[savedCompositions,brawlers,draftState.picks,draftState.allyBans,draftState.enemyBans,draftState.mapId,currentTeamPicking]);

  const filteredBrawlers = useMemo(() => {
    return applyBrawlerFilters(brawlers, brawlerFilters);
  }, [brawlers, brawlerFilters.search, brawlerFilters.tier, brawlerFilters.brawlerClass, brawlerFilters.rarity, brawlerFilters.sortOrder]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredBrawlers.length > 0) {
      const firstAvailable = filteredBrawlers.find(b => !unavailableBrawlerIds.includes(b.id));
      if (firstAvailable) {
        handlePick(firstAvailable.id);
      }
    }
  };

  const selectedMap = useMemo(
    () => maps.find(m => m.id === draftState.mapId),
    [maps, draftState.mapId]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Pick Progress & Current Turn */}
      <div className="flex flex-col mb-6 gap-4">
        <div className="text-center w-full">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white whitespace-nowrap">
            {isDraftComplete ? "Draft Concluído" : `Vez da ${currentTeamPicking === 'ally' ? 'Nossa equipe' : 'Inimigo'} escolher`}
          </h2>
          {!isDraftComplete && (
            <p className="text-sm text-slate-500 dark:text-zinc-400">Pick {currentPickIndex + 1} de 6</p>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-3 w-full">
          <button 
            onClick={onPrev} 
            className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-sm w-full sm:w-auto justify-center flex-1 sm:flex-none"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          
          <button 
            onClick={onNext} 
            disabled={!isDraftComplete}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:bg-zinc-800 disabled:text-zinc-600 text-slate-900 dark:text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-sm w-full sm:w-auto justify-center flex-1 sm:flex-none"
          >
            Avançar <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selected Map & Mode Display Banner */}
      {selectedMap && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            {selectedMap.imageUrl ? (
              <img src={selectedMap.imageUrl} alt={selectedMap.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-zinc-800" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1]">
                <MapPin className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Gamepad2 className="w-3.5 h-3.5 text-[#6366F1]" /> Mapa & Modo Selecionados
                </span>
                <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-medium border border-slate-200 dark:border-zinc-700">
                  {selectedMap.terrain}
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{selectedMap.name}</span>
                <span className="text-slate-400 dark:text-zinc-600">•</span>
                <span className="text-[#22D3EE] font-semibold">{selectedMap.mode}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2A2A2A] text-slate-600 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>First Pick: <strong className="text-slate-900 dark:text-white">{draftState.allyStarts ? 'Nossa equipe (Nosso)' : 'Inimigo'}</strong></span>
          </div>
        </div>
      )}

      {/* Draft Slots Visualization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
        {/* Nossa equipe Team */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4 border-b border-emerald-500/30 pb-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-emerald-400">Time Nossa equipe</span>
          </div>
          {pickOrder.map((team, index) => {
            if (team !== 'ally') return null;
            const pick = draftState.picks[index];
            const brawler = pick ? brawlers.find(b => b.id === pick.brawlerId) : null;
            const isCurrentPick = currentPickIndex === index;

            return (
              <div 
                key={`ally-slot-${index}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
                  brawler ? "bg-white dark:bg-[#1A1A1A] border-emerald-500/50 shadow-sm" : 
                  isCurrentPick ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A]"
                )}
              >
                <div className="w-12 h-12 rounded bg-slate-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-[#2A2A2A]">
                   {brawler && <BrawlerArtwork name={brawler.name} imageUrl={brawler.imageUrl} iconUrl={brawler.iconUrl} preferPortrait className="h-full w-full" />}
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
                   {brawler && <BrawlerArtwork name={brawler.name} imageUrl={brawler.imageUrl} iconUrl={brawler.iconUrl} preferPortrait className="h-full w-full" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composition Recommendation */}
      {!isDraftComplete && currentTeamPicking === 'ally' && recommendedComp && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-4 mb-6 relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-emerald-400">Composição Recomendada: {recommendedComp.description}</h3>
            <span className="ml-auto text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">{recommendedComp.matches ? `${recommendedComp.winrate}% WR (${recommendedComp.wins}/${recommendedComp.matches})` : 'Sem histórico com trio'}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <p className="mb-3 text-xs text-zinc-500">
              Trio salvo: {recommendedComp.matches
                ? `${recommendedComp.wins} vitórias de ${recommendedComp.matches} partidas (últimas ${recommendedComp.lastFive.matches}: ${recommendedComp.lastFive.wins} vitórias).`
                : 'sem partidas registradas com estes três brawlers juntos neste mapa.'}
              {' '}As estatísticas correspondem ao time inteiro, não a duelos isolados.
            </p>
            {recommendedComp.threats.map(t=>(
              <p key={t.brawlerId} className="mb-2 text-xs text-amber-500">
                ⚠️ {brawlers.find(b=>b.id===t.brawlerId)?.name||'Inimigo'}: {t.losses} derrotas em {t.matches} jogos com o trio.
                {t.matches<5?' Amostra pequena; não é counter confirmado.':' Considere a composição inimiga completa.'}
              </p>
            ))}
            {recommendedComp.manualAdvantages.map((note,i)=>(
              <p key={i} className="mb-2 text-xs text-emerald-400">✓ {note}. Esta interação individual não garante a vitória do trio.</p>
            ))}
            {recommendedComp.manualWarnings.map((warning,i)=>(
              <p key={i} className="mb-2 text-xs text-red-400">⚠️ {warning}.</p>
            ))}
            {recommendedComp.brawlersList.map((brawler, i) => {
              const isPickedByUs = draftState.picks.some(p => p.team === 'ally' && p.brawlerId === brawler.id);
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
                     <BrawlerArtwork name={brawler.name} imageUrl={brawler.imageUrl} iconUrl={brawler.iconUrl} className="h-full w-full" />
                   </div>
                   <div>
                     <div className="font-medium text-slate-900 dark:text-white text-sm">{brawler.name}</div>
                     <div className="text-[10px] text-slate-500 dark:text-zinc-500">{isPickedByUs ? 'Já Selecionado' : 'Clique para pegar'}</div>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Engine Recommendations */}
      {!isDraftComplete && currentTeamPicking === 'ally' && recommendations.length > 0 && (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#22D3EE]/50 rounded-xl p-4 mb-6 relative overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.1)]">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-[#22D3EE]" />
            <h3 className="font-semibold text-[#22D3EE]">Sugestões por meta e histórico</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {recommendations.map((rec, i) => (
              <div 
                key={rec.id} 
                onClick={() => handlePick(rec.id)}
                className={cn(
                  "flex-1 border rounded-lg p-3 flex items-start gap-3 cursor-pointer transition-all",
                  i === 0 
                    ? "bg-[#22D3EE]/10 border-[#22D3EE]/50 hover:bg-[#22D3EE]/20 hover:border-[#22D3EE]" 
                    : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A] hover:border-zinc-500"
                )}
              >
                 <div className="w-10 h-10 rounded bg-slate-200 dark:bg-zinc-800 flex-shrink-0 overflow-hidden">
                   <BrawlerArtwork name={rec.name} imageUrl={rec.imageUrl} iconUrl={rec.iconUrl} className="h-full w-full" />
                 </div>
                 <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white flex items-center justify-between gap-1">
                      <span>{rec.name}</span>
                      {i === 0 && <span className="text-[10px] text-[#22D3EE] font-bold uppercase tracking-wider bg-[#22D3EE]/20 px-1.5 py-0.5 rounded">Top Pick</span>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Score: <span className={rec.score > 0 ? "text-emerald-400" : "text-red-400"}>{rec.score}</span></div>
                    {rec.mapPicksCount > 0 && (
                      <div className={cn(
                        "text-[10px] font-semibold mt-1 border px-1.5 py-0.5 rounded flex items-center justify-between gap-1",
                        rec.mapPicksCount < 5 
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500" 
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      )}>
                        <span className="truncate">
                          {rec.mapPicksCount < 12 ? '⚠️ Amostra limitada' : '📊 Histórico mais amplo'} ({rec.mapPicksCount} {rec.mapPicksCount === 1 ? 'jogo' : 'jogos'})
                        </span>
                        <span>{rec.mapWinrate}% WR</span>
                      </div>
                    )}
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
                    {/* Badge Positivo: Countera Picks Inimigos */}
                    {rec.activeEnemyCountersList && rec.activeEnemyCountersList.length > 0 && (
                      <div className="text-[10px] text-emerald-400 font-semibold mt-1 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded leading-tight flex items-center gap-1">
                        <Swords className="w-3 h-3 flex-shrink-0 text-emerald-400" />
                        <span>⚔️ Countera {rec.activeEnemyCountersList.join(', ')}</span>
                      </div>
                    )}
                    {/* Badge de Alerta: Sofre Para Picks Inimigos (mas continua sugerido normalmente) */}
                    {rec.activeEnemySufferingList && rec.activeEnemySufferingList.length > 0 && (
                      <div className="text-[10px] text-red-400 font-semibold mt-1 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded leading-tight flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 text-red-400" />
                        <span>⚠️ Sofre para {rec.activeEnemySufferingList.join(', ')}</span>
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
             <div className="relative w-64 z-10">
                <BrawlerFilterBar 
                  filters={brawlerFilters} 
                  compact 
                  onKeyDown={handleKeyDown} 
                />
             </div>
             {draftState.picks.length > 0 && (
               <button onClick={handleUndoPick} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 mt-4 shadow-sm">
                 <Undo2 className="w-4 h-4" /> Desfazer último pick
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
                const isTopPick = brawler.id === bestRecommendationId && !isDraftComplete && currentTeamPicking === 'ally';
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
                            isFirstAvailable ? "ring-2 ring-offset-2 ring-[#6366F1] dark:ring-offset-[#121212]" : "",
                            isTopPick ? "border-2 border-amber-400 animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_15px_rgba(251,191,36,0.6)]" : 
                            isTierS ? "border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]" : "border border-slate-200 dark:border-[#2A2A2A] hover:border-[#6366F1]"
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
                      <BrawlerArtwork name={brawler.name} imageUrl={brawler.imageUrl} iconUrl={brawler.iconUrl} className="h-full w-full" />
                    </div>
                    <span className="text-xs font-medium text-slate-900 dark:text-white truncate w-full text-center">{brawler.name}</span>
                    {!isUnavailable && <span className={cn("text-[10px] font-bold", isTierS ? "text-[#22D3EE]" : "text-slate-500 dark:text-zinc-500")}>Tier {brawler.tier}</span>}
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
          <button onClick={handleUndoPick} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 mb-8 mx-auto shadow-sm">
            <Undo2 className="w-4 h-4" /> Desfazer último pick
          </button>
        </div>
      )}
    </div>
  );
}
