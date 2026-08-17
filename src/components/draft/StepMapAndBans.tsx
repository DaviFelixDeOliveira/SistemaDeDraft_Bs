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

    analyticsService.getMapDetailStats(draftState.mapId).then(stats => {
      const enemyPickStats: EnemyPickStatsMap = (stats as any).allEnemyPickStats ?? {};
      const hasHistoricalData = Object.values(enemyPickStats).some(s => s.picks > 0);
      const totalMapMatches = stats.totalMatches ?? 0;

      // Calcula scores de ban para todos os brawlers disponíveis
      const available = brawlers.filter(
        b => !draftState.tbkBans.includes(b.id) && !draftState.enemyBans.includes(b.id)
      );

      const scored = available
        .map(b => ({
          brawler: b,
          score: computeBanScore(b, selectedMap.terrain, draftState.tbkStarts, enemyPickStats),
        }))
        .sort((a, b) => b.score - a.score);

      const topBrawlers = scored.slice(0, 4).map(s => s.brawler);

      // Razão dinâmica: data-driven ou cold start
      let reason: string;
      if (hasHistoricalData) {
        reason = `Baseado em ${totalMapMatches} partida${totalMapMatches !== 1 ? 's' : ''} neste mapa — brawlers com alto winrate inimigo no mapa recebem prioridade de ban.`;
      } else if (!draftState.tbkStarts) {
        if (selectedMap.terrain === 'Aberto') {
          reason = 'O Inimigo tem o First Pick num Mapa Aberto. Priorize banir Snipers ou Brawlers Tier S.';
        } else {
          reason = 'O Inimigo tem o First Pick. Priorize banir os brawlers mais fortes do Meta (Tier S).';
        }
      } else {
        if (selectedMap.terrain === 'Aberto') {
          reason = 'A TBK tem o First Pick num Mapa Aberto. Bana Assassinos (Algozes) que possam ser counters do nosso pick.';
        } else {
          reason = 'A TBK tem o First Pick. Elimine os counters mais versáteis ou Algozes para proteger sua escolha.';
        }
      }

      setBanRecs({ brawlers: topBrawlers, reason });
      setIsSuggestionsLoading(false);
    }).catch(() => {
      setIsSuggestionsLoading(false);
    });
  }, [draftState.mapId, draftState.tbkStarts, draftState.tbkBans, draftState.enemyBans, brawlers, maps]);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNextClick = () => {
    if (draftState.mapId === '') {
      showToast("Selecione um mapa para continuar!");
      return;
    }
    if (draftState.tbkBans.some(b => b === null) || draftState.enemyBans.some(b => b === null)) {
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
    draftState.tbkBans.every(b => b !== null) && 
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
                    className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded-md pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
                    value={mapSearch}
                    onChange={(e) => setMapSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
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
                        className="flex items-center justify-between px-4 py-2 hover:bg-[#FF3366]/10 hover:text-[#FF3366] cursor-pointer text-sm text-slate-700 dark:text-zinc-300 transition-colors"
                        onClick={() => {
                          setDraftState(prev => ({ ...prev, mapId: map.id }));
                          setIsMapDropdownOpen(false);
                        }}
                      >
                        <span>{map.name}</span>
                        <button 
                          className="p-1 hover:bg-[#FF3366]/20 rounded-md text-slate-500 dark:text-zinc-500 hover:text-[#FF3366]"
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
            onClick={() => setDraftState(prev => ({ ...prev, tbkStarts: true }))}
            className={cn(
              "flex-1 py-4 rounded-lg font-medium border transition-all duration-200",
              draftState.tbkStarts 
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A] text-slate-500 dark:text-zinc-500 hover:border-zinc-700"
            )}
          >
            TBK começa
          </button>
          <button
            onClick={() => setDraftState(prev => ({ ...prev, tbkStarts: false }))}
            className={cn(
              "flex-1 py-4 rounded-lg font-medium border transition-all duration-200",
              !draftState.tbkStarts 
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
        <div className="bg-white dark:bg-[#1A1A1A] border border-[#FFCC00]/40 rounded-xl p-4 shadow-[0_0_15px_rgba(255,204,0,0.05)]">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-[#FFCC00] mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[#FFCC00] text-sm mb-1">Sugestão Inteligente de Bans</h3>
              {isSuggestionsLoading ? (
                 <div className="py-4 flex flex-col items-center justify-center">
                   <div className="w-6 h-6 rounded-full border-2 border-[#FFCC00]/20 border-t-[#FFCC00] animate-spin mb-2" />
                   <span className="text-xs text-[#FFCC00] font-medium">Analisando mapa e composições...</span>
                 </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">{banRecs.reason}</p>
                  
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
            <h3 className="font-semibold text-emerald-400">Bans da TBK</h3>
          </div>
          {[0, 1, 2].map(index => (
            <BrawlerSelectDropdown icon={<Ban className="w-3 h-3 text-red-500/70 ml-1" />}
              key={`tbk-ban-${index}`}
              placeholder={`Ban ${index + 1}`}
              value={draftState.tbkBans[index]}
              onChange={(brawlerId) => {
                const newBans = [...draftState.tbkBans];
                newBans[index] = brawlerId;
                setDraftState(prev => ({ ...prev, tbkBans: newBans }));
              }}
              disabledBrawlers={draftState.tbkBans.filter((b, i) => b !== null && i !== index) as string[]}
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

