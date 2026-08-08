import { getBrawlerBgColor } from "../../lib/utils";
import React from "react";
import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Eye, Ban, Lightbulb } from 'lucide-react';
import { DraftState } from './DraftWizard';
import { mapService } from '../../services/mapService';
import { brawlerService } from '../../services/brawlerService';
import { GameMap, Brawler } from '../../types';
import { MapDetailsView } from '../ui/MapDetailsView';
import { cn, fuzzySearch } from '../../lib/utils';

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

  useEffect(() => {
    Promise.all([mapService.getMaps(), brawlerService.getBrawlers()]).then(([mData, bData]) => {
      setMaps(mData);
      setBrawlers(bData);
    });
  }, []);


  useEffect(() => {
    if (draftState.mapId) {
      setIsSuggestionsLoading(true);
      const timer = setTimeout(() => {
        setIsSuggestionsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [draftState.mapId]);
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

  const banRecs = useMemo(() => {
    if (!selectedMap) return { brawlers: [], reason: '' };
    
    const available = brawlers.filter(b => 
      !draftState.tbkBans.includes(b.id) && 
      !draftState.enemyBans.includes(b.id)
    );

    let recommended: Brawler[] = [];
    let reason = "";

    if (!draftState.tbkStarts) {
      if (selectedMap.terrain === 'Aberto') {
        recommended = available.filter(b => b.type.includes('Tiro preciso') || b.tier === 'S').sort((a,b) => (a.tier === 'S' ? -1 : 1));
        reason = "O Inimigo tem o First Pick num Mapa Aberto. Priorize banir Snipers ou Brawlers Tier S.";
      } else {
        recommended = available.filter(b => b.tier === 'S' || b.tier === 'A').sort((a,b) => (a.tier === 'S' ? -1 : 1));
        reason = "O Inimigo tem o First Pick. Priorize banir os brawlers mais fortes do Meta (Tier S).";
      }
    } else {
      if (selectedMap.terrain === 'Aberto') {
        recommended = available.filter(b => b.type.includes('Algoz'));
        reason = "A TBK tem o First Pick num Mapa Aberto. Bana Assassinos (Algozes) que possam ser counters do nosso pick.";
      } else {
        recommended = available.filter(b => b.type.includes('Algoz') || b.type.includes('Controle'));
        reason = "A TBK tem o First Pick. Elimine os counters mais versáteis ou Algozes para proteger sua escolha.";
      }
    }
    
    return { brawlers: recommended.slice(0, 4), reason };
  }, [selectedMap, brawlers, draftState.tbkStarts, draftState.tbkBans, draftState.enemyBans]);


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
            <BrawlerBanSelect
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
            <BrawlerBanSelect
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
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 dark:text-white px-8 py-3 rounded-lg font-medium transition-colors"
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

interface BrawlerBanSelectProps {
  key?: string; placeholder: string;
  value: string | null;
  onChange: (brawlerId: string) => void;
  disabledBrawlers: string[];
  suggestedBrawlers?: string[];
  allBrawlers: Brawler[];
}

function BrawlerBanSelect({ placeholder, value, onChange, disabledBrawlers, suggestedBrawlers = [], allBrawlers }: BrawlerBanSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBrawler = value ? allBrawlers.find(b => b.id === value) : null;
  const filteredBrawlers = allBrawlers.filter(b => fuzzySearch(search, b.name));

  const sortedBrawlers = useMemo(() => {
    if (!search) {
      return [...allBrawlers].sort((a, b) => {
        const aSug = suggestedBrawlers.includes(a.id);
        const bSug = suggestedBrawlers.includes(b.id);
        if (aSug && !bSug) return -1;
        if (!aSug && bSug) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    return filteredBrawlers;
  }, [allBrawlers, filteredBrawlers, search, suggestedBrawlers]);


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && sortedBrawlers.length > 0) {
      const firstAvailable = sortedBrawlers.find(b => !disabledBrawlers.includes(b.id));
      if (firstAvailable) {
        onChange(firstAvailable.id);
        setIsOpen(false);
        setSearch('');
      }
    }
  };

  const firstAvailableId = sortedBrawlers.find(b => !disabledBrawlers.includes(b.id))?.id;

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        className={cn(
          "flex items-center justify-between w-full bg-slate-50 dark:bg-[#0A0A0A] border rounded-lg px-3 py-2 cursor-pointer transition-colors",
          selectedBrawler ? "border-zinc-600" : "border-slate-200 dark:border-[#2A2A2A] hover:border-zinc-600"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedBrawler ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {selectedBrawler.iconUrl ? (
                <img src={selectedBrawler.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-zinc-500">IMG</span>
              )}
            </div>
            <span className="text-sm text-slate-900 dark:text-white">{selectedBrawler.name}</span>
            <Ban className="w-3 h-3 text-red-500/70 ml-1" />
          </div>
        ) : (
          <span className="text-sm text-zinc-600">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-500 dark:text-zinc-500" />
      </div>

      {isOpen && (
        <div className="absolute z-40 w-full mt-1 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-lg shadow-xl max-h-60 flex flex-col">
          <div className="sticky top-0 p-2 bg-white dark:bg-[#1A1A1A] border-b border-slate-200 dark:border-[#2A2A2A] z-10">
            <input
              autoFocus
              type="text"
              placeholder="Buscar brawler..."
              className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded pl-3 pr-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="p-1 overflow-y-auto flex-1">
            {sortedBrawlers.length > 0 ? (
              sortedBrawlers.map(brawler => {
                const isDisabled = disabledBrawlers.includes(brawler.id);
                const isSuggested = suggestedBrawlers.includes(brawler.id) && !search;
                return (
                  <div
                    key={brawler.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors relative",
                      isDisabled 
                        ? "opacity-40 cursor-not-allowed" 
                        : "hover:bg-[#FF3366]/20 hover:text-[#FF3366] cursor-pointer text-slate-700 dark:text-zinc-300",
                      isSuggested && !isDisabled && "bg-[#FFCC00]/10 border border-[#FFCC00]/30 text-[#FFCC00] hover:text-[#FFCC00]"
                    )}
                    onClick={() => {
                      if (!isDisabled) {
                        onChange(brawler.id);
                        setIsOpen(false);
                      }
                    }}
                  >
                     <div className={cn("w-5 h-5 rounded flex-shrink-0 overflow-hidden", getBrawlerBgColor(brawler))}>
                       {brawler.iconUrl && <img src={brawler.iconUrl} alt="" className="w-full h-full object-cover" />}
                     </div>
                     {brawler.name}
                     {isSuggested && !isDisabled && (
                       <Lightbulb className="w-3 h-3 ml-auto text-[#FFCC00]" />
                     )}
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-sm text-slate-500 dark:text-zinc-400">
                Nenhum brawler encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
