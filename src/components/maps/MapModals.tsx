import { getBrawlerBgColor } from "../../lib/utils";
import React, { useState, useEffect } from 'react';
import { X, Award, Shield, Target, Plus, Flame, Info } from 'lucide-react';
import { GameMap, GameMode, Brawler } from '../../types';
import { cn } from '../../lib/utils';
import { MapDetailsView } from '../ui/MapDetailsView';

import { analyticsService } from '../../services/analyticsService';
import { brawlerService } from '../../services/brawlerService';

interface MapDetailsModalProps {
  map: GameMap | null;
  isOpen: boolean;
  onClose: () => void;
  comps: any[];
  onAddComp: () => void;
}

export function MapDetailsModal({ map, isOpen, onClose, comps, onAddComp }: MapDetailsModalProps) {
  const [mapStats, setMapStats] = useState<any>(null);
  const [allBrawlers, setAllBrawlers] = useState<Brawler[]>([]);

  useEffect(() => {
    brawlerService.getBrawlers().then(setAllBrawlers);
  }, []);

  useEffect(() => {
    if (map && isOpen) {
      analyticsService.getMapDetailStats(map.id).then(setMapStats);
    } else {
      setMapStats(null);
    }
  }, [map, isOpen]);

  if (!isOpen || !map) return null;

  const topPickBrawlerName = mapStats?.topTbkPicks?.[0]?.brawler?.name || '—';
  const topCounterBrawlerName = mapStats?.topEnemyPicks?.[0]?.brawler?.name || '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-100 dark:border-[#2A2A2A] flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight flex items-center gap-2">
              {map.name}
            </h3>
            <div className="text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1"><Target className="w-4 h-4" /> {map.mode}</span>
              <span>&bull;</span>
              <div className="relative group/terrain">
                <span className={cn(
                  "text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border cursor-help flex items-center gap-1",
                  map.terrain === 'Aberto' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                  map.terrain === 'Fechado' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                )}>
                  Terreno {map.terrain}
                  <Info className="w-3.5 h-3.5" />
                </span>
                <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-[#18181b] border border-[#2e344a] text-zinc-200 text-[11px] rounded-xl shadow-2xl opacity-0 invisible group-hover/terrain:opacity-100 group-hover/terrain:visible transition-all z-50 font-medium pointer-events-none">
                  <span className="font-bold border-b border-zinc-700 pb-1 mb-1 block uppercase text-[10px] tracking-wider text-emerald-400">
                    Terreno {map.terrain}
                  </span>
                  <span className="block break-words leading-relaxed text-zinc-300">
                    {map.terrain === 'Aberto' && 'Mapas abertos favorecem composições de longo alcance (Snipers) e controle de visão.'}
                    {map.terrain === 'Semi-Aberto' && 'Equilíbrio entre rotas de flanco e controle central. Requer composições versáteis.'}
                    {map.terrain === 'Fechado' && 'Mapas fechados favorecem tanques, assassinos e brawlers de alto dano a curta distância.'}
                    {map.terrain === 'Misto' && 'Zonas abertas e fechadas. Exige brawlers que dominem áreas específicas do mapa.'}
                  </span>
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-[#18181b] border-t border-l border-[#2e344a] rotate-45" />
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-8 bg-zinc-50/30 dark:bg-zinc-900/10">
          <MapDetailsView map={map} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-[#2A2A2A] text-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold mb-1 uppercase tracking-wider">Winrate TBK</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{mapStats?.totalMatches > 0 ? `${mapStats.winrate}%` : '0%'}</div>
            </div>
            <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-[#2A2A2A] text-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold mb-1 uppercase tracking-wider">Partidas Oficiais</div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">{mapStats?.totalMatches || 0}</div>
            </div>
            <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-[#2A2A2A] text-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold mb-1 uppercase tracking-wider">Top Brawler</div>
              <div className="text-xl font-bold text-[#FFCC00] truncate">{topPickBrawlerName}</div>
            </div>
             <div className="bg-white dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-[#2A2A2A] text-center">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-bold mb-1 uppercase tracking-wider">Maior Counter</div>
              <div className="text-xl font-bold text-red-500 truncate">{topCounterBrawlerName}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-5 shadow-sm">
               <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-emerald-500" /> Top Brawlers (Picks TBK)
               </h4>
               <div className="space-y-2">
                 {mapStats?.topTbkPicks && mapStats.topTbkPicks.length > 0 ? (
                   mapStats.topTbkPicks.map((tp: any, i: number) => (
                      <div key={tp.brawler?.id || i} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-100 dark:border-zinc-800/50">
                         <span className="w-5 text-center text-xs font-bold text-zinc-400">#{i+1}</span>
                         <div className={cn("w-8 h-8 rounded overflow-hidden flex-shrink-0", getBrawlerBgColor(tp.brawler || {}))}>
                            {(tp.brawler?.iconUrl || tp.brawler?.imageUrl) && <img src={tp.brawler.iconUrl || tp.brawler.imageUrl} alt={tp.brawler?.name} className="w-full h-full object-cover" />}
                         </div>
                         <span className="flex-1 text-sm font-bold text-zinc-900 dark:text-white">{tp.brawler?.name}</span>
                         <span className="text-xs font-bold text-emerald-500">{tp.winrate}% WR ({tp.picks}x)</span>
                      </div>
                   ))
                 ) : (
                   <div className="text-xs text-zinc-500 italic py-4 text-center">Nenhum pick registrado neste mapa ainda.</div>
                 )}
               </div>
            </div>
            <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-5 shadow-sm">
               <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-4">
                  <Shield className="w-4 h-4 text-red-500" /> Brawlers Counters (Inimigo)
               </h4>
               <div className="space-y-2">
                 {mapStats?.topEnemyPicks && mapStats.topEnemyPicks.length > 0 ? (
                   mapStats.topEnemyPicks.map((ep: any, i: number) => (
                      <div key={ep.brawler?.id || i} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-100 dark:border-zinc-800/50">
                         <span className="w-5 text-center text-xs font-bold text-zinc-400">#{i+1}</span>
                         <div className={cn("w-8 h-8 rounded overflow-hidden flex-shrink-0", getBrawlerBgColor(ep.brawler || {}))}>
                            {(ep.brawler?.iconUrl || ep.brawler?.imageUrl) && <img src={ep.brawler.iconUrl || ep.brawler.imageUrl} alt={ep.brawler?.name} className="w-full h-full object-cover" />}
                         </div>
                         <span className="flex-1 text-sm font-bold text-zinc-900 dark:text-white">{ep.brawler?.name}</span>
                         <span className="text-xs font-bold text-red-500">{ep.picks} Picks</span>
                      </div>
                   ))
                 ) : (
                   <div className="text-xs text-zinc-500 italic py-4 text-center">Nenhum pick inimigo registrado neste mapa ainda.</div>
                 )}
               </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
               <h4 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Composições Cadastradas
               </h4>
               <button onClick={onAddComp} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Nova Comp
               </button>
            </div>
            
            <div className="space-y-3">
              {comps.map((comp: any) => (
                <div key={comp.id} className="bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1">
                    <h5 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-3">
                       {comp.name}
                       {comp.winrate >= 70 && <span className="bg-orange-500/10 text-orange-500 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider"><Flame className="w-3 h-3" /> Meta</span>}
                    </h5>
                    <div className="flex items-center gap-2">
                      {comp.brawlers.map((bId: string) => {
                        const brawler = allBrawlers.find(b => b.id === bId);
                        return (
                          <div key={bId} className={cn("w-10 h-10 rounded border border-zinc-200 dark:border-[#2A2A2A] overflow-hidden", getBrawlerBgColor(brawler || {}))} title={brawler?.name}>
                            {brawler?.iconUrl && <img src={brawler.iconUrl} alt={brawler.name} className="w-full h-full object-cover" />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 px-6 border-l border-zinc-100 dark:border-[#2A2A2A]">
                     <div className="text-center">
                       <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{comp.winrate}%</div>
                       <div className="text-[10px] uppercase text-zinc-500 font-bold">Winrate</div>
                     </div>
                     <div className="text-center">
                       <div className="text-sm font-bold text-zinc-900 dark:text-white">{comp.matchesPlayed || comp.matches}</div>
                       <div className="text-[10px] uppercase text-zinc-500 font-bold">Matches</div>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
             <h4 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-4 mt-6">
                <Target className="w-5 h-5 text-[#FF3366]" /> Histórico de Bans
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-4 shadow-sm">
                   <h5 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-[#2A2A2A] pb-2">Geral (Ambos)</h5>
                   <div className="space-y-3">
                      {mapStats?.topTotalBans && mapStats.topTotalBans.length > 0 ? (
                        mapStats.topTotalBans.map((tb: any, i: number) => (
                           <div key={i} className="flex justify-between items-center text-sm">
                              <span className="font-medium text-slate-900 dark:text-white">{tb.brawler?.name}</span>
                              <span className="font-bold text-[#FF3366]">{tb.count}</span>
                           </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 italic">Sem bans registrados</div>
                      )}
                   </div>
                </div>
                <div className="bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-4 shadow-sm">
                   <h5 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-[#2A2A2A] pb-2">Nossos Bans (TBK)</h5>
                   <div className="space-y-3">
                      {mapStats?.topTbkBans && mapStats.topTbkBans.length > 0 ? (
                        mapStats.topTbkBans.map((tb: any, i: number) => (
                           <div key={i} className="flex justify-between items-center text-sm">
                              <span className="font-medium text-slate-900 dark:text-white">{tb.brawler?.name}</span>
                              <span className="font-bold text-[#FF3366]">{tb.count}</span>
                           </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 italic">Sem bans registrados</div>
                      )}
                   </div>
                </div>
                <div className="bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-4 shadow-sm">
                   <h5 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 border-b border-zinc-100 dark:border-[#2A2A2A] pb-2">Bans Inimigos</h5>
                   <div className="space-y-3">
                      {mapStats?.topEnemyBans && mapStats.topEnemyBans.length > 0 ? (
                        mapStats.topEnemyBans.map((tb: any, i: number) => (
                           <div key={i} className="flex justify-between items-center text-sm">
                              <span className="font-medium text-slate-900 dark:text-white">{tb.brawler?.name}</span>
                              <span className="font-bold text-[#FF3366]">{tb.count}</span>
                           </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 italic">Sem bans registrados</div>
                      )}
                   </div>
                </div>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

interface EditMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (map: Partial<GameMap>) => void;
  map?: GameMap | null;
}

export function EditMapModal({ isOpen, onClose, onSave, map }: EditMapModalProps) {
  const [formData, setFormData] = useState<Partial<GameMap>>(map || {
    name: '',
    mode: 'Pique-Gema',
    terrain: 'Aberto'
  });

  useEffect(() => {
    if (map) {
      setFormData(map);
    } else {
      setFormData({
        name: '',
        mode: 'Pique-Gema',
        terrain: 'Aberto'
      });
    }
  }, [map]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-100 dark:border-[#2A2A2A] flex justify-between items-center">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {map ? 'Editar Mapa' : 'Novo Mapa'}
          </h3>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nome do Mapa</label>
            <input 
              type="text" 
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              placeholder="Ex: Mina Rochosa"
            />
          </div>

                    <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Modo de Jogo</label>
            <select 
              value={formData.mode || 'Pique-Gema'}
              onChange={e => setFormData({ ...formData, mode: e.target.value as any })}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
            >
              <option value="Pique-Gema">Pique-Gema</option>
              <option value="Fute-Brawl">Fute-Brawl</option>
              <option value="Caça-Estrelas">Caça-Estrelas</option>
              <option value="Roubo">Roubo</option>
              <option value="Zona Estratégica">Zona Estratégica</option>
              <option value="Nocaute">Nocaute</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Terreno do Mapa</label>
            <select 
              value={formData.terrain || 'Aberto'}
              onChange={e => setFormData({ ...formData, terrain: e.target.value as any })}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
            >
              <option value="Aberto">Aberto</option>
              <option value="Semi-Aberto">Semi-Aberto</option>
              <option value="Fechado">Fechado</option>
              <option value="Misto">Misto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Código do Mapa *</label>
            <input 
              type="text" 
              value={formData.imageUrl ? (formData.imageUrl.match(/\d+/) ? formData.imageUrl.match(/\d+/)[0] : '') : ''}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                if (val) {
                  setFormData({ ...formData, imageUrl: `https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/${val}.png` });
                } else {
                  setFormData({ ...formData, imageUrl: '' });
                }
              }}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              placeholder="Ex: 15000703"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">Apenas os números (ex: 15000703)</p>
            {formData.imageUrl && (
              <div className="mt-3 aspect-video bg-zinc-100 dark:bg-[#0A0A0A] rounded-lg border border-zinc-200 dark:border-[#2A2A2A] overflow-hidden flex items-center justify-center">
                 <img 
                   src={formData.imageUrl} 
                   alt="Preview do Mapa" 
                   className="w-full h-full object-contain"
                   onError={(e) => {
                     e.target.style.display = 'none';
                     e.target.parentElement.innerHTML = '<span class="text-zinc-500 text-sm">Imagem não encontrada</span>';
                   }}
                 />
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-zinc-100 dark:border-[#2A2A2A] flex justify-end gap-3 bg-zinc-50/50 dark:bg-[#1A1A1A]/30">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              if (formData.name) onSave(formData);
            }}
            disabled={!formData.name}
            className="px-6 py-3 bg-[#FF3366] hover:bg-[#E62E5C] disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white text-sm font-bold rounded-lg transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddCompModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (comp: any) => void;
  mapId: string;
}

export function AddCompModal({ isOpen, onClose, onSave, mapId }: AddCompModalProps) {
  const [brawlers, setBrawlers] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [brawlerSearch, setBrawlerSearch] = useState("");
  const [allBrawlers, setAllBrawlers] = useState<Brawler[]>([]);

  useEffect(() => {
    brawlerService.getBrawlers().then(setAllBrawlers);
  }, []);

  const filteredBrawlers = allBrawlers.filter(b => brawlerSearch ? b.name.toLowerCase().includes(brawlerSearch.toLowerCase()) : true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-100 dark:border-[#2A2A2A] flex justify-between items-center">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            Nova Composição
          </h3>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nome/Descrição da Comp</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              placeholder="Ex: Controle de Meio"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">Selecione 3 Brawlers</label>
              <input
                type="text"
                placeholder="Buscar..."
                value={brawlerSearch}
                onChange={(e) => setBrawlerSearch(e.target.value)}
                className="px-2 py-1 text-xs bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#2A2A2A] rounded focus:outline-none focus:border-[#FF3366] text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-50 dark:bg-[#1A1A1A] rounded-lg border border-zinc-200 dark:border-[#2A2A2A]">
              {filteredBrawlers.map(brawler => {
                 const isSelected = brawlers.includes(brawler.id);
                 return (
                   <div 
                     key={brawler.id}
                     onClick={() => {
                        if (isSelected) setBrawlers(brawlers.filter(id => id !== brawler.id));
                        else if (brawlers.length < 3) setBrawlers([...brawlers, brawler.id]);
                     }}
                     className={cn(
                       "w-10 h-10 rounded-lg cursor-pointer overflow-hidden transition-all border-2", getBrawlerBgColor(brawler),
                       isSelected ? "border-[#FF3366] opacity-100" : "border-transparent opacity-50 hover:opacity-100"
                     )}
                   >
                     {brawler?.iconUrl && <img src={brawler.iconUrl} alt={brawler?.name} className="w-full h-full object-cover" />}
                   </div>
                 )
              })}
            </div>
            <div className="text-xs text-zinc-500 mt-2 text-right">
              {brawlers.length} / 3 selecionados
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-zinc-100 dark:border-[#2A2A2A] flex justify-end gap-3 bg-zinc-50/50 dark:bg-[#1A1A1A]/30">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              if (name && brawlers.length === 3) {
                 onSave({
                    name: name,
                    description: name,
                    mapId: mapId,
                    brawlers: brawlers,
                    winrate: 0,
                    matchesPlayed: 0
                 });
                 setBrawlers([]);
                 setName('');
              }
            }}
            disabled={!name || brawlers.length !== 3}
            className="px-6 py-3 bg-[#FF3366] hover:bg-[#E62E5C] disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white text-sm font-bold rounded-lg transition-colors"
          >
            Salvar Comp
          </button>
        </div>
      </div>
    </div>
  );
}
