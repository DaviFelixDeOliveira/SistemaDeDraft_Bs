import React from "react";
import { useState, useEffect, useCallback, useRef } from 'react';
import { StepMapAndBans } from './StepMapAndBans';
import { StepPicks } from './StepPicks';
import { StepPostMatch } from './StepPostMatch';
import { RotateCcw, Trash2, Check } from 'lucide-react';
import { TrainingSessionManager } from './TrainingSessionManager';
import { DraftTacticsBanner } from './DraftTacticsBanner';
import { ConfirmModal } from '../ui/ConfirmModal';
import type { DraftAutoRoomEvent } from '../../services/draftAutoGuestService';
import { importDraftAutoEvent } from '../../lib/draftAutoImport';

export interface DraftState {
  mapId: string;

  allyStarts: boolean;
  allyBans: (string | null)[]; // 3 slots
  enemyBans: (string | null)[]; // 3 slots
  picks: { brawlerId: string; team: 'ally' | 'enemy' }[]; // Up to 6 picks
  playerAssignments: Record<string, string>; // brawlerId -> playerId
}

const initialDraftState: DraftState = {
  mapId: '',
  allyStarts: true,
  allyBans: [null, null, null],
  enemyBans: [null, null, null],
  picks: [],
  playerAssignments: {},
};

const DRAFT_STATE_KEY = 'sistema_draft_draft_state';
const DRAFT_STEP_KEY = 'sistema_draft_draft_step';
const DRAFT_HISTORY_KEY = 'sistema_draft_draft_history';

interface DraftWizardProps {
  incomingEvent?: DraftAutoRoomEvent | null;
  incomingCount?: number;
  incomingIndex?: number;
  onMoveIncoming?: (offset: -1 | 1) => void;
  onDecideIncoming?: (event: DraftAutoRoomEvent, status: 'applied' | 'dismissed') => Promise<void>;
}

