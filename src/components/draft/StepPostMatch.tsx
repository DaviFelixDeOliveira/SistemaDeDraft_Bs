import { getBrawlerBgColor } from "../../lib/utils";
import React from "react";
import { useState } from 'react';
import { DraftState } from './DraftWizard';

import { ConfirmModal } from "../ui/ConfirmModal";
import { cn } from '../../lib/utils';
import { Trophy, XCircle, ArrowRight, User, MapPinned, Eye, RefreshCw, RotateCcw, CheckCircle2, AlertTriangle, ArrowLeftRight } from 'lucide-react';

import { analyticsService } from '../../services/analyticsService';
import { brawlerService } from '../../services/brawlerService';
import { mapService } from '../../services/mapService';
import { playerService } from '../../services/playerService';
import { Brawler, GameMap, Player } from '../../types';
import { BrawlerSelectDropdown } from '../ui/BrawlerSelectDropdown';
import { MapPreviewModal } from '../ui/MapPreviewModal';
import { recordVariationSeries } from '../../services/variationService';

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
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);

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
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, action: (() => void) | null, title: string, message: string }>({ isOpen: false, action: null, title: '', message: '' });
  const allyPicks = draftState.picks.filter(p => p.team === 'ally').map(p => p.brawlerId);
  const enemyPicks = draftState.picks.filter(p => p.team === 'enemy').map(p => p.brawlerId);

  const allyPlayers = players;

  // Determine suggested players based on comfort picks
  const suggestedAssignments = React.useMemo(() => {
    const assignments: Record<string, string> = {};
    const assigned = new Set<string>();

    allyPicks.forEach(bId => {
      const p = allyPlayers.find(pl => (pl.comfortBrawlers || []).includes(bId) && !assigned.has(pl.id));
      if (p) {
        assignments[bId] = p.id;
        assigned.add(p.id);
      }
    });
    return assignments;
  }, [allyPicks, allyPlayers]);
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
          allyPicks: allyPicks.map(bId => ({
            brawlerId: bId,
            playerId: draftState.playerAssignments[bId] || undefined
          })),
          enemyPicks: enemyPicks,
          allyBans: draftState.allyBans.filter(Boolean) as string[],
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

  /** Registra a derrota do draft original + o resultado real do segundo jogo testado. */
  const handleSaveVariation = (variationResult: 'victory' | 'defeat') => {
    if (result !== 'defeat' || !brawlerOut || !brawlerIn) return;
    const pairIds = { originalMatchId: crypto.randomUUID(), variationMatchId: crypto.randomUUID() };
    const outcomeLabel = variationResult === 'victory' ? 'venceu' : 'perdeu';
    setConfirmConfig({
      isOpen: true,
      title: variationResult === 'victory' ? 'Registrar variação vencedora' : 'Registrar variação derrotada',
      message: 'Serão registradas duas partidas no histórico: a derrota original e a partida em que a variação ' + outcomeLabel + '. O jogador do brawler substituído continuará vinculado ao novo brawler, se informado.',
      action: async () => {
        await recordVariationSeries({
          mapId: draftState.mapId,
          allyPicks: allyPicks.map(brawlerId => ({
            brawlerId,
            playerId: draftState.playerAssignments[brawlerId] || undefined
          })),
          enemyPicks,
          allyBans: draftState.allyBans.filter(Boolean) as string[],
          enemyBans: draftState.enemyBans.filter(Boolean) as string[],
          brawlerOut,
          brawlerIn,
          variationResult
        }, pairIds);
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        onFinish();
      }
    });
  };
  const closeVariation = () => {
    setIsTestingVariation(false);
    setBrawlerOut('');
    setBrawlerIn('');
  };

  /** Salvar Vitória da Scrim — registra a partida normalmente, sem criar meta */
  const handleSaveVictory = () => {
    if (result !== 'victory') return;
    setConfirmConfig({
      isOpen: true,
      title: 'Salvar Vitória da Scrim',
      message: 'Registrar esta vitória no histórico da equipe? Nenhuma composição meta será criada.',
      action: async () => {
        await analyticsService.recordScrim({
          mapId: draftState.mapId,
          result: 'victory',
          allyPicks: allyPicks.map(bId => ({
            brawlerId: bId,
            playerId: draftState.playerAssignments[bId] || undefined
          })),
          enemyPicks: enemyPicks,
          allyBans: draftState.allyBans.filter(Boolean) as string[],
          enemyBans: draftState.enemyBans.filter(Boolean) as string[],
        });
        onFinish();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  /** Salvar como Meta do Mapa — registra a vitória E cria uma composição meta */
  const handleSaveAsMapMeta = () => {
    if (result !== 'victory') return;
    if (allyPicks.length < 3) {
      alert('Selecione pelo menos 3 brawlers na nossa composição antes de salvar como meta.');
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: 'Salvar como Meta do Mapa',
      message: 'Registrar esta vitória E salvar a nossa composição como meta de referência para este mapa?',
      action: async () => {
        setIsSavingMeta(true);
        try {
          // 1. Registra a scrim como vitória
          await analyticsService.recordScrim({
            mapId: draftState.mapId,
            result: 'victory',
            allyPicks: allyPicks.map(bId => ({
              brawlerId: bId,
              playerId: draftState.playerAssignments[bId] || undefined
            })),
            enemyPicks: enemyPicks,
            allyBans: draftState.allyBans.filter(Boolean) as string[],
            enemyBans: draftState.enemyBans.filter(Boolean) as string[],
          });

          // 2. Cria a composição meta no Supabase
          const mapName = map?.name || 'Mapa';
          await mapService.createComp({
            mapId: draftState.mapId,
            brawlers: allyPicks.slice(0, 3) as [string, string, string],
            description: `Meta — ${mapName}`,
            winrate: 0,
            matchesPlayed: 0,
          }, true); // isMeta = true

          setMetaSaved(true);
        } finally {
          setIsSavingMeta(false);
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        onFinish();
      }
    });
  };
  const allPlayersAssigned = allyPicks.every(id => draftState.playerAssignments[id]);
  const anyPlayerAssigned = allyPicks.some(id => draftState.playerAssignments[id]);
  const unassignedCount = allyPicks.filter(id => !draftState.playerAssignments[id]).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Contexto da partida */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-400/20 bg-slate-50 dark:bg-[#141723] p-4 sm:p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-500/5" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#0B1220] shadow-inner">
              {map?.imageUrl ? (
                <img src={map.imageUrl} alt="" className="h-full w-full object-contain" />
              ) : <MapPinned className="h-8 w-8 text-indigo-400" aria-hidden="true" />}
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500 dark:text-cyan-300">Mapa da partida</p>
              <h3 className="truncate text-xl font-black text-slate-900 dark:text-white sm:text-2xl">{map?.name || 'Mapa não encontrado'}</h3>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-indigo-700 dark:text-indigo-200">{map?.mode || 'Modo não informado'}</span>
                {map?.terrain && <span className="rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2.5 py-1 text-slate-600 dark:text-zinc-300">Terreno {map.terrain}</span>}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            {onRestartPicks && (
              <button type="button" onClick={onRestartPicks}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-zinc-100 transition-all hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-cyan-300 focus-visible:ring-2 focus-visible:ring-cyan-400 sm:flex-none">
                <RefreshCw size={16} aria-hidden="true" /> Mudar composição
              </button>
            )}
            <button type="button" onClick={() => setShowMapPreview(true)} disabled={!map}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
              <Eye size={17} aria-hidden="true" /> Ver mapa
            </button>
          </div>
        </div>
      </div>

      {/* Compositions & Player Assignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
        {/* Nossa equipe Team */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-emerald-400 border-b border-slate-200 dark:border-[#2A2A2A] pb-2">Nossa composição</h3>
          <div className="space-y-3">
            {allyPicks.map(brawlerId => {
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
                        !draftState.playerAssignments[brawlerId] && suggestedAssignments[brawlerId] ? "border-[#22D3EE] text-[#22D3EE]" : "border-slate-200 dark:border-[#2A2A2A] text-slate-900 dark:text-white"
                      )}
                    >
                      <option value="">{draftState.playerAssignments[brawlerId] ? '(Desmarcar Player)' : 'Vincular jogador...'}</option>
                      {allyPlayers.map(player => {
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
            <div className="text-xs text-slate-500 dark:text-zinc-500 mb-2 uppercase tracking-wider font-semibold">Nossos Bans</div>
            <div className="flex gap-2">
              {draftState.allyBans.map((bId, i) => {
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

      {/* Resultado da partida */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14161F] p-4 sm:p-6">
        <div className="mb-5 text-center">
          <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-indigo-500 dark:text-cyan-400">Encerramento do draft</p>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Qual foi o resultado?</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Escolha o resultado para continuar com o registro.</p>
        </div>
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-5">
          <button type="button" aria-pressed={result === 'victory'}
            onClick={() => { setResult('victory'); closeVariation(); }}
            className={cn(
              "group flex min-h-[130px] flex-col items-center justify-center gap-3 rounded-2xl border-2 px-3 py-5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-emerald-400",
              result === 'victory'
                ? "border-emerald-400 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.13)]"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0D13] text-slate-400 dark:text-zinc-400 hover:border-emerald-500/60 hover:bg-emerald-500/5 hover:text-emerald-600 dark:hover:text-emerald-300"
            )}>
            <Trophy size={32} className="transition-transform group-hover:scale-110" aria-hidden="true" />
            <span className="text-base font-black sm:text-lg">Vitória</span>
            <span className="text-[11px] font-medium opacity-75">A composição venceu</span>
          </button>
          <button type="button" aria-pressed={result === 'defeat'}
            onClick={() => setResult('defeat')}
            className={cn(
              "group flex min-h-[130px] flex-col items-center justify-center gap-3 rounded-2xl border-2 px-3 py-5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-rose-400",
              result === 'defeat'
                ? "border-rose-400 bg-rose-500/15 text-rose-600 dark:text-rose-300 shadow-[0_0_22px_rgba(244,63,94,0.12)]"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0D13] text-slate-400 dark:text-zinc-400 hover:border-rose-500/60 hover:bg-rose-500/5 hover:text-rose-600 dark:hover:text-rose-300"
            )}>
            <XCircle size={32} className="transition-transform group-hover:scale-110" aria-hidden="true" />
            <span className="text-base font-black sm:text-lg">Derrota</span>
            <span className="text-[11px] font-medium opacity-75">A composição perdeu</span>
          </button>
        </div>
      </div>

      {/* Ações após a derrota */}
      {result === 'defeat' && (
        <section className="mx-auto max-w-4xl space-y-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#151720] p-4 sm:p-6 animate-in fade-in slide-in-from-top-4">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500 dark:text-rose-400">Próximo passo</p>
            <h4 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">A partida terminou em derrota. E agora?</h4>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Registre o resultado ou teste uma nova composição.</p>
          </div>

          {!allPlayersAssigned && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3.5">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                {unassignedCount === allyPicks.length
                  ? 'Nenhum jogador vinculado. Você pode registrar a partida, mas ela ficará sem estatísticas individuais dos atletas.'
                  : unassignedCount + ' brawler' + (unassignedCount > 1 ? 's' : '') + ' sem jogador vinculado. Esses picks serão registrados sem atleta.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button type="button" onClick={handleSaveResult}
              className="group flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-rose-700 dark:text-rose-300 transition-all hover:border-rose-400 hover:bg-rose-500/10 focus-visible:ring-2 focus-visible:ring-rose-400">
              <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              <span className="font-bold">Salvar derrota</span>
              <span className="text-center text-xs text-rose-700/70 dark:text-rose-200/70">Registra uma partida e atualiza o histórico</span>
            </button>
            <button type="button" aria-expanded={isTestingVariation}
              onClick={() => setIsTestingVariation(v => !v)}
              className={cn(
                "group flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-xl border p-4 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400",
                isTestingVariation
                  ? "border-cyan-400 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                  : "border-indigo-400/30 bg-indigo-500/5 text-indigo-700 dark:text-indigo-200 hover:border-indigo-400 hover:bg-indigo-500/10"
              )}>
              <ArrowLeftRight size={22} className="transition-transform group-hover:scale-110" aria-hidden="true" />
              <span className="font-bold">{isTestingVariation ? 'Escolhendo variação' : 'Testar variação'}</span>
              <span className="text-center text-xs opacity-75">Substitua um brawler e registre o resultado do teste</span>
            </button>
          </div>

          {isTestingVariation && (
            <div className="space-y-5 rounded-2xl border border-indigo-500/20 bg-white dark:bg-[#0D111B] p-4 sm:p-6">
              <div>
                <h5 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
                  <RotateCcw size={18} className="text-indigo-500 dark:text-cyan-400" aria-hidden="true" />
                  Variação da nossa composição
                </h5>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                  Selecione quem saiu, quem entrou e informe o resultado da segunda partida.
                </p>
              </div>
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
                <div className="min-w-0 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-zinc-300">Brawler que saiu</label>
                  <BrawlerSelectDropdown
                    placeholder="Escolher do trio atual..."
                    value={brawlerOut}
                    onChange={setBrawlerOut}
                    disabledBrawlers={[]}
                    allBrawlers={brawlers.filter(b => allyPicks.includes(b.id))}
                  />
                </div>
                <div className="hidden h-12 items-center justify-center text-indigo-500 dark:text-cyan-400 sm:flex">
                  <ArrowRight size={22} aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-zinc-300">Brawler que entrou</label>
                  <BrawlerSelectDropdown
                    placeholder="Escolher substituto..."
                    value={brawlerIn}
                    onChange={setBrawlerIn}
                    disabledBrawlers={[...allyPicks, ...enemyPicks, ...draftState.allyBans.filter(Boolean), ...draftState.enemyBans.filter(Boolean)] as string[]}
                    allBrawlers={brawlers.filter(b => b.is_active !== false)}
                  />
                </div>
              </div>

              {brawlerOut && brawlerIn && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-center text-xs font-medium text-slate-600 dark:text-zinc-300">
                  {brawlers.find(b => b.id === brawlerOut)?.name || 'Brawler original'} → {brawlers.find(b => b.id === brawlerIn)?.name || 'Novo brawler'}
                </div>
              )}

              <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                Ao confirmar, serão registradas <strong>duas partidas reais</strong>: a derrota original e o resultado do teste com a nova composição.
                Os vínculos de jogadores são opcionais.
              </p>
              <div className="grid grid-cols-1 gap-2 border-t border-slate-200 dark:border-white/10 pt-4 sm:grid-cols-3">
                <button type="button" onClick={closeVariation}
                  className="min-h-12 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-[#222632] px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-zinc-200 transition-colors hover:border-slate-400 dark:hover:border-white/30 hover:bg-slate-200 dark:hover:bg-[#303648] hover:text-slate-900 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-400">
                  Cancelar
                </button>
                <button type="button"
                  disabled={!brawlerOut || !brawlerIn || brawlerOut === brawlerIn}
                  onClick={() => handleSaveVariation('victory')}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-black text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 focus-visible:ring-2 focus-visible:ring-emerald-400">
                  <CheckCircle2 size={16} aria-hidden="true" /> Variação venceu
                </button>
                <button type="button"
                  disabled={!brawlerOut || !brawlerIn || brawlerOut === brawlerIn}
                  onClick={() => handleSaveVariation('defeat')}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-black text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 focus-visible:ring-2 focus-visible:ring-rose-400">
                  <XCircle size={16} aria-hidden="true" /> Variação perdeu
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Aviso quando jogadores não vinculados (vitória) */}
      {result === 'victory' && !allPlayersAssigned && (
        <div className="max-w-2xl mx-auto mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5">
          <span className="text-amber-400 text-sm mt-0.5">⚠</span>
          <p className="text-amber-400 text-xs leading-snug">
            {unassignedCount === allyPicks.length
              ? 'Vincule os jogadores acima para registrar quem jogou. A partida pode ser salva sem vínculos.'
              : `${unassignedCount} brawler${unassignedCount > 1 ? 's' : ''} sem jogador vinculado. A partida será salva sem esses vínculos.`}
          </p>
        </div>
      )}

      {/* Save Buttons for Victory */}
      {result === 'victory' && (
        <div className="flex flex-col sm:flex-row justify-center mt-4 gap-4">
          <button
            onClick={handleSaveVictory}
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
            onClick={handleSaveAsMapMeta}
            disabled={isSavingMeta || allyPicks.length < 3}
            className={cn(
              "flex-1 p-4 sm:p-6 rounded-xl transition-colors flex flex-col items-center justify-center text-center h-auto min-h-[100px] cursor-pointer",
              metaSaved
                ? "bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400"
                : "bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
            )}
          >
            {isSavingMeta ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
                <span className="font-bold text-[15px] block">Salvando...</span>
              </>
            ) : metaSaved ? (
              <>
                <span className="text-2xl mb-1">✅</span>
                <span className="font-bold text-[15px] block">Meta Salva!</span>
                <span className="text-xs font-normal leading-tight block max-w-xs mx-auto text-emerald-300">Composição registrada na biblioteca de Mapas</span>
              </>
            ) : (
              <>
                <span className="font-bold text-[15px] mb-2 block">Salvar como Meta do Mapa</span>
                <span className="text-xs text-emerald-100 font-normal leading-tight block max-w-xs mx-auto">Define como trio referência na biblioteca de Mapas</span>
              </>
            )}
          </button>
        </div>
      )}


      {showMapPreview && map && <MapPreviewModal map={map} onClose={() => setShowMapPreview(false)} />}

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
