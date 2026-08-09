import { getBrawlerBgColor } from "../../lib/utils";
import React from "react";
import { useState } from 'react';
import { DraftState } from './DraftWizard';

import { ConfirmModal } from "../ui/ConfirmModal";
import { cn } from '../../lib/utils';
import { Trophy, XCircle, ArrowRight, User } from 'lucide-react';

import { analyticsService } from '../../services/analyticsService';
import { brawlerService } from '../../services/brawlerService';
import { mapService } from '../../services/mapService';
import { playerService } from '../../services/playerService';
import { Brawler, GameMap, Player } from '../../types';

interface StepPostMatchProps {
  draftState: DraftState;
  setDraftState: React.Dispatch<React.SetStateAction<DraftState>>;
  onFinish: () => void;
  onPrev?: () => void;
  onRestartPicks?: () => void;
}

export function StepPostMatch({ draftState, setDraftState, onFinish, onPrev, onRestartPicks }: StepPostMatchProps) {
  const [result, setResult] = useState<'victory' | 'defeat' | null>(null);
  const [isTestingVariation, setIsTestingVariation] = useState(false);
  const [brawlerOut, setBrawlerOut] = useState<string>('');
  const [brawlerIn, setBrawlerIn] = useState<string>('');

  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  
  React.useEffect(() => {
    Promise.all([
      brawlerService.getBrawlers(),
      mapService.getMaps(),
      playerService.getPlayers()
    ]).then(([bData, mData, pData]) => {
      setBrawlers(bData);
      setMaps(mData);
      setPlayers(pData);
    });
  }, []);
  
  const map = maps.find(m => m.id === draftState.mapId);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, action: (() => void) | null, title: string, message: string}>({ isOpen: false, action: null, title: '', message: '' });
  const tbkPicks = draftState.picks.filter(p => p.team === 'tbk').map(p => p.brawlerId);
  const enemyPicks = draftState.picks.filter(p => p.team === 'enemy').map(p => p.brawlerId);

  const tbkPlayers = players;

  // Determine suggested players based on comfort picks
  const suggestedAssignments = React.useMemo(() => {
    const assignments: Record<string, string> = {};
    const assigned = new Set<string>();

    tbkPicks.forEach(bId => {
      const p = tbkPlayers.find(pl => (pl.comfortBrawlers || []).includes(bId) && !assigned.has(pl.id));
      if (p) {
        assignments[bId] = p.id;
        assigned.add(p.id);
      }
    });
    return assignments;
  }, [tbkPicks, tbkPlayers]);
  const handlePlayerAssign = (brawlerId: string, playerId: string) => {
    setDraftState(prev => ({
      ...prev,
      playerAssignments: {
        ...prev.playerAssignments,
        [brawlerId]: playerId
      }
    }));
  };

  const handleSaveResult = () => {
    if (!result) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Salvar Resultado da Partida',
      message: 'Confirmar os dados da partida e registrar no histórico da equipe?',
      action: async () => {
        await analyticsService.recordScrim({
          mapId: draftState.mapId,
          result: result,
          tbkPicks: tbkPicks.map(bId => ({
            brawlerId: bId,
            playerId: draftState.playerAssignments[bId] || undefined
          })),
          enemyPicks: enemyPicks,
          tbkBans: draftState.tbkBans.filter(Boolean) as string[],
          enemyBans: draftState.enemyBans.filter(Boolean) as string[],
          variationTested: isTestingVariation && brawlerOut && brawlerIn ? {
            brawlerOut,
            brawlerIn,
            isWin: result === 'victory'
          } : undefined
        });
        onFinish();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  const allPlayersAssigned = tbkPicks.every(id => draftState.playerAssignments[id]);
  const anyPlayerAssigned = tbkPicks.some(id => draftState.playerAssignments[id]);
  const unassignedCount = tbkPicks.filter(id => !draftState.playerAssignments[id]).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Info */}
      <div className="flex justify-between items-center bg-white dark:bg-[#1A1A1A] p-4 rounded-xl border border-slate-200 dark:border-[#2A2A2A]">
        <div>
           <div className="text-sm text-slate-500 dark:text-zinc-400">Mapa Jogado</div>
           <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
             {map?.name}
             {onRestartPicks && (
               <button onClick={onRestartPicks} className="text-xs font-normal text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white underline px-2 py-1 bg-slate-200 dark:bg-zinc-800 rounded-md">
                 Mudar Composição
               </button>
             )}
           </div>
        </div>
        <div className="text-right">
           <div className="text-sm text-slate-500 dark:text-zinc-400">Modo</div>
           <div className="text-lg font-medium text-slate-700 dark:text-zinc-300">{map?.mode}</div>
        </div>
      </div>

      {/* Compositions & Player Assignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
        {/* TBK Team */}
        <div className="space-y-4">
           <h3 className="text-lg font-bold text-emerald-400 border-b border-slate-200 dark:border-[#2A2A2A] pb-2">Composição TBK</h3>
           <div className="space-y-3">
             {tbkPicks.map(brawlerId => {
               const brawler = brawlers.find(b => b.id === brawlerId);
               return (
                 <div key={brawlerId} className="bg-white dark:bg-[#1A1A1A] border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded border border-zinc-200 dark:border-[#2A2A2A] overflow-hidden", getBrawlerBgColor(brawler))}>
                        {brawler?.imageUrl && <img src={brawler.imageUrl} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white">{brawler?.name}</span>
                   </div>
                   
                   <div className="w-56 relative">
                     <select 
                       value={draftState.playerAssignments[brawlerId] || ''}
                       onChange={(e) => handlePlayerAssign(brawlerId, e.target.value)}
                       className={cn(
                         "w-full bg-slate-50 dark:bg-[#0A0A0A] border rounded-md px-3 py-2 text-sm appearance-none focus:outline-none focus:border-emerald-500",
                         !draftState.playerAssignments[brawlerId] && suggestedAssignments[brawlerId] ? "border-[#FFCC00] text-[#FFCC00]" : "border-slate-200 dark:border-[#2A2A2A] text-slate-900 dark:text-white"
                       )}
                     >
                       <option value="">{draftState.playerAssignments[brawlerId] ? '(Desmarcar Player)' : 'Vincular jogador...'}</option>
                       {tbkPlayers.map(player => {
                         const isAssignedToOther = Object.entries(draftState.playerAssignments).some(([bId, pId]) => pId === player.id && bId !== brawlerId);
                         const isSuggested = suggestedAssignments[brawlerId] === player.id;
                         return (
                           <option key={player.id} value={player.id} disabled={isAssignedToOther}>
                             {player.nickname} {isAssignedToOther ? '(Já alocado)' : isSuggested ? '⭐ Sugerido' : ''}
                           </option>
                         );
                       })}
                     </select>
                     <User className="w-4 h-4 absolute right-3 top-2.5 text-slate-500 dark:text-zinc-500 pointer-events-none" />
                   </div>
                 </div>
               );
             })}
           </div>
           
           <div className="mt-4 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] p-3 rounded-lg">
             <div className="text-xs text-slate-500 dark:text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Bans da TBK</div>
             <div className="flex gap-2">
               {draftState.tbkBans.map((bId, i) => {
                 if (!bId) return null;
                 const b = brawlers.find(b => b.id === bId);
                 return (
                   <div key={i} className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                     <div className="w-4 h-4 rounded bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                       {b?.iconUrl && <img src={b?.iconUrl} alt="" className="w-full h-full object-cover" />}
                     </div>
                     {b?.name}
                   </div>
                 )
               })}
             </div>
           </div>
        </div>

        {/* Enemy Team */}
        <div className="space-y-4">
           <h3 className="text-lg font-bold text-red-400 border-b border-slate-200 dark:border-[#2A2A2A] pb-2">Composição Inimiga</h3>
           <div className="flex gap-4">
             {enemyPicks.map(brawlerId => {
               const brawler = brawlers.find(b => b.id === brawlerId);
               return (
                 <div key={brawlerId} className="bg-white dark:bg-[#1A1A1A] border border-red-500/20 rounded-lg p-3 flex flex-col items-center gap-2 flex-1">
                    <div className="w-12 h-12 rounded bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                      {brawler?.imageUrl && <img src={brawler.imageUrl} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{brawler?.name}</span>
                 </div>
               );
             })}
           </div>
           
           <div className="mt-4 bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] p-3 rounded-lg">
             <div className="text-xs text-slate-500 dark:text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Bans do Inimigo</div>
             <div className="flex gap-2">
               {draftState.enemyBans.map((bId, i) => {
                 if (!bId) return null;
                 const b = brawlers.find(b => b.id === bId);
                 return (
                   <div key={i} className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                     <div className="w-4 h-4 rounded bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                       {b?.iconUrl && <img src={b?.iconUrl} alt="" className="w-full h-full object-cover" />}
                     </div>
                     {b?.name}
                   </div>
                 )
               })}
             </div>
           </div>
        </div>
      </div>

      {/* Result Selection */}
      <div className="pt-6 border-t border-slate-200 dark:border-[#2A2A2A]">
        <h3 className="text-center text-lg font-bold text-slate-900 dark:text-white mb-6">Qual foi o resultado?</h3>
        
        <div className="flex gap-4 max-w-2xl mx-auto">
           <button
             onClick={() => { setResult('victory'); setIsTestingVariation(false); }}
             className={cn(
               "flex-1 py-6 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300",
               result === 'victory' 
                 ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-[1.02]" 
                 : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A] text-slate-500 dark:text-zinc-500 hover:border-emerald-500/50 hover:text-emerald-400/80",
               result === 'defeat' && "opacity-50 scale-95"
             )}
           >
             <Trophy className="w-8 h-8" />
             <span className="text-lg font-bold">Vitória</span>
           </button>
           
           <button
             onClick={() => setResult('defeat')}
             className={cn(
               "flex-1 py-6 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-300",
               result === 'defeat' 
                 ? "bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)] scale-[1.02]" 
                 : "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A] text-slate-500 dark:text-zinc-500 hover:border-red-500/50 hover:text-red-400/80",
               result === 'victory' && "opacity-50 scale-95"
             )}
           >
             <XCircle className="w-8 h-8" />
             <span className="text-lg font-bold">Derrota</span>
           </button>
        </div>
      </div>

      {/* Test Variation Flow (If Defeat) */}
      {result === 'defeat' && (
        <div className="mt-8 animate-in fade-in slide-in-from-top-4">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-xl border border-slate-200 dark:border-[#2A2A2A] p-4 sm:p-6 max-w-2xl mx-auto">
            <h4 className="text-center text-slate-900 dark:text-white font-bold mb-6">Derrota registrada. E agora?</h4>
            {/* Aviso quando jogadores não vinculados */}
            {!allPlayersAssigned && (
              <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5">
                <span className="text-amber-400 text-sm mt-0.5">⚠</span>
                <p className="text-amber-400 text-xs leading-snug">
                  {unassignedCount === tbkPicks.length
                    ? 'Nenhum jogador vinculado. Vincule pelo menos um atleta acima para registrar quem jogou.'
                    : `${unassignedCount} brawler${unassignedCount > 1 ? 's' : ''} sem jogador vinculado. A partida será salva sem esses vínculos.`}
                </p>
              </div>
            )}
            <div className="flex gap-4">
              <button 
                onClick={handleSaveResult}
                className={cn(
                  "flex-1 p-4 border rounded-lg font-medium transition-all duration-200 h-auto min-h-[100px] flex flex-col items-center justify-center",
                  allPlayersAssigned
                    ? "bg-slate-50 dark:bg-[#0A0A0A] border-slate-200 dark:border-[#2A2A2A] hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-900 dark:text-white cursor-pointer"
                    : "bg-slate-50 dark:bg-[#0A0A0A] border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5 text-slate-900 dark:text-white cursor-pointer"
                )}
              >
                <ArrowRight className={cn("w-5 h-5 mb-2", allPlayersAssigned ? "text-slate-500 dark:text-zinc-400" : "text-amber-400")} />
                <span className="text-sm font-bold block mb-1">Salvar Derrota da Scrim</span>
                <span className={cn("text-xs font-normal leading-tight text-center", allPlayersAssigned ? "text-slate-500 dark:text-zinc-500" : "text-amber-400/70")}>
                  {allPlayersAssigned ? 'Registra no histórico e encerra' : 'Salvará sem vínculos de jogadores'}
                </span>
              </button>
              
              <button 
                onClick={() => setIsTestingVariation(true)}
                className={cn(
                  "flex-1 p-4 rounded-lg font-medium transition-colors border h-auto min-h-[100px] flex flex-col items-center justify-center text-center",
                  isTestingVariation ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                )}
              >
                <span className="text-sm font-bold block mb-1">Testar Variação</span>
                <span className="text-xs opacity-70 font-normal leading-tight text-center">Troque um brawler e teste a comp</span>
              </button>
            </div>
            
            {isTestingVariation && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-[#0A0A0A] rounded-lg border border-slate-200 dark:border-[#2A2A2A] space-y-4">
                <h5 className="text-sm font-bold text-slate-900 dark:text-white text-center">Testar variação da composição TBK</h5>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 w-full relative">
                    <label className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">Brawler que saiu</label>
                    <div className="relative group">
                       <select 
                         value={brawlerOut} 
                         onChange={(e) => setBrawlerOut(e.target.value)}
                         className="w-full bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-md pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-emerald-500"
                       >
                         <option value="">Selecionar...</option>
                          {tbkPicks.map(id => (
                            <option key={id} value={id}>{brawlers.find(b => b.id === id)?.name}</option>
                         ))}
                       </select>
                       <div className={cn("absolute left-2 top-1.5 w-6 h-6 rounded overflow-hidden pointer-events-none", brawlerOut ? getBrawlerBgColor(brawlers.find(b => b.id === brawlerOut) || {}) : "bg-slate-200 dark:bg-zinc-800")}>
                         {brawlerOut && brawlers.find(b => b.id === brawlerOut)?.iconUrl && (
                            <img src={brawlers.find(b => b.id === brawlerOut)?.imageUrl || brawlers.find(b => b.id === brawlerOut)?.iconUrl} className="w-full h-full object-cover" />
                         )}
                       </div>
                    </div>
                  </div>
                    
                  <div className="text-slate-500 dark:text-zinc-500 mt-5 hidden sm:block"><ArrowRight className="w-5 h-5" /></div>
                    
                  <div className="flex-1 w-full relative">
                    <label className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">Brawler que entrou</label>
                    <div className="relative group">
                       <select 
                         value={brawlerIn} 
                         onChange={(e) => setBrawlerIn(e.target.value)}
                         className="w-full bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-md pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-emerald-500"
                       >
                         <option value="">Selecionar...</option>
                          {brawlers.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                       </select>
                       <div className={cn("absolute left-2 top-1.5 w-6 h-6 rounded overflow-hidden pointer-events-none", brawlerOut ? getBrawlerBgColor(brawlers.find(b => b.id === brawlerOut) || {}) : "bg-slate-200 dark:bg-zinc-800")}>
                         {brawlerIn && brawlers.find(b => b.id === brawlerIn)?.iconUrl && (
                            <img src={brawlers.find(b => b.id === brawlerIn)?.imageUrl || brawlers.find(b => b.id === brawlerIn)?.iconUrl} className="w-full h-full object-cover" />
                         )}
                       </div>
                    </div>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                   <button 
                     onClick={() => setIsTestingVariation(false)}
                     className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white"
                   >
                     Cancelar
                   </button>
                   <button 
                     disabled={!brawlerOut || !brawlerIn || !allPlayersAssigned}
                     onClick={handleSaveResult}
                     className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white text-sm font-medium rounded-md"
                   >
                     Variação Venceu
                   </button>
                   <button 
                     disabled={!brawlerOut || !brawlerIn || !allPlayersAssigned}
                     onClick={() => { setIsTestingVariation(false); handleSaveResult(); }}
                     className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white text-sm font-medium rounded-md"
                   >
                     Variação Perdeu
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aviso quando jogadores não vinculados (vitória) */}
      {result === 'victory' && !allPlayersAssigned && (
        <div className="max-w-2xl mx-auto mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5">
          <span className="text-amber-400 text-sm mt-0.5">⚠</span>
          <p className="text-amber-400 text-xs leading-snug">
            {unassignedCount === tbkPicks.length
              ? 'Vincule os jogadores acima para registrar quem jogou. A partida pode ser salva sem vínculos.'
              : `${unassignedCount} brawler${unassignedCount > 1 ? 's' : ''} sem jogador vinculado. A partida será salva sem esses vínculos.`}
          </p>
        </div>
      )}

      {/* Save Buttons for Victory */}
      {result === 'victory' && (
        <div className="flex flex-col sm:flex-row justify-center mt-4 gap-4">
           <button 
             onClick={handleSaveResult}
             className={cn(
               "flex-1 border p-4 sm:p-6 rounded-xl transition-all duration-200 flex flex-col items-center justify-center text-center h-auto min-h-[100px]",
               allPlayersAssigned
                 ? "bg-white dark:bg-[#1A1A1A] border-emerald-500/30 hover:border-emerald-500 text-emerald-400 cursor-pointer"
                 : "bg-white dark:bg-[#1A1A1A] border-amber-500/30 hover:border-amber-500 text-emerald-400 cursor-pointer"
             )}
           >
             <span className="font-bold text-[15px] mb-2 block">Salvar Vitória da Scrim</span>
             <span className={cn("text-xs font-normal leading-tight block max-w-xs mx-auto", allPlayersAssigned ? "text-slate-500 dark:text-zinc-400" : "text-amber-400/70")}>
               {allPlayersAssigned ? 'Registra no histórico e atualiza stats no Dashboard' : 'Salvará sem vínculos de jogadores'}
             </span>
           </button>
           <button 
             onClick={handleSaveResult}
             className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white p-4 sm:p-6 rounded-xl transition-colors flex flex-col items-center justify-center text-center h-auto min-h-[100px] cursor-pointer"
           >
             <span className="font-bold text-[15px] mb-2 block">Salvar como Meta do Mapa</span>
             <span className="text-xs text-emerald-100 font-normal leading-tight block max-w-xs mx-auto">Define como trio referência na biblioteca de Mapas</span>
           </button>
        </div>
      )}


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
