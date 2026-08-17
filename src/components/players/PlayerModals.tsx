import { BrawlerFilterBar, useBrawlerFilters, applyBrawlerFilters } from "../BrawlerFilters";
import { getBrawlerBgColor } from "../../lib/utils";
import React from "react";
import { X } from 'lucide-react';
import { Player } from '../../types';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';
import { brawlerService } from '../../services/brawlerService';
import { analyticsService } from '../../services/analyticsService';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  playerName: string;
}

export function DeleteModal({ isOpen, onClose, onConfirm, playerName }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Excluir Jogador</h3>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Tem certeza que deseja remover o jogador <strong>{playerName}</strong>? Esta ação não poderá ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            Excluir Jogador
          </button>
        </div>
      </div>
    </div>
  );
}

interface DetailsModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  stats: { winrate: number; matches: number; recentMatches: boolean[] };
}

export function DetailsModal({ player, isOpen, onClose, stats }: DetailsModalProps) {
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [showWinrateDetails, setShowWinrateDetails] = useState(false);
  const brawlerFilters = useBrawlerFilters();
  const [brawlerStats, setBrawlerStats] = useState<Array<{
    brawlerId: string;
    brawlerName: string;
    brawlerIconUrl?: string;
    brawlerImageUrl?: string;
    matches: number;
    wins: number;
    winrate: number;
  }>>([]);
  const [loadingBrawlerStats, setLoadingBrawlerStats] = useState(false);

  useEffect(() => {
    brawlerService.getBrawlers().then(setBrawlers);
  }, []);

  useEffect(() => {
    if (isOpen && player) {
      setLoadingBrawlerStats(true);
      analyticsService.getPlayerBrawlerStats(player.id).then(data => {
        setBrawlerStats(data);
        setLoadingBrawlerStats(false);
      });
    } else {
      setBrawlerStats([]);
    }
  }, [isOpen, player]);

  if (!isOpen || !player) return null;

  const comfortBrawlers = (player.comfortBrawlers || []).map(id => brawlers.find(b => b.id === id)).filter(Boolean);


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-100 dark:border-[#2A2A2A] flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{player.nickname}</h3>
            <div className="text-zinc-500 dark:text-zinc-400">{player.name}</div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
               className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-[#2A2A2A] text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
               onClick={() => setShowWinrateDetails(!showWinrateDetails)}
            >
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold mb-1 uppercase tracking-wider">Winrate Global</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.winrate}%</div>
              <div className="text-[10px] text-zinc-400 mt-1">Ver Detalhes</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-[#2A2A2A] text-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold mb-1 uppercase tracking-wider">Partidas</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.matches}</div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-[#2A2A2A] text-center col-span-2 md:col-span-2">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold mb-2 uppercase tracking-wider">Últimas 5 Scrims</div>
              <div className="flex justify-center gap-2">
                {stats.recentMatches.map((isWin, i) => (
                  <div key={i} className={cn("w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white", isWin ? "bg-emerald-500" : "bg-red-500")}>
                    {isWin ? 'V' : 'D'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Seção de Brawlers por Jogador — dados reais de match_picks */}
          <div className="bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-4">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Brawlers Jogados (Histórico Real)</h4>
            {loadingBrawlerStats ? (
              <div className="flex items-center gap-2 py-3 text-zinc-500 text-sm">
                <div className="w-4 h-4 border-2 border-zinc-300 border-t-emerald-500 rounded-full animate-spin" />
                Carregando estatísticas...
              </div>
            ) : brawlerStats.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {brawlerStats.map(bs => (
                  <div key={bs.brawlerId} className="flex items-center gap-3 bg-white dark:bg-[#121212] p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/50">
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0">
                      {(bs.brawlerIconUrl || bs.brawlerImageUrl) && (
                        <img src={bs.brawlerIconUrl || bs.brawlerImageUrl} alt={bs.brawlerName} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{bs.brawlerName}</span>
                    <div className="flex items-center gap-3 text-xs flex-shrink-0">
                      <span className="text-zinc-500">{bs.matches} partida{bs.matches !== 1 ? 's' : ''}</span>
                      <span className={cn("font-bold", bs.winrate >= 60 ? "text-emerald-500" : bs.winrate >= 40 ? "text-amber-500" : "text-red-500")}>
                        {bs.winrate}% WR
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic py-2">
                Nenhuma partida registrada com jogador vinculado ainda.
              </p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Top Brawlers & Comfort Picks</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {comfortBrawlers.map(b => (
                <div key={b?.id} className="bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-3 flex flex-col items-center gap-2">
                   <div className={cn("w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700", getBrawlerBgColor(b))}>
                     {b?.iconUrl && <img src={b.iconUrl} alt={b.name} className="w-full h-full object-cover" />}
                   </div>
                   <div className="text-center">
                     <div className="text-sm font-bold text-zinc-900 dark:text-white">{b?.name}</div>
                     <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Tier {b?.tier}</div>
                   </div>
                </div>
              ))}
              {comfortBrawlers.length === 0 && (
                <div className="col-span-4 text-sm text-zinc-500 dark:text-zinc-500 italic p-4 text-center border border-dashed border-zinc-200 dark:border-[#2A2A2A] rounded-xl">
                  Nenhum brawler conforto registrado.
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Tags Táticas</h4>
            <div className="flex flex-wrap gap-2">
              {player.tags?.map((tag, idx) => (
                <span key={idx} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#FFCC00]/10 text-amber-600 dark:text-[#FFCC00] border border-[#FFCC00]/20">
                  {tag}
                </span>
              ))}
              {(!player.tags || player.tags.length === 0) && (
                 <span className="text-sm text-zinc-500 italic">Sem tags associadas</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


import { Brawler } from '../../types';

interface EditModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (player: Player) => void;
}

export function EditModal({ player, isOpen, onClose, onSave }: EditModalProps) {
  const brawlerFilters = useBrawlerFilters();
  const [formData, setFormData] = useState<Partial<Player>>({
    name: "",
    nickname: "",
    status: "Titular",
    isActive: true,
    comfortBrawlers: [],
    tags: []
  });
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);

  useEffect(() => {
    brawlerService.getBrawlers().then(setBrawlers);
  }, []);

  useEffect(() => {
    if (player) {
      setFormData(player);
    } else {
      setFormData({
        name: "",
        nickname: "",
        status: "Titular",
        isActive: true,
        comfortBrawlers: [],
        tags: []
      });
    }
  }, [player, isOpen]);

  const [brawlerSearch, setBrawlerSearch] = useState('');
  
  const filteredComfortBrawlers = brawlers.filter(b => 
    brawlerSearch ? b.name.toLowerCase().includes(brawlerSearch.toLowerCase()) : (b.tier === 'S' || b.tier === 'A' || b.tier === 'B')
  ).slice(0, 24);

  // A clean robust way would be a useEffect, but we'll do simple assignment to avoid complex re-renders in this mock setup.
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Player);
    onClose();
  };

  const toggleBrawler = (id: string) => {
    const current = formData.comfortBrawlers || [];
    if (current.includes(id)) {
      setFormData({ ...formData, comfortBrawlers: current.filter(b => b !== id) });
    } else {
      setFormData({ ...formData, comfortBrawlers: [...current, id] });
    }
  };

  const handleTagInput = (val: string) => {
    val = val.trim();
    if (val && !(formData.tags || []).includes(val.toUpperCase())) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), val.toUpperCase()] }));
    }
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTagInput(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value.trim()) {
      handleTagInput(e.target.value);
      e.target.value = '';
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: (formData.tags || []).filter(t => t !== tag) });
  };

  const isEditing = !!player;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-100 dark:border-[#2A2A2A] flex justify-between items-center">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {isEditing ? 'Editar Jogador' : 'Adicionar Novo Jogador'}
          </h3>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nickname *</label>
                <input 
                  required
                  type="text" 
                  value={formData.nickname || ''} 
                  onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366] dark:focus:border-[#FF3366] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366] dark:focus:border-[#FF3366] transition-colors"
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                  <select 
                    value={formData.status || 'Titular'} 
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366] transition-colors"
                  >
                    <option value="Titular">Titular</option>
                    <option value="Reserva">Reserva</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Tags Customizadas (Pressione Enter)</label>
                <input 
                  type="text" 
                  onKeyDown={addTag}
                  onBlur={handleBlur}
                  placeholder="Ex: POCKET PICK"
                  className="w-full bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-[#FFCC00] transition-colors mb-2"
                />
                <div className="flex flex-wrap gap-2">
                  {(formData.tags || []).map(tag => (
                    <span key={tag} className="text-xs font-bold px-2 py-1 rounded bg-[#FFCC00]/10 text-amber-600 dark:text-[#FFCC00] border border-[#FFCC00]/20 flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1 flex justify-between items-center">
                <span>Comfort Picks</span>
                <span className="text-xs font-normal text-zinc-500">{(formData.comfortBrawlers || []).length}</span>
              </label>
              <div className="mb-2">
                <BrawlerFilterBar 
                  filters={brawlerFilters} 
                  compact
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredComfortBrawlers.length > 0) {
                        const target = filteredComfortBrawlers[0];
                        toggleBrawler(target.id);
                      }
                    }
                  }}
                />
              </div>
              <div className="flex-1 bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-3 overflow-y-auto max-h-[300px]">
                <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2">
                   {filteredComfortBrawlers.map(b => {
                     const isSelected = (formData.comfortBrawlers || []).includes(b.id);
                     return (
                       <button
                         key={b.id}
                         type="button"
                         onClick={() => toggleBrawler(b.id)}
                         className={cn(
                           "relative rounded-lg overflow-hidden border-2 transition-all group aspect-square", getBrawlerBgColor(b),
                           isSelected ? "border-[#FFCC00] shadow-[0_0_10px_rgba(255,204,0,0.3)] scale-105 z-10" : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 opacity-70 hover:opacity-100"
                         )}
                       >
                         {b.iconUrl && <img src={b.iconUrl} alt={b.name} className="w-full h-full object-cover" />}
                         {isSelected && (
                           <div className="absolute inset-0 bg-[#FFCC00]/20 flex items-center justify-center">
                             <div className="bg-[#FFCC00] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
                               Comfort
                             </div>
                           </div>
                         )}
                       </button>
                     )
                   })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-zinc-200 dark:border-[#2A2A2A] flex justify-end gap-3">
             <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 rounded-lg font-bold bg-[#FF3366] hover:bg-[#E62E5C] text-white transition-colors"
              >
                {isEditing ? 'Salvar Alterações' : 'Adicionar Jogador'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}
