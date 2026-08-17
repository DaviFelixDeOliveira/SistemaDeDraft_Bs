import { getBrawlerBgColor } from "../../lib/utils";
import React, { useState, useEffect } from 'react';
import { mapService } from '../../services/mapService';
import { brawlerService } from '../../services/brawlerService';
import { GameMap, GameMode, Composition, Brawler } from '../../types';
import { cn } from '../../lib/utils';
import { ConfirmModal } from "../ui/ConfirmModal";
import { Search, Map as MapIcon, Info, Flame, Shield, Crosshair, Archive, ArchiveRestore, Plus, Edit } from 'lucide-react';
import { MapDetailsModal, EditMapModal, AddCompModal } from './MapModals';

import { analyticsService } from '../../services/analyticsService';

const GAME_MODES: GameMode[] = [
  'Pique-Gema', 'Fute-Brawl', 'Caça-Estrelas', 'Roubo', 'Zona Estratégica', 'Nocaute'
];

import { UserRole } from '../LockScreen';

interface MapsHubProps {
  userRole?: UserRole;
}

export function MapsHub({ userRole = 'admin' }: MapsHubProps) {
  const isPlayerMode = userRole === 'player';
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [comps, setComps] = useState<Composition[]>([]);
  const [activeMode, setActiveMode] = useState<GameMode>('Pique-Gema');
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, action: (() => void) | null, title: string, message: string, processingText?: string, successText?: string}>({ isOpen: false, action: null, title: '', message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMap, setSelectedMap] = useState<GameMap | null>(null);
  const [viewActive, setViewActive] = useState(true);
  const [isLoadingSwitch, setIsLoadingSwitch] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<GameMap | null>(null);
  const [isAddCompModalOpen, setIsAddCompModalOpen] = useState(false);

  const [dashStats, setDashStats] = useState({ totalMatches: 0, winrate: 0 });
  const [mapStatsMap, setMapStatsMap] = useState<Record<string, any>>({});
  const [modeWinrates, setModeWinrates] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [mData, bData, dStats, cData, mWr] = await Promise.all([
      mapService.getMaps(),
      brawlerService.getBrawlers(),
      analyticsService.getDashboardStats(),
      mapService.getComps(),
      analyticsService.getWinrateByMode()
    ]);
    setMaps(mData);
    setBrawlers(bData);
    setDashStats(dStats);
    setComps(cData);
    setModeWinrates(mWr);

    const statsMap: Record<string, any> = {};
    await Promise.all(mData.map(async (map) => {
      const s = await analyticsService.getMapDetailStats(map.id);
      statsMap[map.id] = s;
    }));
    setMapStatsMap(statsMap);
  };

  const handleSwitchView = (active: boolean) => {
    if (active === viewActive) return;
    setIsLoadingSwitch(true);
    setTimeout(() => {
      setViewActive(active);
      setIsLoadingSwitch(false);
    }, 400);
  };

  const globalWinrate = dashStats.winrate;

  const filteredMaps = maps.filter(map => 
    map.mode === activeMode && 
    (map.isActive === viewActive) &&
    map.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMapStatus = (mapId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const map = maps.find(m => m.id === mapId);
    if (!map) return;
    const isArchiving = map.isActive !== false;

    setConfirmConfig({
      isOpen: true,
      title: isArchiving ? 'Arquivar Mapa' : 'Desarquivar Mapa',
      message: `Tem certeza que deseja ${isArchiving ? 'arquivar' : 'desarquivar'} o mapa ${map.name}?`,
      processingText: isArchiving ? 'Arquivando...' : 'Desarquivando...',
      successText: isArchiving ? '✅ Arquivado com sucesso!' : '✅ Desarquivado com sucesso!',
      action: async () => {
        const nextStatus = !isArchiving;
        await mapService.updateMapStatus(mapId, nextStatus);
        setMaps(prev => prev.map(m => m.id === mapId ? { ...m, isActive: nextStatus, is_active: nextStatus } : m));
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSaveMap = (mapData: Partial<GameMap>) => {
    const isEditing = !!mapData.id;
    setConfirmConfig({
      isOpen: true,
      title: isEditing ? 'Editar Mapa' : 'Adicionar Mapa',
      message: isEditing ? 'Deseja salvar as alterações neste mapa?' : 'Deseja confirmar a adição deste mapa?',
      action: async () => {
        if (isEditing && mapData.id) {
          setMaps(prev => prev.map(m => m.id === mapData.id ? { ...m, ...mapData } as GameMap : m));
        } else {
          const created = await mapService.createMap(mapData as Omit<GameMap, 'id'>);
          setMaps(prev => [...prev, created]);
        }
        setIsAddModalOpen(false);
        setEditingMap(null);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (


    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Mapas e Modos</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Gerencie o meta, visualize taxas de vitória e defina composições ideais.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2 bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] px-4 py-3 rounded-xl shadow-sm min-w-[180px]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Winrate Global</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{globalWinrate}%</span>
              </div>
              <Flame className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
            {/* Winrate Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full relative"
                style={{ width: `${globalWinrate}%` }}
              >
                 <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/60 blur-[1px] rounded-full" />
              </div>
            </div>
          </div>
          
          {!isPlayerMode && (
            <button 
              onClick={() => { setEditingMap(undefined); setIsAddModalOpen(true); }}
              className="bg-[#FF3366] hover:bg-[#E62E5C] text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm h-full"
            >
              <Plus className="w-4 h-4" />
              Novo Mapa
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50/50 dark:bg-zinc-900/20">
          <div className="p-4 border-b border-zinc-200 dark:border-[#2A2A2A]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar mapa..." 
                value={searchQuery}
                onChange={e => {
                  const query = e.target.value;
                  setSearchQuery(query);
                  if (query.length > 1) {
                    const foundMap = maps.find(m => m.name.toLowerCase().includes(query.toLowerCase()) && m.isActive === viewActive);
                    if (foundMap && foundMap.mode !== activeMode) {
                      setActiveMode(foundMap.mode);
                    }
                  }
                }}
                className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366] transition-colors"
              />
            </div>
          </div>
          <div className="p-2 flex overflow-x-auto md:flex-col gap-1">
            {GAME_MODES.map(mode => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  activeMode === mode 
                    ? "bg-[#FF3366]/10 text-[#FF3366]" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <MapIcon className="w-4 h-4" />
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                {activeMode}
                <span className={cn(
                  "text-sm font-black px-2 py-0.5 rounded-full",
                  (() => {
                    const modeWrData = modeWinrates.find(m => m.name === activeMode);
                    const modeWr = modeWrData?.winrate !== undefined ? modeWrData.winrate : (modeWrData?.value || 0);
                    return modeWr >= 60 ? "bg-emerald-500/10 text-emerald-500" : modeWr >= 40 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500";
                  })()
                )}>
                  {(() => {
                    const modeWrData = modeWinrates.find(m => m.name === activeMode);
                    const modeWr = modeWrData?.winrate !== undefined ? modeWrData.winrate : (modeWrData?.value || 0);
                    return `${modeWr}% WR`;
                  })()}
                </span>
              </h3>
              <span className="text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                {filteredMaps.length} Mapas {viewActive ? 'Ativos' : 'Arquivados'}
              </span>
            </div>
            <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg">
              <button
                onClick={() => handleSwitchView(true)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  viewActive ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                Ativos
              </button>
              <button
                onClick={() => handleSwitchView(false)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  !viewActive ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                Arquivados
              </button>
            </div>
          </div>

          {isLoadingSwitch ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-10 h-10 rounded-full border-4 border-slate-200 dark:border-zinc-800 border-t-[#FF3366] border-r-fuchsia-500 animate-spin mb-4" />
              <span className="text-slate-500 font-medium text-sm">Carregando mapas...</span>
            </div>
          ) : filteredMaps.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMaps.map(map => (
                <div 
                  key={map.id} 
                  onClick={() => setSelectedMap(map)}
                  className="bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl hover:border-[#FF3366]/50 dark:hover:border-[#FF3366]/50 transition-colors cursor-pointer group flex flex-col relative shadow-sm"
                >
                  <div className="w-full aspect-[4/5] sm:aspect-square bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 relative overflow-hidden rounded-t-xl border-b border-zinc-100 dark:border-zinc-800">
                    {map.imageUrl ? (
                      <img src={map.imageUrl} alt={map.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:scale-105 transition-transform duration-500">
                         <MapIcon className="w-12 h-12 text-zinc-500" />
                      </div>
                    )}
                    {/* Mode pill positioned over image to save space */}
                    <div className="absolute top-2 left-2 flex flex-col items-start gap-1 z-10">
                       <span className={cn(
                          "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border shadow-sm backdrop-blur-md",
                          map.mode === 'Pique-Gema' ? 'bg-purple-500/80 text-white border-purple-400' :
                          map.mode === 'Fute-Brawl' ? 'bg-blue-500/80 text-white border-blue-400' :
                          map.mode === 'Combate' ? 'bg-emerald-500/80 text-white border-emerald-400' :
                          'bg-zinc-800/80 text-white border-zinc-600'
                        )}>
                          {map.mode}
                       </span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-start w-full min-w-0">
                    <div className="flex items-start justify-between mb-3 gap-2 w-full min-w-0">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <h4 className="font-bold text-zinc-900 dark:text-white leading-tight truncate" title={map.name}>{map.name}</h4>
                        <div className="relative group/tooltip w-fit">
                          <button type="button" className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200">
                            Terreno: {map.terrain || 'Misto'}
                            <Info className="w-3 h-3 flex-shrink-0" />
                          </button>
                          <div className="absolute bottom-full left-0 mb-2 w-[240px] sm:w-[270px] p-3 bg-[#18181b] border border-[#2e344a] text-zinc-200 text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-active/tooltip:opacity-100 group-active/tooltip:visible transition-all z-[100] font-medium pointer-events-none">
                            <span className="font-bold border-b border-zinc-700 pb-1.5 mb-1.5 block uppercase text-[10px] tracking-wider text-emerald-400">
                              Terreno: {map.terrain || 'Misto'}
                            </span>
                            <span className="block break-words text-[11px] leading-relaxed text-zinc-300">
                              {map.terrain === 'Aberto' && 'Mapas abertos favorecem composições de longo alcance (Snipers) e controle de visão.'}
                              {map.terrain === 'Semi-Aberto' && 'Equilíbrio entre rotas de flanco e controle central. Requer composições versáteis.'}
                              {map.terrain === 'Fechado' && 'Mapas fechados favorecem tanques, assassinos e brawlers de alto dano a curta distância.'}
                              {map.terrain === 'Misto' && 'Zonas abertas e fechadas. Exige brawlers que dominem áreas específicas do mapa.'}
                              {!['Aberto', 'Semi-Aberto', 'Fechado', 'Misto'].includes(map.terrain) && 'Terreno não especificado corretamente.'}
                            </span>
                            <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-[#18181b] border-b border-r border-[#2e344a] rotate-45" />
                          </div>
                        </div>
                      </div>
                      {!isPlayerMode && (
                        <div className="flex flex-col gap-1 shadow-sm rounded-lg overflow-hidden bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] p-1 flex-shrink-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingMap(map); setIsAddModalOpen(true); }}
                            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                            title="Editar Mapa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => toggleMapStatus(map.id, e)}
                            className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-[#FF3366] hover:bg-[#FF3366]/10 dark:hover:bg-[#FF3366]/10 transition-colors"
                            title={map.isActive ? "Arquivar Mapa" : "Desarquivar Mapa"}
                          >
                            {map.isActive ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1 font-medium">
                          <Crosshair className="w-3.5 h-3.5 text-blue-500" />
                          <span>{mapStatsMap[map.id]?.totalMatches || 0} Jogos</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "font-black px-1.5 py-0.5 rounded text-[10px]",
                            (() => {
                              const matches = mapStatsMap[map.id]?.totalMatches || 0;
                              const wr = mapStatsMap[map.id]?.winrate || 0;
                              if (matches === 0) return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
                              if (wr >= 60) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                              if (wr >= 40) return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
                              return "bg-red-500/10 text-red-600 dark:text-red-400";
                            })()
                          )}>
                            {(mapStatsMap[map.id]?.totalMatches || 0) > 0 ? `${mapStatsMap[map.id]?.winrate}% WR` : '0% WR'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            (mapStatsMap[map.id]?.winrate || 0) >= 60 ? "bg-emerald-500" : (mapStatsMap[map.id]?.winrate || 0) >= 40 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${(mapStatsMap[map.id]?.totalMatches || 0) > 0 ? mapStatsMap[map.id]?.winrate : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-zinc-500">
              <MapIcon className="w-10 h-10 mb-3 opacity-50" />
              <p>Nenhum mapa encontrado para esta busca.</p>
            </div>
          )}
        </div>
      </div>
      
      <MapDetailsModal 
        map={selectedMap}
        isOpen={!!selectedMap}
        onClose={() => setSelectedMap(null)}
        comps={comps.filter(c => c.mapId === selectedMap?.id)}
        onAddComp={() => setIsAddCompModalOpen(true)}
      />

      <EditMapModal
        map={editingMap} 
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingMap(null); }}
        onSave={handleSaveMap}
      />
      
      {selectedMap && (
        <AddCompModal 
          isOpen={isAddCompModalOpen}
          onClose={() => setIsAddCompModalOpen(false)}
          mapId={selectedMap.id}
          onSave={async (newComp) => { 
             setConfirmConfig({
               isOpen: true,
               title: 'Salvar Composição',
               message: 'Deseja confirmar a adição desta composição ao mapa?',
               action: async () => {
                 const saved = await mapService.createComp(newComp, false);
                 setComps(prev => [...prev, saved]);
                 setIsAddCompModalOpen(false);
                 setConfirmConfig(prev => ({ ...prev, isOpen: false }));
               }
             });
          }}
        />
      )}


      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => confirmConfig.action && confirmConfig.action()}
        processingText={confirmConfig.processingText}
        successText={confirmConfig.successText}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
      </div>
  );
}
