import { useState, useEffect } from 'react';
import { StepMapAndBans } from './StepMapAndBans';
import { StepPicks } from './StepPicks';
import { StepPostMatch } from './StepPostMatch';
import { RotateCcw, Trash2 } from 'lucide-react';

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
        setStep((s) => (s + 1) as 1 | 2 | 3);
        setIsLoading(false);
      }, 800);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  // Item 4: Limpar campos do draft de uma só vez
  const resetDraft = () => {
    setDraftState(initialDraftState);
    setStep(1);
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
      {/* Steps Header & Reset Button */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-8 bg-white dark:bg-[#121212] p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-[#2A2A2A] shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 overflow-x-auto flex-1">
            {[
              { id: 1, label: 'Mapa & Bans' },
              { id: 2, label: 'Draft' },
              { id: 3, label: 'Resultado' },
            ].map((s) => (
              <div
                key={s.id}
                className={`flex flex-1 sm:flex-none items-center justify-center sm:justify-start min-w-[120px] gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  step === s.id
                    ? 'bg-[#FF3366]/10 sm:bg-[#FF3366]/20 text-[#FF3366] font-medium'
                    : step > s.id
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-zinc-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex flex-shrink-0 items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step === s.id
                      ? 'bg-[#FF3366] text-white'
                      : step > s.id
                      ? 'bg-emerald-500/10 sm:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  {s.id}
                </div>
                <span className="text-sm sm:text-base whitespace-nowrap">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Item 4: Botão de Limpar Draft */}
          <button
            type="button"
            onClick={() => {
              if (
                draftState.mapId ||
                draftState.picks.length > 0 ||
                draftState.tbkBans.some(Boolean)
              ) {
                if (window.confirm('Tem certeza que deseja limpar todos os campos do draft?')) {
                  resetDraft();
                }
              } else {
                resetDraft();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-red-500/20"
            title="Limpar todos os campos e reiniciar draft"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpar Draft</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-[#1A1A1A] rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-[#FF3366] rounded-full transition-all duration-700 ease-in-out relative"
            style={{ width: `${progressPercentage}%` }}
          >
            {progressPercentage > 0 && progressPercentage < 100 && (
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/50 blur-[2px] rounded-full animate-pulse" />
            )}
          </div>
        </div>
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

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
            <StepMapAndBans
              draftState={draftState}
              setDraftState={setDraftState}
              onNext={handleNextStep}
            />
          </div>
        )}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-forwards">
            <StepPicks
              draftState={draftState}
              setDraftState={setDraftState}
              onNext={handleNextStep}
              onPrev={handlePrevStep}
            />
          </div>
        )}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500 fill-mode-forwards">
            <StepPostMatch
              draftState={draftState}
              setDraftState={setDraftState}
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
