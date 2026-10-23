import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LockKeyhole, Swords, Users, ArrowRight } from 'lucide-react';
import { normalizeTeamUsername, teamAuthService, type TeamAccount } from '../services/teamAuthService';

type Mode = 'login' | 'register';

interface TeamAuthScreenProps {
  onAuthenticated: (team: TeamAccount) => void;
}

export function TeamAuthScreen({ onAuthenticated }: TeamAuthScreenProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const slug = normalizeTeamUsername(name);
  const isRegister = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (isRegister && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      const team = isRegister
        ? await teamAuthService.register(name, password)
        : await teamAuthService.login(name, password);
      onAuthenticated(team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível autenticar.');
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <main className="min-h-screen bg-[#080810] text-zinc-100 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-20 top-10 w-[360px] h-[360px] bg-indigo-600/10 rounded-full blur-[110px]" />
        <div className="absolute -right-12 bottom-10 w-[360px] h-[360px] bg-cyan-400/10 rounded-full blur-[110px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-indigo-600 rounded-2xl p-3 shadow-lg shadow-indigo-500/15">
            <Swords className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">Sistema <span className="text-cyan-300">de Draft</span></h1>
            <p className="text-zinc-500 text-xs">Brawl Stars · Gestão competitiva por equipe</p>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#11111C] p-6 sm:p-8 shadow-2xl">
          <div className="flex gap-2 bg-[#090912] rounded-xl p-1 mb-7" role="tablist" aria-label="Acesso das equipes">
            <button type="button" role="tab" aria-selected={!isRegister} onClick={() => changeMode('login')}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${!isRegister ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
              Entrar
            </button>
            <button type="button" role="tab" aria-selected={isRegister} onClick={() => changeMode('register')}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${isRegister ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
              Criar equipe
            </button>
          </div>
          <h2 className="text-xl font-bold mb-1">{isRegister ? 'Crie sua equipe' : 'Bem-vindo de volta'}</h2>
          <p className="text-sm text-zinc-400 mb-6">
            {isRegister ? 'Comece a registrar drafts e estatísticas da sua equipe.' : 'Acesse os drafts e o histórico da sua equipe.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="team-name" className="block text-sm font-medium mb-2">Nome da equipe</label>
              <div className="relative">
                <Users aria-hidden="true" className="absolute top-3.5 left-3.5 w-4 h-4 text-zinc-500" />
                <input id="team-name" value={name} autoComplete="username" required maxLength={60}
                  onChange={(e) => setName(e.target.value)} placeholder="Ex.: Fênix Esports"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-3 py-3 outline-none focus:border-indigo-400 text-sm" />
              </div>
              {isRegister && slug && (
                <p className="mt-2 text-xs text-zinc-400">Seu identificador: <strong className="text-cyan-300">{slug}</strong></p>
              )}
            </div>

            <div>
              <label htmlFor="team-password" className="block text-sm font-medium mb-2">Senha</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="absolute top-3.5 left-3.5 w-4 h-4 text-zinc-500" />
                <input id="team-password" type={showPassword ? 'text' : 'password'}
                  value={password} autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required minLength={isRegister ? 12 : undefined} maxLength={128}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-11 py-3 outline-none focus:border-indigo-400 text-sm" />
                <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-2.5 right-2.5 rounded-lg p-1.5 text-zinc-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isRegister && <p className="text-xs text-zinc-500 mt-1.5">Use pelo menos 12 caracteres.</p>}
            </div>

            {isRegister && (
              <div>
                <label htmlFor="team-confirm-password" className="block text-sm font-medium mb-2">Confirmar senha</label>
                <input id="team-confirm-password" type="password" required
                  value={confirmPassword} autoComplete="new-password"
                  onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-3 outline-none focus:border-indigo-400 text-sm" />
              </div>
            )}

            {isRegister && (
              <p className="text-xs text-amber-300/90 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                Ainda não há recuperação automática de senha. Guarde-a com segurança e não compartilhe com pessoas de fora da equipe.
              </p>
            )}
            {error && <p role="alert" className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{error}</p>}

            <button type="submit" disabled={busy || !name.trim() || !password}
              className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 font-bold transition-colors">
              {busy ? 'Aguarde...' : isRegister ? 'Criar equipe' : 'Entrar'} {!busy && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </section>
        <p className="text-center text-xs text-zinc-600 mt-6">Cada equipe possui dados independentes.</p>
      </div>
    </main>
  );
}
