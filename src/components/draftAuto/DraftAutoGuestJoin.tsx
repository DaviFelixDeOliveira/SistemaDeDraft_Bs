import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from 'lucide-react';
import { draftAutoGuestService, type GuestJoinSession } from '../../services/draftAutoGuestService';
import { isDraftAutoRoomCode } from '../../lib/draftAutoRoomCode';
import { DraftAutoGuestEventTester } from './DraftAutoGuestEventTester';
import { DraftAutoCaptureLab } from './DraftAutoCaptureLab';
import { restoreDraftGuestSession } from '../../lib/draftAutoSession';

const STORAGE = 'draft_auto_guest_session';
function restored(code: string): GuestJoinSession | null {
  return restoreDraftGuestSession(sessionStorage.getItem(STORAGE), code);
}
export function DraftAutoGuestJoin({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode.trim().toUpperCase());
  const [name, setName] = useState('');
  const [session, setSession] = useState<GuestJoinSession | null>(() => restored(initialCode.trim().toUpperCase()));
  const [busy, setBusy] = useState(false);
  // An approved session restored from storage must be rechecked before enabling sends.
  const [verifying, setVerifying] = useState(() => restored(initialCode.trim().toUpperCase())?.status === 'approved');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session || (session.status !== 'pending' && session.status !== 'approved')) return;
    let active = true;
    const check = async () => {
      try {
        const status = await draftAutoGuestService.status(session);
        if (!active) return;
        setError('');
        setVerifying(false);
        setSession(current => {
          if (!current || current.requestId !== session.requestId) return current;
          const next = { ...current, status };
          sessionStorage.setItem(STORAGE, JSON.stringify(next));
          return next;
        });
      } catch {
        if (active) setError('Não foi possível verificar a sessão. Verifique sua conexão; tentaremos novamente.');
      }
    };
    void check();
    const timer = setInterval(() => void check(), 4000);
    return () => { active = false; clearInterval(timer); };
  }, [session?.requestId, session?.status]);

  const enter = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!isDraftAutoRoomCode(code)) return setError('O código deve conter oito letras ou números válidos.');
    if (name.trim().length < 2 || name.trim().length > 40) return setError('Informe seu nome (2 a 40 caracteres).');
    setBusy(true);
    try {
      const joined = await draftAutoGuestService.request(code, name.trim());
      sessionStorage.setItem(STORAGE, JSON.stringify(joined));
      setVerifying(false);
      setSession(joined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível solicitar entrada.');
    } finally { setBusy(false); }
  };
  const markExpired = () => {
    setVerifying(false);
    setSession(current => {
      if (!current) return current;
      const next: GuestJoinSession = { ...current, status: 'expired' };
      sessionStorage.setItem(STORAGE, JSON.stringify(next));
      return next;
    });
    setError('');
  };
  const leave = () => { sessionStorage.removeItem(STORAGE); setSession(null); setError(''); setVerifying(false); };
  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-zinc-950 text-white">
      <main className="w-full max-w-md rounded-2xl p-6 sm:p-8 border border-zinc-800 bg-[#121212] space-y-5">
        <div className="flex gap-3 items-center"><ShieldCheck className="w-8 h-8 text-indigo-400"/>
          <div><h1 className="font-black text-xl">Entrar no Draft Automático</h1>
            <p className="text-zinc-500 text-sm">Modo Treino · Jogador</p></div></div>
        {!session ?
          <form onSubmit={enter} className="space-y-4">
            <p className="text-sm text-zinc-400">O coach fornecerá o código da sessão. Você não precisa da senha da equipe.</p>
            <label className="block space-y-1 text-sm">Código da sala
              <input required autoCapitalize="characters" maxLength={8} className="w-full uppercase tracking-widest bg-zinc-950 border border-zinc-700 rounded-xl p-3" value={code} onChange={e=>setCode(e.target.value.trim().toUpperCase())} placeholder="ABCDEFGH"/></label>
            <label className="block space-y-1 text-sm">Seu nome
              <input required minLength={2} maxLength={40} className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3" value={name} onChange={e=>setName(e.target.value)} placeholder="Como o coach vai identificar você?"/></label>
            <button disabled={busy} type="submit" className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 p-3 font-bold disabled:opacity-50">{busy ? 'Enviando...' : 'Solicitar entrada'}</button>
          </form> :
          <div className="space-y-4 text-center">
            {session.status==='pending' || (session.status==='approved' && verifying) ? <Clock3 className="w-12 h-12 text-amber-400 mx-auto"/>:
              session.status==='approved'?<CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto"/>:
              <XCircle className="w-12 h-12 text-red-400 mx-auto"/>}
            <h2 className="font-bold text-lg">{session.status==='pending'?'Aguardando aprovação do coach':
              session.status==='approved' && verifying ? 'Verificando sua conexão...':
              session.status==='approved'?'Entrada aprovada!':
              session.status==='expired'?'Solicitação expirada':'Entrada recusada'}</h2>
            <p className="text-zinc-400 text-sm">{session.status==='pending'?'Seu pedido já foi enviado. Esta página verifica automaticamente a resposta.':
              session.status==='approved' && verifying ? 'Confirmando com o servidor se a sala continua aberta e sua autorização ainda é válida.':
              session.status==='approved'?'Conexão validada! Envie eventos de teste ou experimente a nova área de capturas locais. O reconhecimento automático ainda não está disponível.':
              session.status==='expired' ? 'Sua autorização terminou ou a sala foi encerrada. Solicite nova entrada; caso a sala tenha expirado, peça um novo código ao coach.' : 'Peça ao coach uma nova sessão se necessário.'}</p>
            {session.status==='approved' && !verifying && <>
              <DraftAutoCaptureLab session={session} onSessionExpired={markExpired} />
              <details className="rounded-xl border border-zinc-800 p-3 text-left">
                <summary className="cursor-pointer text-sm font-semibold text-zinc-300">
                  Teste manual: enviar mapa, pick ou ban ao coach
                </summary>
                <DraftAutoGuestEventTester session={session} onSessionExpired={markExpired} />
              </details>
            </>}
            <button type="button" onClick={leave} className="text-indigo-400 text-sm underline">{session.status==='expired' || session.status==='rejected' ? 'Solicitar nova entrada' : 'Sair e voltar ao formulário'}</button>
          </div>}
        {error && <p role="alert" className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-lg text-xs">{error}</p>}
        <p className="text-zinc-500 text-xs">Não compartilhe a senha da equipe. Capturas locais só começam após sua permissão explícita e, nesta etapa, não são enviadas ao coach.</p>
      </main>
    </div>
  );
}
