import { getBrawlerBgColor } from "../../lib/utils";
import React, { useState, useEffect } from 'react';
import { User, Plus, Edit2, Trash2, Award, Zap, Trophy, Shield, Crosshair, Archive, ArchiveRestore } from 'lucide-react';
import { playerService } from '../../services/playerService';
import { brawlerService } from '../../services/brawlerService';
import { Player, Brawler } from '../../types';
import { cn } from '../../lib/utils';
import { DeleteModal, DetailsModal, EditModal } from './PlayerModals';
import { ConfirmModal } from "../ui/ConfirmModal";

import { analyticsService } from '../../services/analyticsService';

import { UserRole } from '../LockScreen';

interface PlayersHubProps {
  userRole?: UserRole;
}

export function PlayersHub({ userRole = 'admin' }: PlayersHubProps) {
  const isPlayerMode = userRole === 'player';
  const [players, setPlayers] = useState<Player[]>([]);
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewActive, setViewActive] = useState(true);

  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, action: (() => void) | null, title: string, message: string, processingText?: string, successText?: string }>({ isOpen: false, action: null, title: '', message: '' });

  const [playerStatsMap, setPlayerStatsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [pData, bData] = await Promise.all([
      playerService.getPlayers(),
      brawlerService.getBrawlers()
    ]);
    setPlayers(pData);
    setBrawlers(bData);

    const statsMap: Record<string, any> = {};
    await Promise.all(pData.map(async (p) => {
      statsMap[p.id] = await analyticsService.getPlayerStats(p.id);
    }));
    setPlayerStatsMap(statsMap);
  };

  const filteredPlayers = players.filter(p => (p.isActive !== false) === viewActive);

  const getPlayerStats = (playerId: string) => {
    return playerStatsMap[playerId] || {
      winrate: 0,
      matches: 0,
      recentMatches: []
    };
  };

  const togglePlayerStatus = (playerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const isArchiving = player.isActive !== false;

    setConfirmConfig({
      isOpen: true,
      title: isArchiving ? 'Arquivar Jogador' : 'Desarquivar Jogador',
      message: `Tem certeza que deseja ${isArchiving ? 'arquivar' : 'desarquivar'} o jogador ${player.nickname}?`,
      processingText: isArchiving ? 'Arquivando...' : 'Desarquivando...',
      successText: isArchiving ? '✅ Arquivado com sucesso!' : '✅ Desarquivado com sucesso!',
      action: async () => {
        const nextStatus = !isArchiving;
        await playerService.updatePlayerStatus(playerId, nextStatus);
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isActive: nextStatus, is_active: nextStatus } : p));
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleSave = (player: Player) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Salvar Alterações',
      message: `Confirmar as alterações no jogador ${player.nickname}?`,
      action: async () => {
        if (editingPlayer || isAddModalOpen) {
          const savedPlayer = await playerService.savePlayer(player);
          const exists = players.find(p => p.id === player.id);
          if (exists) {
            setPlayers(prev => prev.map(p => p.id === player.id ? savedPlayer : p));
          } else {
            setPlayers(prev => [...prev, savedPlayer]);
          }
          setEditingPlayer(null);
          setIsAddModalOpen(false);
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeletePlayer = (playerId: string, nickname: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Jogador',
      message: `Tem certeza que deseja excluir o jogador ${nickname}? Esta ação não pode ser desfeita.`,
      processingText: 'Excluindo...',
      successText: '✅ Excluído com sucesso!',
      action: async () => {
        await playerService.deletePlayer(playerId);
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        if (selectedPlayer?.id === playerId) setSelectedPlayer(null);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };



  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Gestão de Elenco</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Gerencie os atletas e seus picks de conforto.</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg">
            <button
              onClick={() => setViewActive(true)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                viewActive ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              Ativos
            </button>
            <button
              onClick={() => setViewActive(false)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                !viewActive ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              Arquivados
            </button>
          </div>
          {!isPlayerMode && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#FF3366] hover:bg-[#E62E5C] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 w-fit"
            >
              <Plus className="w-4 h-4" />
              Novo Jogador
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPlayers.map(player => {
          const stats = getPlayerStats(player.id);
          const comfortBrawlers = (player.comfortBrawlers || []).map(id => brawlers.find(b => b.id === id)).filter(Boolean);

          return (
            <div key={player.id} className="bg-white dark:bg-[#121212] rounded-xl border border-zinc-200 dark:border-[#2A2A2A] shadow-sm hover:shadow-md dark:shadow-none transition-shadow overflow-hidden flex flex-col group">
              {/* Card Header */}
              <div
                className="p-5 border-b border-zinc-100 dark:border-[#2A2A2A] relative cursor-pointer"
                onClick={() => setSelectedPlayer(player)}
              >
                {!isPlayerMode && (
                  <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingPlayer(player); }}
                      className="text-zinc-400 hover:text-blue-500 transition-colors p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm"
                      title="Editar Jogador"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id, player.nickname); }}
                      className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm"
                      title="Excluir Jogador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-1 pr-16">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">{player.nickname}</h3>
                    {!isPlayerMode && (
                      <button
                        onClick={(e) => togglePlayerStatus(player.id, e)}
                        className="text-zinc-400 hover:text-amber-500 transition-colors p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-sm"
                        title={player.isActive !== false ? "Arquivar Jogador" : "Desarquivar Jogador"}
                      >
                        {player.isActive !== false ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  {player.tags && player.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {player.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-2 divide-x divide-zinc-100 dark:divide-[#2A2A2A] border-b border-zinc-100 dark:border-[#2A2A2A] bg-zinc-50/50 dark:bg-[#1A1A1A]/30">
                <div className="p-4 text-center">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold mb-1">Winrate</div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.winrate}%</div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{stats.matches} partidas</div>
                </div>
                <div className="p-4 text-center flex flex-col items-center justify-center">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold mb-2">Forma Recente</div>
                  <div className="flex gap-1 justify-center">
                    {stats.recentMatches.map((isWin, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold text-white",
                          isWin ? "bg-emerald-500" : "bg-red-500"
                        )}
                      >
                        {isWin ? 'V' : 'D'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comfort Brawlers & Tags */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-300 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#FFCC00]" />
                    Comfort Picks
                  </h4>
                </div>

                {comfortBrawlers.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 cursor-pointer" onClick={() => setSelectedPlayer(player)}>
                    {comfortBrawlers.map(b => (
                      <div key={b?.id} className="flex-shrink-0 flex flex-col items-center gap-1 w-12">
                        <div className={cn("w-12 h-12 rounded-lg border border-zinc-200 dark:border-[#2A2A2A] overflow-hidden", getBrawlerBgColor(b))}>
                          {b?.iconUrl && <img src={b.iconUrl} alt={b.name} className="w-full h-full object-cover" />}
                        </div>
                        <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 truncate w-full text-center">{b?.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500 dark:text-zinc-500 italic py-2">
                    Nenhum brawler conforto registrado.
                  </div>
                )}

                <div className="mt-auto pt-4 flex items-center justify-between cursor-pointer" onClick={() => setSelectedPlayer(player)}>
                  <div className="flex flex-wrap gap-2">
                    {player.tags?.map((tag, idx) => (
                      <span key={idx} className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded bg-[#FFCC00]/10 text-amber-600 dark:text-[#FFCC00] border border-[#FFCC00]/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className={cn(
                    "text-[10px] px-2 py-1 rounded-full border font-bold uppercase tracking-wider shrink-0",
                    player.status === 'Titular'
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                  )}>
                    {player.status || 'Reserva'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Draft Integration Callout */}
      <div className="mt-8 bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-blue-500/20 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex flex-shrink-0 items-center justify-center">
          <Zap className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h3 className="text-zinc-900 dark:text-white font-bold mb-1"> Picks Confortos Ativo</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Os Picks Confortos atribuídos aos jogadores  concedem automaticamente <strong>+15 pts de Sinergia</strong> no algoritmo de recomendação durante a fase de Draft.
          </p>
        </div>
      </div>

      <DetailsModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
        stats={selectedPlayer ? getPlayerStats(selectedPlayer.id) : { winrate: 0, matches: 0, recentMatches: [] }}
      />

      <EditModal
        isOpen={!!editingPlayer || isAddModalOpen}
        onClose={() => { setEditingPlayer(null); setIsAddModalOpen(false); }}
        player={editingPlayer}
        onSave={handleSave}
      />


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
