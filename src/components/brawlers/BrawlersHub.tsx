import { getBrawlerBgColor, getBrawlerClassIcon } from "../../lib/utils";
import React, { useState, useEffect } from 'react';
import { brawlerService } from '../../services/brawlerService';
import { Search, Flame, Target, ChevronRight, X, Activity, Plus, Edit2, Users, ShieldAlert, Zap, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { cn, fuzzySearch } from '../../lib/utils';
import { ConfirmModal } from "../ui/ConfirmModal";
import { Brawler } from '../../types';
import { BrawlerModal } from './BrawlerModal';

import { analyticsService } from '../../services/analyticsService';

export function BrawlersHub() {
  const [search, setSearch] = useState('');
  const [selectedBrawler, setSelectedBrawler] = useState<Brawler | null>(null);
  const [brawlerStatsDetail, setBrawlerStatsDetail] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrawler, setEditingBrawler] = useState<Brawler | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, action: (() => void) | null, title: string, message: string}>({ isOpen: false, action: null, title: '', message: '' });
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);

  useEffect(() => {
    loadBrawlers();
  }, []);

  useEffect(() => {
    if (selectedBrawler) {
      analyticsService.getBrawlerDetailStats(selectedBrawler.id).then(setBrawlerStatsDetail);
    } else {
      setBrawlerStatsDetail(null);
    }
  }, [selectedBrawler]);

  const loadBrawlers = async () => {
    setIsFetching(true);
    const data = await brawlerService.getBrawlers();
    setBrawlers(data);
    setIsFetching(false);
  };

  const filtered = brawlers.filter(b => fuzzySearch(search, b.name));

  const handleSelectBrawler = (b: Brawler) => {
    setLoading(true);
    setTimeout(() => {
      setSelectedBrawler(b);
      setLoading(false);
    }, 200);
  };

  const handleSaveBrawler = (brawlerData: Partial<Brawler>) => {
    setConfirmConfig({
      isOpen: true,
      title: editingBrawler ? 'Salvar Alterações' : 'Adicionar Brawler',
      message: editingBrawler ? 'Tem certeza que deseja salvar estas alterações?' : 'Deseja confirmar a adição deste Brawler?',
      action: async () => {
        if (editingBrawler) {
          await brawlerService.updateBrawler(editingBrawler.id, brawlerData);
          setBrawlers(prev => prev.map(b => b.id === editingBrawler.id ? { ...b, ...brawlerData } as Brawler : b));
          if (selectedBrawler?.id === editingBrawler.id) {
            setSelectedBrawler({ ...selectedBrawler, ...brawlerData } as Brawler);
          }
        } else {
          const created = await brawlerService.createBrawler(brawlerData as Omit<Brawler, 'id'>);
          setBrawlers(prev => [created, ...prev]);
        }
        setIsModalOpen(false);
        setEditingBrawler(null);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteBrawler = (brawlerId: string, brawlerName: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Brawler',
      message: `Tem certeza que deseja excluir ${brawlerName}? Esta ação não pode ser desfeita.`,
      action: async () => {
        await brawlerService.deleteBrawler(brawlerId);
        setBrawlers(prev => prev.filter(b => b.id !== brawlerId));
        if (selectedBrawler?.id === brawlerId) {
          setSelectedBrawler(null);
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };


  return (
    <div className="space-y-6 w-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Brawlers Hub & Metagame</h2>
            <span className="text-xs font-bold bg-[#FF3366]/10 text-[#FF3366] border border-[#FF3366]/20 px-3 py-1 rounded-full">
              {brawlers.length} Brawlers Cadastrados
            </span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Estatísticas detalhadas de todos os Brawlers</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl overflow-hidden flex flex-col md:flex-row min-h-[600px] max-h-[800px] min-h-[500px] shadow-sm relative">
        {/* Sidebar / Search - Hidden on mobile if a brawler is selected */}
        <div className={cn(
          "w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-[#2A2A2A] bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col",
          selectedBrawler ? "hidden md:flex" : "flex"
        )}>
          <div className="p-4 border-b border-zinc-200 dark:border-[#2A2A2A] space-y-3">
            <button
              onClick={() => {
                setEditingBrawler(null);
                setIsModalOpen(true);
              }}
              className="w-full bg-[#FF3366] hover:bg-[#E62E5C] text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo Brawler
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Buscar Brawler..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered.length > 0) {
                    handleSelectBrawler(filtered[0]);
                  }
                }}
                className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366] transition-colors"
              />
            </div>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
             {filtered.map(b => (
                <button
                   key={b.id}
                   onClick={() => handleSelectBrawler(b)}
                   className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left w-full mb-1 group relative",
                      selectedBrawler?.id === b.id ? "bg-white dark:bg-[#1A1A1A] shadow-sm border border-zinc-200 dark:border-zinc-700/50" : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent"
                   )}
                >
                   <div className={cn("w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-[#2A2A2A]", getBrawlerBgColor(b))}>
                      {b.iconUrl && <img src={b.iconUrl} alt={b.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-zinc-900 dark:text-white truncate">{b.name}</div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5 flex items-center gap-1">
                        {b.type.map((t, i) => (
                           <span key={i} className="flex items-center gap-0.5" title={t}>
                              {getBrawlerClassIcon(t, "w-3 h-3")} {t}
                           </span>
                        ))}
                      </div>
                   </div>
                   {b.tier === 'S' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute right-3 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />}
                </button>
             ))}
          </div>
        </div>

        {/* Content Area */}
        <div className={cn(
          "flex-1 flex flex-col bg-zinc-50/30 dark:bg-[#050505]",
          !selectedBrawler ? "hidden md:flex" : "flex"
        )}>
          {loading ? (
             <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
               <Loader2 className="w-8 h-8 text-[#FF3366] animate-spin mb-4" />
               <span className="text-sm font-medium text-zinc-500">Carregando dados do brawler...</span>
             </div>
          ) : selectedBrawler ? (
             <div className="flex-1 p-4 pb-24 md:p-6 overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Mobile Back Button */}
                <button 
                  onClick={() => setSelectedBrawler(null)}
                  className="md:hidden flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar para lista
                </button>

                <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                   
                   {/* A) Cabeçalho do Brawler */}
                   <div className="flex flex-col sm:flex-row items-start gap-6 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-zinc-200 dark:border-[#2A2A2A] shadow-sm relative overflow-hidden">
                      <div className={cn(
                        "w-24 h-24 sm:w-32 sm:h-32 rounded-2xl flex-shrink-0 relative overflow-hidden", getBrawlerBgColor(selectedBrawler),
                        selectedBrawler.tier === 'S' ? "border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]" : "border-2 border-zinc-200 dark:border-zinc-700"
                      )}>
                         {selectedBrawler.imageUrl && <img src={selectedBrawler.imageUrl} alt={selectedBrawler.name} className="w-full h-full object-cover" />}
                         {selectedBrawler.isHotPick && (
                            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-lg flex items-center gap-1">
                               <Flame className="w-3 h-3" /> HOT
                            </div>
                         )}
                      </div>
                      
                      <div className="flex-1 space-y-3 z-10">
                         <div className="flex flex-wrap items-center justify-between gap-4">
                           <h3 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
                              {selectedBrawler.name}
                           </h3>
                           <div className="flex items-center gap-2">
                             <button 
                                onClick={() => {
                                  setEditingBrawler(selectedBrawler);
                                  setIsModalOpen(true);
                                }}
                                className="bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                             >
                               <Edit2 className="w-4 h-4" /> Editar
                             </button>
                             <button 
                                onClick={() => {
                                  setConfirmConfig({
                                    isOpen: true,
                                    title: 'Excluir Brawler',
                                    message: `Tem certeza que deseja excluir ${selectedBrawler.name}? Esta ação não pode ser desfeita.`,
                                    action: () => {
                                      setBrawlers(prev => prev.filter(b => b.id !== selectedBrawler.id));
                                      setSelectedBrawler(null);
                                    }
                                  });
                                }}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                             >
                               <Trash2 className="w-4 h-4" /> Excluir
                             </button>
                           </div>
                         </div>

                         <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(
                               "text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider flex items-center gap-1",
                               selectedBrawler.tier === 'S' ? "bg-amber-400/10 text-amber-500 border-amber-400/30" :
                               selectedBrawler.tier === 'A' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" :
                               selectedBrawler.tier === 'B' ? "bg-blue-500/10 text-blue-500 border-blue-500/30" :
                               "bg-zinc-500/10 text-zinc-500 border-zinc-500/30"
                            )}>
                               Tier {selectedBrawler.tier}
                            </span>
                            {selectedBrawler.type.map(t => (
                               <span key={t} className="text-xs font-bold bg-zinc-100 dark:bg-[#1A1A1A] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded-full flex items-center gap-1">
                                  {getBrawlerClassIcon(t, "w-3 h-3")} {t}
                               </span>
                            ))}
                         </div>
                         <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-lg mt-2">
                            Raridade: {selectedBrawler.rarity} &bull; Vida: {selectedBrawler.health} 
                            {selectedBrawler.breaksWalls && ' • Quebra Muros'}
                         </p>
                      </div>

                      {/* Decal Background */}
                      {selectedBrawler.tier === 'S' && (
                        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-amber-400/5 blur-3xl rounded-full pointer-events-none" />
                      )}
                   </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       
                       {/* B) Card 1: Análise Detalhada de Banimentos */}
                       <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl p-5 shadow-sm flex flex-col gap-5">
                          <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                             <Target className="w-5 h-5 text-[#FF3366]" /> Análise de Banimentos
                          </h4>
                          
                          <div>
                             <div className="flex justify-between text-sm mb-1.5">
                                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Total Geral de Bans</span>
                                <span className="font-black text-zinc-900 dark:text-white">{brawlerStatsDetail?.totalBans || 0}x</span>
                             </div>
                             <div className="w-full h-2 bg-zinc-100 dark:bg-[#1A1A1A] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-[#FF3366] to-fuchsia-500 rounded-full relative" style={{ width: `${Math.min((brawlerStatsDetail?.totalBans || 0) * 10, 100)}%` }}>
                                   <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 blur-[2px] rounded-full animate-pulse" />
                                </div>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="bg-zinc-50 dark:bg-[#1A1A1A] p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Por Modo (Top 3)</span>
                                <div className="space-y-2">
                                   {brawlerStatsDetail?.topModeBans && brawlerStatsDetail.topModeBans.length > 0 ? (
                                      brawlerStatsDetail.topModeBans.map((mb: any) => (
                                         <div key={mb.mode} className="flex justify-between text-xs">
                                            <span className="text-zinc-600 dark:text-zinc-300 font-medium">{mb.mode}</span>
                                            <span className="font-bold text-zinc-900 dark:text-white">{mb.count}x</span>
                                         </div>
                                      ))
                                   ) : (
                                      <span className="text-xs text-zinc-500 italic">Sem bans de modo ainda</span>
                                   )}
                                </div>
                             </div>
                             <div className="bg-zinc-50 dark:bg-[#1A1A1A] p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Por Mapa (Top 2)</span>
                                <div className="space-y-2">
                                   {brawlerStatsDetail?.topMapBans && brawlerStatsDetail.topMapBans.length > 0 ? (
                                      brawlerStatsDetail.topMapBans.map((mb: any) => (
                                         <div key={mb.mapName} className="flex justify-between text-xs">
                                            <span className="text-zinc-600 dark:text-zinc-300 font-medium">{mb.mapName}</span>
                                            <span className="font-bold text-[#FF3366]">{mb.count}x</span>
                                         </div>
                                      ))
                                   ) : (
                                      <span className="text-xs text-zinc-500 italic">Sem bans de mapa ainda</span>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                       
                       {/* C) Card 2: Desempenho, Picks e Winrate */}
                       <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl p-5 shadow-sm flex flex-col gap-5">
                          <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                             <Activity className="w-5 h-5 text-emerald-500" /> Desempenho e Picks
                          </h4>
                          
                          <div>
                             <div className="flex justify-between text-sm mb-1.5">
                                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Winrate Geral</span>
                                <span className="font-black text-emerald-500">{brawlerStatsDetail?.tbkPicksCount > 0 ? `${brawlerStatsDetail.winrate}%` : '0%'}</span>
                             </div>
                             <div className="w-full h-2 bg-zinc-100 dark:bg-[#1A1A1A] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full relative" style={{ width: `${brawlerStatsDetail?.tbkPicksCount > 0 ? brawlerStatsDetail.winrate : 0}%` }}>
                                   <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 blur-[2px] rounded-full animate-pulse" />
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="flex flex-col gap-3">
                                <div className="bg-zinc-50 dark:bg-[#1A1A1A] p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 flex flex-col justify-center flex-1">
                                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Picks (TBK vs Inimigos)</span>
                                   <div className="flex items-end gap-2">
                                      <span className="text-2xl font-black text-blue-500">{brawlerStatsDetail?.tbkPicksCount || 0}</span>
                                      <span className="text-sm font-bold text-zinc-500 mb-1">vs</span>
                                      <span className="text-2xl font-black text-red-500">{brawlerStatsDetail?.enemyPicksCount || 0}</span>
                                   </div>
                                </div>
                             </div>
                             
                             <div className="bg-zinc-50 dark:bg-[#1A1A1A] p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Comfort Picks (Atletas)</span>
                                <div className="space-y-2">
                                   {brawlerStatsDetail?.comfortStats && brawlerStatsDetail.comfortStats.length > 0 ? (
                                      brawlerStatsDetail.comfortStats.map((cs: any, idx: number) => (
                                         <div key={idx} className="flex items-center gap-2 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">{idx + 1}</div>
                                            <span className="text-zinc-700 dark:text-zinc-300 font-medium flex-1">{cs.playerName}</span>
                                            <span className="font-bold text-emerald-500">{cs.winrate}% WR ({cs.matches})</span>
                                         </div>
                                      ))
                                   ) : (
                                      <span className="text-xs text-zinc-500 italic">Sem partidas com atletas ainda</span>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* D) Card 3: Sinergias e Counters Diretos */}
                       <div className="lg:col-span-2 bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl p-5 shadow-sm">
                          <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-5">
                             <Zap className="w-5 h-5 text-amber-500" /> Sinergias e Counters
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                             
                             {/* Parceiros */}
                             <div className="space-y-3">
                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 border-b border-zinc-100 dark:border-[#2A2A2A] pb-2">
                                   <Users className="w-3.5 h-3.5" /> Melhores Parceiros
                                </div>
                                <div className="space-y-2">
                                   {brawlerStatsDetail?.partners && brawlerStatsDetail.partners.length > 0 ? (
                                      brawlerStatsDetail.partners.map((b: Brawler) => (
                                         <div key={b.id} className="flex items-center gap-2 bg-zinc-50 dark:bg-[#1A1A1A] p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                                            <div className={cn("w-6 h-6 rounded overflow-hidden flex-shrink-0", getBrawlerBgColor(b))}>
                                               {(b.iconUrl || b.imageUrl) && <img src={b.iconUrl || b.imageUrl} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{b.name}</span>
                                         </div>
                                      ))
                                   ) : (
                                      <span className="text-xs text-zinc-500 italic">Sem dados de partidas ainda</span>
                                   )}
                                </div>
                             </div>

                             {/* Counters dele */}
                             <div className="space-y-3">
                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 border-b border-zinc-100 dark:border-[#2A2A2A] pb-2">
                                   <Target className="w-3.5 h-3.5 text-emerald-500" /> Ele Countera
                                </div>
                                <div className="space-y-2">
                                   {brawlerStatsDetail?.counters && brawlerStatsDetail.counters.length > 0 ? (
                                      brawlerStatsDetail.counters.map((b: Brawler) => (
                                         <div key={b.id} className="flex items-center gap-2 bg-zinc-50 dark:bg-[#1A1A1A] p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                                            <div className={cn("w-6 h-6 rounded overflow-hidden flex-shrink-0", getBrawlerBgColor(b))}>
                                               {(b.iconUrl || b.imageUrl) && <img src={b.iconUrl || b.imageUrl} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{b.name}</span>
                                         </div>
                                      ))
                                   ) : (
                                      <span className="text-xs text-zinc-500 italic">Sem dados de partidas ainda</span>
                                   )}
                                </div>
                             </div>

                             {/* Ameaças */}
                             <div className="space-y-3">
                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 border-b border-zinc-100 dark:border-[#2A2A2A] pb-2">
                                   <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> Ameaças (Sofre para)
                                </div>
                                <div className="space-y-2">
                                   {brawlerStatsDetail?.threats && brawlerStatsDetail.threats.length > 0 ? (
                                      brawlerStatsDetail.threats.map((b: Brawler) => (
                                         <div key={b.id} className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                            <div className={cn("w-6 h-6 rounded overflow-hidden flex-shrink-0", getBrawlerBgColor(b))}>
                                               {(b.iconUrl || b.imageUrl) && <img src={b.iconUrl || b.imageUrl} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <span className="text-sm font-medium text-red-700 dark:text-red-400">{b.name}</span>
                                         </div>
                                      ))
                                   ) : (
                                      <span className="text-xs text-zinc-500 italic">Sem dados de partidas ainda</span>
                                   )}
                                </div>
                             </div>


                          </div>
                       </div>

                    </div>

                 </div>
              </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 min-h-[400px]">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>Selecione um Brawler para ver as estatísticas.</p>
             </div>
          )}
        </div>
      </div>
      
      <BrawlerModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBrawler(null);
        }}
        onSave={handleSaveBrawler}
        brawler={editingBrawler}
      />


      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => confirmConfig.action && confirmConfig.action()}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
