import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Swords, ShieldAlert, Lock, Timer, UserCheck } from 'lucide-react';
import { cn } from '../lib/utils';

// ================================================================
// CÓDIGOS DE ACESSO DO SISTEMA
// ================================================================
export const ACCESS_CODE_ADMIN = '240807';
export const ACCESS_CODE_PLAYER = '180703';
// ================================================================

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;
const SESSION_KEY = 'tbk_hub_session';
const ROLE_KEY = 'tbk_hub_role';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

export type UserRole = 'admin' | 'player';

interface LockScreenProps {
  onAuthenticated: (role: UserRole) => void;
}

export function LockScreen({ onAuthenticated }: LockScreenProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Foca o input ao montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    };
  }, []);

  const startLockout = useCallback(() => {
    setIsLockedOut(true);
    setLockoutSeconds(LOCKOUT_SECONDS);

    lockoutTimerRef.current = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(lockoutTimerRef.current!);
          setIsLockedOut(false);
          setAttempts(0);
          setError('');
          setTimeout(() => inputRef.current?.focus(), 50);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
  }, []);

  const handleAuthenticate = useCallback((role: UserRole) => {
    localStorage.setItem(SESSION_KEY, String(Date.now()));
    localStorage.setItem(ROLE_KEY, role);
    onAuthenticated(role);
  }, [onAuthenticated]);

  const handleSubmit = useCallback(() => {
    if (isLockedOut || isLoading || !code.trim()) return;

    setIsLoading(true);

    setTimeout(() => {
      if (code === ACCESS_CODE_ADMIN) {
        handleAuthenticate('admin');
      } else if (code === ACCESS_CODE_PLAYER) {
        handleAuthenticate('player');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setCode('');
        triggerShake();
        setIsLoading(false);

        if (newAttempts >= MAX_ATTEMPTS) {
          setError('');
          startLockout();
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(
            `Código de acesso inválido. Tente novamente.${
              remaining === 1 ? ' (Última tentativa antes do bloqueio)' : ''
            }`
          );
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }
    }, 400);
  }, [code, attempts, isLockedOut, isLoading, handleAuthenticate, startLockout, triggerShake]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF3366]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#FFCC00]/3 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#FF3366 1px, transparent 1px), linear-gradient(90deg, #FF3366 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="bg-[#111111] rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center border-b border-white/[0.05]">
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="w-16 h-16 bg-[#FF3366] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,51,102,0.35)]">
                  <Swords className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#111111] rounded-full flex items-center justify-center border border-white/10">
                  <Lock className="w-3 h-3 text-zinc-400" />
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              TBK <span className="text-[#FFCC00]">Hub</span>
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              Insira a senha de Administrador (não público) ou Player (não público)
            </p>
          </div>

          <div className="px-8 py-7 space-y-4">
            <div className={cn('relative', isShaking && 'animate-shake')}>
              <input
                ref={inputRef}
                id="access-code-input"
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="••••"
                maxLength={32}
                disabled={isLockedOut || isLoading}
                autoComplete="current-password"
                className={cn(
                  'w-full bg-black/50 border rounded-xl px-4 py-3.5 text-white text-center text-xl tracking-[0.5em] placeholder:tracking-normal placeholder:text-zinc-600 placeholder:text-sm focus:outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                  error
                    ? 'border-red-500/60 focus:border-red-500'
                    : 'border-white/10 focus:border-white/30'
                )}
              />
            </div>

            {error && !isLockedOut && (
              <div
                id="error-message"
                className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm leading-snug">{error}</p>
              </div>
            )}

            {isLockedOut && (
              <div
                id="lockout-message"
                className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <Timer className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-amber-400 text-sm">
                  Muitas tentativas erradas. Aguarde{' '}
                  <span className="font-bold tabular-nums">{lockoutSeconds}s</span>
                </p>
              </div>
            )}

            <button
              id="access-btn"
              onClick={handleSubmit}
              disabled={isLockedOut || isLoading || !code.trim()}
              className={cn(
                'w-full font-bold rounded-xl px-4 py-3.5 transition-all duration-200 flex items-center justify-center gap-2',
                isLockedOut || !code.trim()
                  ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                  : isLoading
                  ? 'bg-white/10 text-white/50 cursor-wait border border-white/10'
                  : 'bg-white hover:bg-[#FF3366] text-black hover:text-white cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(255,51,102,0.3)]'
              )}
            >
              {isLoading ? 'Verificando...' : 'Entrar'}
            </button>

            <div className="pt-2 border-t border-white/[0.05] text-center">
              <button
                type="button"
                onClick={() => handleAuthenticate('player')}
                className="text-xs text-zinc-400 hover:text-white underline flex items-center justify-center gap-1.5 mx-auto py-1"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#FFCC00]" />
                Entrar direto como Jogador (Modo Visualização)
              </button>
            </div>
          </div>

          <div className="px-8 pb-6 text-center">
            <p className="text-zinc-600 text-xs">
              Admin: <strong>não público</strong> &bull; Player: <strong>não público</strong>
            </p>
          </div>
        </div>

        {attempts > 0 && !isLockedOut && (
          <div className="mt-4 flex justify-center gap-1.5">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  i < attempts ? 'bg-red-500' : 'bg-white/10'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function hasActiveSession(): boolean {
  const ts = localStorage.getItem(SESSION_KEY);
  if (!ts) return false;
  const loginTime = Number(ts);
  if (isNaN(loginTime)) {
    localStorage.removeItem(SESSION_KEY);
    return false;
  }
  if (Date.now() - loginTime > SESSION_DURATION_MS) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ROLE_KEY);
    return false;
  }
  return true;
}

export function getUserRole(): UserRole {
  const role = localStorage.getItem(ROLE_KEY);
  return role === 'player' ? 'player' : 'admin';
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ROLE_KEY);
}
