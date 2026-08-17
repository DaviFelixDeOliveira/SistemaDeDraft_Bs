import React from "react";
import { useState, useEffect, useCallback, useRef } from 'react';
import { StepMapAndBans } from './StepMapAndBans';
import { StepPicks } from './StepPicks';
import { StepPostMatch } from './StepPostMatch';
import { RotateCcw, Trash2, Check } from 'lucide-react';
import { TrainingSessionManager } from './TrainingSessionManager';
import { DraftTacticsBanner } from './DraftTacticsBanner';
import { ConfirmModal } from '../ui/ConfirmModal';

export interface DraftState {
  mapId: string;

  tbkStarts: boolean;
  tbkBans: (string | null)[]; // 3 slots
  enemyBans: (string | null)[]; // 3 slots
  picks: { brawlerId: string; team: 'tbk' | 'enemy' }[]; // Up to 6 picks
  playerAssignments: Record<string, string>; // brawlerId -> playerId
}

const initialDraftState: DraftState = {
  mapId: '',
  tbkStarts: true,
  tbkBans: [null, null, null],
  enemyBans: [null, null, null],
  picks: [],
  playerAssignments: {},
};

const DRAFT_STATE_KEY = 'tbk_hub_draft_state';
const DRAFT_STEP_KEY = 'tbk_hub_draft_step';
const DRAFT_HISTORY_KEY = 'tbk_hub_draft_history';

export function DraftWizard() {
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
  
  const [draftHistory, setDraftHistory] = useState<{state: DraftState, step: 1|2|3}[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  
  const latestDraftState = useRef(draftState);
  useEffect(() => {
    latestDraftState.current = draftState;
  }, [draftState]);

  // Track state changes to push to history
  const setDraftStateWithHistory = useCallback((value: React.SetStateAction<DraftState>) => {
    const prev = latestDraftState.current;
    const nextState = typeof value === 'function' ? (value as Function)(prev) : value;
    
    if (JSON.stringify(prev) !== JSON.stringify(nextState)) {
      setDraftHistory(h => {
        const newHistory = [...h, { state: prev, step }];
        localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
        return newHistory;
      });
      window.history.pushState({ isDraftUndo: true }, '');
      setDraftState(nextState);
    }
  }, [step]);

  
  // Custom undo action

  const performUndo = useCallback(() => {
    setDraftHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      
      const newHistory = [...prevHistory];
      const last = newHistory.pop();
      if (last) {
        setDraftState(last.state);
        setStep(last.step);
        localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
      }
      return newHistory;
    });
  }, []);

  // Custom undo action triggered by UI or Ctrl+Z
  const handleUndo = useCallback(() => {
    setDraftHistory(prevHistory => {
      if (prevHistory.length > 0) {
        // Trigger browser back, which will fire popstate and call performUndo
        window.history.back();
      }
      return prevHistory;
    });
  }, []);

  // Sync with mobile back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.isDraftUndo) {
        // This is theoretically not possible because if they pop, the state is gone.
        // Actually, if they press back, the current state becomes the PREVIOUS state.
        // So we just pop our draft history.
      }
      performUndo();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleUndo]);

  // Global Ctrl+Z listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        // Prevent default only if we have something to undo (and not typing in an input unless we want to override it)
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return; // Allow native undo in inputs
        }
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);


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
          const newHistory = [...h, { state: draftState, step }];
          localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
          window.history.pushState({ isDraftUndo: true }, '');
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
        const newHistory = [...h, { state: draftState, step }];
        localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
          window.history.pushState({ isDraftUndo: true }, '');
          return newHistory;
      });
      setStep((s) => (s - 1) as 1 | 2 | 3);
    }
  };

  // Item 4: Limpar campos do draft de uma só vez
  const resetDraft = () => {
    setDraftHistory(h => {
      const newHistory = [...h, { state: draftState, step }];
      localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
          window.history.pushState({ isDraftUndo: true }, '');
          return newHistory;
    });
    setDraftState({
      mapId: '',
      tbkStarts: true,
      tbkBans: [null, null, null],
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

  const totalSteps = 3;
  const progressPercentage = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-0">
      
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
                    ? 'text-[#FF3366] font-bold'
                    : step > s.id
                    ? 'text-emerald-500 dark:text-emerald-400 font-semibold'
                    : 'text-slate-400 dark:text-zinc-500 font-medium'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex flex-shrink-0 items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step === s.id
                      ? 'bg-[#FF3366] text-white shadow-md shadow-[#FF3366]/20'
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
              draftState.tbkBans.some(Boolean) ||
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
            <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-[#FF3366] border-r-fuchsia-500 border-b-violet-500 animate-spin" />
            <div className="mt-4 font-bold text-slate-700 dark:text-zinc-300 animate-pulse text-sm uppercase tracking-widest">
              Processando IA...
            </div>
          </div>
        )}

        <DraftTacticsBanner 
          mapId={draftState.mapId} 
          tbkStarts={draftState.tbkStarts} 
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
