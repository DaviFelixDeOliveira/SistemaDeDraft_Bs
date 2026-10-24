import { getBrawlerBgColor } from "../../lib/utils";
import React from "react";
import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Eye, Ban, Lightbulb } from 'lucide-react';
import { DraftState } from './DraftWizard';
import { mapService } from '../../services/mapService';
import { brawlerService } from '../../services/brawlerService';
import { analyticsService } from '../../services/analyticsService';
import { GameMap, Brawler } from '../../types';
import { MapDetailsView } from '../ui/MapDetailsView';
import { BrawlerSelectDropdown } from '../ui/BrawlerSelectDropdown';
import { cn, fuzzySearch } from '../../lib/utils';
import { computeBanScore, EnemyPickStatsMap } from '../../lib/draftEngineUtils';
import { analyzeCompositions, planDraftOpening, type CompositionInsight } from '../../lib/draftStrategyInsights';
import { BrawlerFilterBar, useBrawlerFilters, applyBrawlerFilters } from '../BrawlerFilters';

interface StepMapAndBansProps {
  draftState: DraftState;
  setDraftState: React.Dispatch<React.SetStateAction<DraftState>>;
  onNext: () => void;
}

export function StepMapAndBans({ draftState, setDraftState, onNext }: StepMapAndBansProps) {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [mapSearch, setMapSearch] = useState('');
  const [isMapDropdownOpen, setIsMapDropdownOpen] = useState(false);
  const [viewingMap, setViewingMap] = useState<GameMap | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [banRecs, setBanRecs] = useState<{ brawlers: Brawler[]; reason: string }>({ brawlers: [], reason: '' });
  const [firstPickCandidates, setFirstPickCandidates] = useState<Brawler[]>([]);
  const [compInsights, setCompInsights] = useState<CompositionInsight[]>([]);

  useEffect(() => {
    Promise.all([mapService.getMaps(), brawlerService.getBrawlers()]).then(([mData, bData]) => {
      setMaps(mData);
      setBrawlers(bData);
    });
  }, []);

  /**
   * Carrega sugestões de ban com blending histórico (1.2).
   * Usa computeBanScore (heurística + allEnemyPickStats do mapa).
   * Em cold start (0 partidas no mapa), recai nas regras puras.
   */
  useEffect(() => {
    if (!draftState.mapId || brawlers.length === 0) {
      setBanRecs({ brawlers: [], reason: '' });
      return;
    }

    const selectedMap = maps.find(m => m.id === draftState.mapId);
    if (!selectedMap) return;

    setIsSuggestionsLoading(true);

    let cancelled=false;
    void Promise.all([
      analyticsService.getMapDetailStats(draftState.mapId),
      mapService.getCompsByMap(draftState.mapId),
      analyticsService.getAllMatches(),
      analyticsService.getAllPicks()
    ]).then(([stats,comps,matches,picks])=>{
      if(cancelled)return;
      const enemyPickStats:EnemyPickStatsMap=stats.allEnemyPickStats??{};
      const banned=[...draftState.allyBans,...draftState.enemyBans].filter(Boolean) as string[];
      const {plannedPicks,reserved}=planDraftOpening(brawlers,selectedMap,draftState.allyStarts,banned);
      setFirstPickCandidates(plannedPicks);
      const findings=analyzeCompositions(comps,matches,picks);
      setCompInsights(findings);

      // Os melhores first picks da nossa equipe não são banidos por nós.
      const scored=brawlers.filter(b=>!banned.includes(b.id)&&!reserved.has(b.id))
        .map(b=>{
          const relevant=findings.flatMap(entry=>entry.threats.filter(t=>t.brawlerId===b.id));
          const compositionCaution=Math.min(18,relevant.length*8);
          return {brawler:b,score:computeBanScore(b,selectedMap.terrain,draftState.allyStarts,enemyPickStats)+compositionCaution};
        }).sort((a,b)=>b.score-a.score);
      const reason=draftState.allyStarts
        ? `Nossa equipe escolhe primeiro: os principais candidatos a first pick aparecem separados e são preservados da sugestão de ban. Histórico de ${stats.totalMatches??0} partida(s) no mapa, com cautela para amostras pequenas.`
        : `Inimigo escolhe primeiro: priorize impedir escolhas fortes no mapa. Histórico de ${stats.totalMatches??0} partida(s); 1 ou 2 resultados isolados não definem o ranking.`;
      setBanRecs({brawlers:scored.slice(0,4).map(x=>x.brawler),reason});
    }).catch(error=>{
      if(!cancelled){
        console.warn('Falha ao analisar bans e composições',error);
        setBanRecs({brawlers:[],reason:'As sugestões estão indisponíveis. Você ainda pode escolher os bans manualmente.'});
        setCompInsights([]);setFirstPickCandidates([]);
      }
    }).finally(()=>{if(!cancelled)setIsSuggestionsLoading(false);});
    return ()=>{cancelled=true;};
  }, [draftState.mapId, draftState.allyStarts, draftState.allyBans, draftState.enemyBans, brawlers, maps]);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNextClick = () => {
    if (draftState.mapId === '') {
      showToast("Selecione um mapa para continuar!");
      return;
    }
    if (draftState.allyBans.some(b => b === null) || draftState.enemyBans.some(b => b === null)) {
      showToast("Preencha todos os banimentos antes de avançar!");
      return;
    }
    onNext();
  };

  const activeMaps = maps.filter(m => m.isActive);
  const groupedMaps = activeMaps.reduce((acc, map) => {
    if (!acc[map.mode]) acc[map.mode] = [];
    acc[map.mode].push(map);
    return acc;
  }, {} as Record<string, GameMap[]>);

  const selectedMap = maps.find(m => m.id === draftState.mapId);

  // banRecs agora é estado async (ver useEffect acima) — removido o useMemo estático


  const canProceed = draftState.mapId !== '' &&
    draftState.allyBans.every(b => b !== null) &&
    draftState.enemyBans.every(b => b !== null);

  const mapDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mapDropdownRef.current && !mapDropdownRef.current.contains(event.target as Node)) {
        setIsMapDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* TOAST MESSAGE */}
      {toastMessage && (
        <div className="fixed top-20 right-4 md:right-8 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-right duration-300">
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}

      {/* MAP SELECTION */}
      <div className="space-y-4 relative">
        <label className="block text-sm font-medium text-slate-500 dark:text-zinc-400">Mapa</label>
        <div className="relative" ref={mapDropdownRef}>
          <div
            className={cn(
              "flex items-center justify-between w-full bg-slate-50 dark:bg-[#0A0A0A] border rounded-lg px-4 py-3 cursor-pointer transition-all duration-300",
              selectedMap ? "border-slate-200 dark:border-[#2A2A2A]" : "border-slate-300 dark:border-zinc-700 hover:border-zinc-400"
            )}
            onClick={() => setIsMapDropdownOpen(!isMapDropdownOpen)}
          >
            <span className={selectedMap ? 'text-slate-900 dark:text-white' : 'text-zinc-600'}>
              {selectedMap ? `[${selectedMap.mode}] ${selectedMap.name}` : 'Selecionar mapa'}
            </span>
            <ChevronDown className="w-5 h-5 text-slate-500 dark:text-zinc-500" />
          </div>

          {isMapDropdownOpen && (
            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-lg shadow-2xl max-h-80 overflow-y-auto">
              <div className="sticky top-0 p-2 bg-white dark:bg-[#1A1A1A] border-b border-slate-200 dark:border-[#2A2A2A]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Buscar mapa..."
                    className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded-md pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#6366F1]"
                    value={mapSearch}
                    onChange={(e) => setMapSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const firstMap = activeMaps.filter(m => fuzzySearch(mapSearch, m.name))[0];
                        if (firstMap) {
                          setDraftState(prev => ({ ...prev, mapId: firstMap.id }));
                          setIsMapDropdownOpen(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {Object.entries(groupedMaps).map(([mode, mapsList]) => {
                const filteredMaps = (mapsList as GameMap[]).filter(m => fuzzySearch(mapSearch, m.name));

                if (filteredMaps.length === 0) return null;
                return (
                  <div key={mode}>
                    <div className="px-3 py-1.5 bg-[#2A2A2A]/50 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                      {mode}
                    </div>
                    {filteredMaps.map(map => (
                      <div
                        key={map.id}
                        className="flex items-center justify-between px-4 py-2 hover:bg-[#6366F1]/10 hover:text-[#6366F1] cursor-pointer text-sm text-slate-700 dark:text-zinc-300 transition-colors"
                        onClick={() => {
                          setDraftState(prev => ({ ...prev, mapId: map.id }));
                          setIsMapDropdownOpen(false);
                        }}
                      >
                        <span>{map.name}</span>
                        <button
                          className="p-1 hover:bg-[#6366F1]/20 rounded-md text-slate-500 dark:text-zinc-500 hover:text-[#6366F1]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingMap(map);
                          }}
                          title="Visualizar Mapa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* WHO STARTS */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-500 dark:text-zinc-400">Quem o jogo escolheu para começar?</label>
        <p className="text-xs text-slate-500 dark:text-zinc-500 -mt-3 mb-2">O primeiro time escolhe 1 brawler, depois alterna 2-2-1 (snake draft).</p>
        <div className="flex gap-4">
          <button
            onClick={() => setDraftState(prev => ({ ...prev, allyStarts: true }))}
            className={cn(
              "flex-1 py-4 rounded-lg font-medium border transition-all duration-200",
              draftState.allyStarts
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A] text-slate-500 dark:text-zinc-500 hover:border-zinc-700"
            )}
          >
            Nossa equipe começa
          </button>
          <button
            onClick={() => setDraftState(prev => ({ ...prev, allyStarts: false }))}
            className={cn(
              "flex-1 py-4 rounded-lg font-medium border transition-all duration-200",
              !draftState.allyStarts
                ? "bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A] text-slate-500 dark:text-zinc-500 hover:border-zinc-700"
            )}
          >
            Inimigo começa
          </button>
        </div>
      </div>

      {/* AI BAN SUGGESTIONS */}
      {selectedMap && (
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#22D3EE]/40 rounded-xl p-4 shadow-[0_0_15px_rgba(34,211,238,0.05)]">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-[#22D3EE] mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[#22D3EE] text-sm mb-1">Sugestão Inteligente de Bans</h3>
              {isSuggestionsLoading ? (
                <div className="py-4 flex flex-col items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-[#22D3EE]/20 border-t-[#22D3EE] animate-spin mb-2" />
                  <span className="text-xs text-[#22D3EE] font-medium">Analisando mapa e composições...</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{banRecs.reason}</p>
                  {draftState.allyStarts && firstPickCandidates.length>0 && (
                    <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-xs font-bold text-emerald-500">Considere reservar os brawlers a seguir:</p>
                      <p className="mt-1 text-xs text-zinc-500">{firstPickCandidates.map(b=>b.name).join(' · ')}. Sugestões baseadas em estatísticas e desempenho.</p>
                    </div>
                  )}
                  {compInsights.length>0&&(
                    <div className="mb-3 space-y-2 rounded-lg border border-indigo-500/25 bg-indigo-500/5 p-3">
                      <p className="text-xs font-bold text-indigo-400">Composições cadastradas neste mapa ({compInsights.length})</p>
                      {compInsights.slice(0,4).map(({composition,matches,wins,threats})=>(
                        <div key={composition.id} className="text-xs text-zinc-500 dark:text-zinc-300">
                          <strong>{composition.brawlers.map(id=>brawlers.find(b=>b.id===id)?.name||id).join(' + ')}</strong>
                          <span> · {matches? `${wins}/${matches} vitórias com o trio` : 'ainda não testada no histórico'}</span>
                          {threats.filter(t=>!draftState.allyBans.includes(t.brawlerId) && !draftState.enemyBans.includes(t.brawlerId)).slice(0,3).map(t=>(
                            <p key={t.brawlerId} className="mt-1 text-amber-500">
                              ⚠️ Se pretende usar este trio, considere banir {brawlers.find(b=>b.id===t.brawlerId)?.name||t.brawlerId}:
                              {t.losses} derrotas em {t.matches} confrontos. {t.matches<5?'Amostra muito pequena: é só um alerta, não um counter comprovado.':'A interação inclui os três adversários.'}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}


                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {banRecs.brawlers.map(b => (
                      <div key={b.id} className="flex items-center gap-2 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded-lg p-2 pr-4 flex-shrink-0">
                        <div className="w-8 h-8 rounded bg-slate-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                          {b.iconUrl && <img src={b.iconUrl} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white leading-tight">{b.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-500">Tier {b.tier}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BANS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
        <div className="space-y-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Ban className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-emerald-400">Nossos Bans</h3>
          </div>
          {[0, 1, 2].map(index => (
            <BrawlerSelectDropdown icon={<Ban className="w-3 h-3 text-red-500/70 ml-1" />}
              key={`ally-ban-${index}`}
              placeholder={`Ban ${index + 1}`}
              value={draftState.allyBans[index]}
              onChange={(brawlerId) => {
                const newBans = [...draftState.allyBans];
                newBans[index] = brawlerId;
                setDraftState(prev => ({ ...prev, allyBans: newBans }));
              }}
              disabledBrawlers={draftState.allyBans.filter((b, i) => b !== null && i !== index) as string[]}
              suggestedBrawlers={banRecs.brawlers.map(b => b.id)}
              allBrawlers={brawlers}
            />
          ))}
        </div>

        <div className="space-y-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Ban className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-red-400">Bans do Inimigo</h3>
          </div>
          {[0, 1, 2].map(index => (
            <BrawlerSelectDropdown icon={<Ban className="w-3 h-3 text-red-500/70 ml-1" />}
              key={`enemy-ban-${index}`}
              placeholder={`Ban ${index + 1}`}
              value={draftState.enemyBans[index]}
              onChange={(brawlerId) => {
                const newBans = [...draftState.enemyBans];
                newBans[index] = brawlerId;
                setDraftState(prev => ({ ...prev, enemyBans: newBans }));
              }}
              disabledBrawlers={draftState.enemyBans.filter((b, i) => b !== null && i !== index) as string[]}
              allBrawlers={brawlers}
            />
          ))}
        </div>

      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={handleNextClick}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 dark:text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Avançar para o draft
        </button>
      </div>

      {/* Map View Modal */}
      {viewingMap && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingMap(null)}>
          <MapDetailsView map={viewingMap} onClose={() => setViewingMap(null)} />
        </div>
      )}
    </div>
  );
}

