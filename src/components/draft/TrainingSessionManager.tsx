import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock, CalendarDays } from 'lucide-react';
import { sessionService, TrainingSession } from '../../services/sessionService';
import { analyticsService } from '../../services/analyticsService';
import { cn } from '../../lib/utils';

/**
 * Interpreta um timestamp do Supabase (que vem sem fuso) como UTC.
 * Se a string já terminar em "Z" ou tiver offset, não faz nada.
 */
function parseUtcTimestamp(ts: string): Date {
  if (!ts) return new Date();
  // Se já tem "Z" ou offset ("+03:00", "-03:00"), o Date() interpreta certo
  if (/[Zz]$/.test(ts) || /[+-]\d{2}:\d{2}$/.test(ts)) {
    return new Date(ts);
  }
  // Caso contrário, é timestamp "sem fuso" do Supabase → forçar UTC
  return new Date(ts + 'Z');
}

export function TrainingSessionManager() {
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [progress, setProgress] = useState(0);

  // Ref para impedir duplo disparo do startSession/endSession
  const isProcessingRef = useRef(false);

  // Inicializa com Supabase e escuta mudanças em tempo real
  useEffect(() => {
    sessionService.fetchActiveSession().then(setActiveSession);

    const subscription = sessionService.subscribeToSessions(() => {
      sessionService.fetchActiveSession().then(setActiveSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      const updateTimer = () => {
        const start = parseUtcTimestamp(activeSession.start_date).getTime();
        const now = Date.now();
        const diff = Math.max(0, now - start);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };
      updateTimer(); // Atualiza imediatamente (sem delay de 1s no primeiro render)
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStart = () => {
    if (isStarting || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsStarting(true);
    setProgress(0);

    let animDone = false;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (!animDone) {
            animDone = true;
            clearInterval(interval);
            // Executa a criação da sessão uma única vez
            (async () => {
              try {
                const session = await sessionService.startSession();
                setActiveSession(session);
              } catch (e: any) {
                alert(e.message);
              } finally {
                setIsStarting(false);
                isProcessingRef.current = false;
              }
            })();
          }
          return 100;
        }
        return p + 5;
      });
    }, 50);
  };

  const handleEnd = () => {
    if (!activeSession || isEnding || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsEnding(true);
    setProgress(0);

    let animDone = false;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          if (!animDone) {
            animDone = true;
            clearInterval(interval);
            (async () => {
              try {
                // Verifica se existem partidas vinculadas a esta sessão
                const matches = await analyticsService.getAllMatches();
                const sessionMatches = matches.filter(m => {
                  if (m.session_id) return m.session_id === activeSession.id;
                  const start = parseUtcTimestamp(activeSession.start_date).getTime();
                  const now = Date.now();
                  const matchTime = new Date(m.match_date).getTime();
                  return matchTime >= start && matchTime <= now;
                });

                if (sessionMatches.length === 0) {
                  await sessionService.deleteSession(activeSession.id);
                } else {
                  await sessionService.endSession(activeSession.id);
                }
              } catch (e: any) {
                console.error('Erro ao encerrar treino:', e);
              } finally {
                setActiveSession(null);
                setIsConfirmingEnd(false);
                setIsEnding(false);
                isProcessingRef.current = false;
              }
            })();
          }
          return 100;
        }
        return p + 5;
      });
    }, 50);
  };

  if (!activeSession) {
    return (
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            Sessão de Treino (Scrims)
          </h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Inicie um treino para agrupar partidas no histórico.</p>
        </div>

        {isStarting ? (
          <div className="w-full sm:w-48 bg-zinc-100 dark:bg-[#1A1A1A] h-10 rounded-lg relative overflow-hidden flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
            <div
              className="absolute left-0 top-0 bottom-0 bg-indigo-500 transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
            <span className="relative z-10 text-xs font-bold text-zinc-900 dark:text-white mix-blend-difference">
              Iniciando...
            </span>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={isProcessingRef.current}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current" />
            Iniciar Treino
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/20 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />

      <div className="relative z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center animate-pulse">
          <Clock className="w-6 h-6 text-indigo-500" />
        </div>
        <div>
          <h3 className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
            Treino em Andamento
          </h3>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-300 font-mono mt-0.5 tracking-wider">
            {elapsedTime}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center gap-3 w-full sm:w-auto">
        {isEnding ? (
          <div className="w-full sm:w-48 bg-red-500/10 h-10 rounded-lg relative overflow-hidden flex items-center justify-center border border-red-500/20">
            <div
              className="absolute left-0 top-0 bottom-0 bg-red-500 transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
            <span className="relative z-10 text-xs font-bold text-zinc-900 dark:text-white mix-blend-difference">
              Encerrando...
            </span>
          </div>
        ) : isConfirmingEnd ? (
          <>
            <button
              onClick={() => setIsConfirmingEnd(false)}
              className="flex-1 sm:flex-none bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEnd}
              disabled={isProcessingRef.current}
              className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Encerrar Agora
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsConfirmingEnd(true)}
            className="flex-1 sm:flex-none bg-white dark:bg-zinc-800 text-red-500 hover:text-white hover:bg-red-500 border border-red-200 dark:border-red-900/50 px-6 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-sm group"
          >
            <Square className="w-4 h-4 fill-current transition-colors" />
            Encerrar Treino
          </button>
        )}
      </div>
    </div>
  );
}