export function DraftWizard({
  incomingEvent = null, incomingCount = 0, incomingIndex = -1,
  onMoveIncoming, onDecideIncoming,
}: DraftWizardProps = {}) {
  // Item 2: Restaura o rascunho do draft e etapa do localStorage ao carregar a página
  const [step, setStep] = useState<1 | 2 | 3>(() => {
    try {
      const savedStep = localStorage.getItem(DRAFT_STEP_KEY);
      return savedStep ? (Number(savedStep) as 1 | 2 | 3) : 1;
    } catch {
      return 1;
    }
  });

  const [draftState, setDraftState] = useState<DraftState>(() => {
    try {
      const savedState = localStorage.getItem(DRAFT_STATE_KEY);
      return savedState ? JSON.parse(savedState) : initialDraftState;
    } catch {
      return initialDraftState;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  
  const [draftHistory, setDraftHistory] = useState<{state: DraftState, step: 1|2|3}[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const latestDraftState = useRef(draftState);
  const latestStep = useRef(step);
  useEffect(() => {
    latestDraftState.current = draftState;
    latestStep.current = step;
  }, [draftState, step]);

  // Track state changes to push to history
  const setDraftStateWithHistory = useCallback((value: React.SetStateAction<DraftState>) => {
    const prev = latestDraftState.current;
    const currentStepVal = latestStep.current;
    const nextState = typeof value === 'function' ? (value as Function)(prev) : value;
    
    if (JSON.stringify(prev) !== JSON.stringify(nextState)) {
      setDraftHistory(h => {
        const newHistory = [...h.slice(-29), { state: prev, step: currentStepVal }];
        try {
          localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
        } catch (e) {
          console.warn('Erro ao salvar histórico do draft:', e);
        }
        return newHistory;
      });
      setDraftState(nextState);
    }
  }, []);

  // Custom undo action instantânea e granular
  const performUndo = useCallback(() => {
    setDraftHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      
      const newHistory = [...prevHistory];
      const last = newHistory.pop();
      if (last) {
        setDraftState(last.state);
        setStep(last.step);
        try {
          localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
        } catch (e) {
          console.warn('Erro ao atualizar histórico após undo:', e);
        }
      }
      return newHistory;
    });
  }, []);

  const handleUndo = useCallback(() => {
    performUndo();
  }, [performUndo]);

  // Global Keydown listener: Ctrl+Z para desfazer, ESC para fechar modais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tecla ESC fecha modais abertos
      if (e.key === 'Escape') {
        if (confirmResetOpen) {
          e.preventDefault();
          setConfirmResetOpen(false);
          return;
        }
      }

      // Atalho Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        // Ignora se estiver digitando em campo de texto ou se modal estiver aberto
        if (confirmResetOpen) return;
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return; // Mantém undo nativo dos inputs
        }
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, confirmResetOpen]);


  // Persiste draftState e step no localStorage a cada alteração (Item 2)
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STATE_KEY, JSON.stringify(draftState));
      localStorage.setItem(DRAFT_STEP_KEY, String(step));
    } catch (e) {
      console.warn('Erro ao salvar rascunho do draft no localStorage:', e);
    }
  }, [draftState, step]);

  const handleNextStep = () => {
    if (step < 3) {
      setIsLoading(true);
      setTimeout(() => {
        setDraftHistory(h => {
          const newHistory = [...h.slice(-29), { state: draftState, step }];
          try {
            localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
          } catch (e) {
            console.warn('Erro ao salvar histórico do draft:', e);
          }
          return newHistory;
        });
        setStep((s) => (s + 1) as 1 | 2 | 3);
        setIsLoading(false);
      }, 800);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setDraftHistory(h => {
        const newHistory = [...h.slice(-29), { state: draftState, step }];
        try {
          localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
        } catch (e) {
          console.warn('Erro ao salvar histórico do draft:', e);
        }
        return newHistory;
      });
      setStep((s) => (s - 1) as 1 | 2 | 3);
    }
  };

  // Item 4: Limpar campos do draft de uma só vez
  const resetDraft = () => {
    setDraftHistory(h => {
      const newHistory = [...h.slice(-29), { state: draftState, step }];
      try {
        localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
      } catch (e) {
        console.warn('Erro ao salvar histórico do draft:', e);
      }
      return newHistory;
    });
    setDraftState({
      mapId: '',
      allyStarts: true,
      allyBans: [null, null, null],
      enemyBans: [null, null, null],
      picks: [],
      playerAssignments: {}
    });
    setStep(1);
    setConfirmResetOpen(false);
    try {
      localStorage.removeItem(DRAFT_STATE_KEY);
      localStorage.removeItem(DRAFT_STEP_KEY);
    } catch (e) {
      console.warn('Erro ao limpar rascunho do localStorage:', e);
    }
  };

  const restartPicks = () => {
    setIsLoading(true);
    setTimeout(() => {
      setDraftState((prev) => ({ ...prev, picks: [] }));
      setStep(2);
      setIsLoading(false);
    }, 800);
  };

  useEffect(() => { setReviewError(''); }, [incomingEvent?.id]);
  const importPreview = incomingEvent ? importDraftAutoEvent(draftState, incomingEvent) : null;

  const confirmImport = async () => {
    if (!incomingEvent || !onDecideIncoming || reviewBusy) return;
    setReviewBusy(true); setReviewError('');
    try {
      // A second check uses the latest state in case the coach edited a field
      // while this event was pending. 'ignored' means it is already there.
      const result = importDraftAutoEvent(latestDraftState.current, incomingEvent);
      if (result.status === 'review') {
        setReviewError(result.message);
        return;
      }
      await onDecideIncoming(incomingEvent, 'applied');
      if (result.status === 'applied') {
        setDraftStateWithHistory(result.draft);
        if (incomingEvent.kind === 'pick' && latestStep.current === 1) setStep(2);
      }
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Não foi possível confirmar o evento.');
    } finally { setReviewBusy(false); }
  };
  const dismissImport = async () => {
    if (!incomingEvent || !onDecideIncoming || reviewBusy) return;
    setReviewBusy(true); setReviewError('');
    try {
      await onDecideIncoming(incomingEvent, 'dismissed');
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Não foi possível descartar o evento.');
    } finally { setReviewBusy(false); }
  };

  const totalSteps = 3;
  const progressPercentage = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-0">
      {incomingEvent && importPreview && (
        <section className="mb-6 p-4 rounded-xl border border-indigo-500/40 bg-indigo-500/5 space-y-3" aria-label="Revisar evento recebido do jogador">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-bold text-indigo-500">Fila de eventos — {incomingCount} pendente{incomingCount === 1 ? '' : 's'}</h3>
            <span className="text-xs text-zinc-500">
              {incomingIndex + 1} de {incomingCount} · {incomingEvent.guest?.display_name ?? 'Jogador'} · Enviado manualmente
            </span>
          </div>
          {incomingCount > 1 && (
            <div className="flex gap-2">
              <button type="button" disabled={reviewBusy} onClick={() => onMoveIncoming?.(-1)}
                className="text-xs rounded-lg px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 disabled:opacity-40">
                Anterior
              </button>
              <button type="button" disabled={reviewBusy} onClick={() => onMoveIncoming?.(1)}
                className="text-xs rounded-lg px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 disabled:opacity-40">
                Próximo
              </button>
            </div>
          )}
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {incomingEvent.kind === 'map' ? `Mapa: ${incomingEvent.map?.name ?? incomingEvent.map_id}`
              : incomingEvent.kind === 'first-pick' ? `Quem começa: ${incomingEvent.ally_starts ? 'Nossa equipe' : 'Inimigo'}`
              : `${incomingEvent.kind === 'ban' ? 'Ban' : 'Pick'} ${(incomingEvent.slot ?? 0) + 1} (${incomingEvent.team === 'ally' ? 'Nossa equipe' : 'Inimigo'}): ${incomingEvent.brawler?.name ?? incomingEvent.brawler_id}`}
          </p>
          <p className={`text-xs ${importPreview.status === 'review' ? 'text-amber-500' : 'text-zinc-500'}`}>
            {importPreview.status === 'applied' ? 'Pronto para aplicar após sua confirmação.'
              : importPreview.status === 'ignored' ? 'Informação já presente no Draft. Marque-a como revisada para continuar.'
              : importPreview.message}
          </p>
          {reviewError && <p role="alert" className="text-xs text-red-500">{reviewError}</p>}
          <p className="text-xs text-zinc-500">Nada será alterado até sua confirmação. As alterações entram no histórico de desfazer; nenhum treino ou resultado será salvo.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={reviewBusy || importPreview.status === 'review'} onClick={() => void confirmImport()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed">
              {reviewBusy ? 'Salvando...' : importPreview.status === 'ignored' ? 'Marcar como revisado' : 'Confirmar no Draft'}
            </button>
            <button type="button" disabled={reviewBusy} onClick={() => void dismissImport()}
              className="rounded-lg px-4 py-2 text-sm font-semibold border border-zinc-300 dark:border-zinc-700 disabled:opacity-40">
              Descartar evento
            </button>
          </div>
        </section>
      )}
      
      {confirmResetOpen && (
        <ConfirmModal
          isOpen={confirmResetOpen}
          title="Limpar Draft"
          message="Tem certeza que deseja limpar todos os campos do draft? Esta ação não pode ser desfeita."
          confirmText="Limpar Draft"
          variant="danger"
          onConfirm={() => resetDraft()}
          onCancel={() => setConfirmResetOpen(false)}
        />
      )}

      
      <div className="mb-6">
        <TrainingSessionManager />
      </div>

      {/* Steps Header & Reset Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8 bg-white dark:bg-[#121212] p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-[#2A2A2A] shadow-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-1">
          {[
            { id: 1, label: 'Mapa & Bans' },
            { id: 2, label: 'Draft' },
            { id: 3, label: 'Resultado' },
          ].map((s, idx) => (
            <React.Fragment key={s.id}>
              <div
                className={`flex flex-1 sm:flex-none items-center justify-center sm:justify-start min-w-[100px] gap-2 px-2 py-1.5 transition-all duration-300 ${
                  step === s.id
                    ? 'text-[#6366F1] font-bold'
                    : step > s.id
                    ? 'text-emerald-500 dark:text-emerald-400 font-semibold'
                    : 'text-slate-400 dark:text-zinc-500 font-medium'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex flex-shrink-0 items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step === s.id
                      ? 'bg-[#6366F1] text-white shadow-md shadow-[#6366F1]/20'
                      : step > s.id
                      ? 'bg-emerald-500/10 sm:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span className="text-sm sm:text-base whitespace-nowrap">{s.label}</span>
              </div>
              {idx < 2 && (
                <div className="hidden sm:block w-4 h-[2px] rounded-full bg-slate-200 dark:bg-zinc-800 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Item 4: Botão de Limpar Draft */}
        <button
          type="button"
          onClick={() => {
            if (
              draftState.mapId ||
              draftState.picks.length > 0 ||
              draftState.allyBans.some(Boolean) ||
              draftState.enemyBans.some(Boolean)
            ) {
              setConfirmResetOpen(true);
            } else {
              resetDraft();
            }
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-red-500/10 text-slate-500 hover:text-red-500 dark:bg-zinc-800/50 dark:hover:bg-red-500/10 dark:text-zinc-400 rounded-lg text-sm font-bold transition-colors whitespace-nowrap border border-transparent hover:border-red-500/20"
          title="Limpar todos os campos e reiniciar draft"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="inline">Limpar Draft</span>
        </button>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-[#121212] rounded-xl border border-slate-200 dark:border-[#2A2A2A] p-4 sm:p-6 shadow-sm sm:shadow-xl transition-all duration-500 ease-in-out relative min-h-[500px]">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-[#121212]/80 backdrop-blur-sm rounded-xl animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-[#6366F1] border-r-fuchsia-500 border-b-violet-500 animate-spin" />
            <div className="mt-4 font-bold text-slate-700 dark:text-zinc-300 animate-pulse text-sm uppercase tracking-widest">
              Processando IA...
            </div>
          </div>
        )}

        <DraftTacticsBanner 
          mapId={draftState.mapId} 
          allyStarts={draftState.allyStarts} 
          step={step} 
        />

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
            <StepMapAndBans
              draftState={draftState}
              setDraftState={setDraftStateWithHistory}
              onNext={handleNextStep}
            />
          </div>
        )}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-forwards">
            <StepPicks onUndo={handleUndo}
              draftState={draftState}
              setDraftState={setDraftStateWithHistory}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          </div>
        )}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-forwards">
            <StepPostMatch
              draftState={draftState}
              setDraftState={setDraftStateWithHistory}
              onFinish={resetDraft}
              onPrev={handlePrevStep}
              onRestartPicks={restartPicks}
            />
          </div>
        )}
      </div>
    </div>
  );
}
