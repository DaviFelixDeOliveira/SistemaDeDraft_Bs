import { useEffect, useState } from 'react';
import { Copy, Link2, Loader2, Plus, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { draftAutoRoomService, type DraftAutoRoom } from '../../services/draftAutoRoomService';
import { DraftAutoJoinRequests } from './DraftAutoJoinRequests';
import { DraftAutoRoomEvents } from './DraftAutoRoomEvents';

export function DraftAutoRooms() {
  const [rooms, setRooms] = useState<DraftAutoRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    draftAutoRoomService.list()
      .then(data => { if (active) setRooms(data); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar salas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const refresh = async () => {
    setBusy(true); setError(null); setMessage(null);
    try { setRooms(await draftAutoRoomService.list()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar salas.'); }
    finally { setBusy(false); }
  };

  const create = async () => {
    if (rooms.some(room => room.status === 'active' && Date.parse(room.expires_at) > Date.now())) {
      setError('Encerre a sala ativa antes de criar outra.');
      return;
    }
    setBusy(true); setError(null); setMessage(null);
    try {
      const room = await draftAutoRoomService.create();
      setRooms(previous => [room, ...previous].slice(0, 20));
      setMessage('Sala criada. Compartilhe o link de ingresso com os jogadores.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a sala.');
    } finally { setBusy(false); }
  };

  const close = async (room: DraftAutoRoom) => {
    if (!window.confirm('Encerrar esta sala de treino? O código não poderá mais ser utilizado.')) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      await draftAutoRoomService.close(room.id);
      setRooms(old => old.map(item => item.id === room.id ? { ...item, status: 'closed' } : item));
      setMessage('Sala encerrada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível encerrar a sala.');
    } finally { setBusy(false); }
  };

  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setMessage('Código copiado. O coach ainda precisa aprovar cada jogador.'); }
    catch { setError('Não foi possível copiar automaticamente. Selecione o código e copie manualmente.'); }
  };

  return (
    <section className="max-w-5xl mx-auto space-y-4 mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Link2 className="w-5 h-5 text-indigo-500"/> Salas de treino — coach</h2>
          <p className="text-zinc-500 text-sm mt-1">Primeira etapa: criar, consultar e encerrar salas vinculadas à sua equipe.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy || loading} onClick={refresh} className="flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw className="w-4 h-4"/> Atualizar</button>
          <button type="button" disabled={busy || loading} onClick={create} className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-2 text-sm disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>} Criar sala
          </button>
        </div>
      </div>

      <div className="p-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-zinc-600 dark:text-zinc-300">
        <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0"/>
        <p><strong>Fase experimental.</strong> O código é um identificador público, não uma senha. Ainda não é possível ingressar com o celular nem transmitir capturas. Os jogadores podem solicitar entrada pelo link. Você deverá aprovar cada pedido. O jogador aprovado agora pode enviar eventos de teste manualmente, que aparecem abaixo. A captura automática de tela ainda não foi implementada; nunca compartilhe sua senha da equipe.</p>
      </div>
      {error && <p role="alert" className="p-3 bg-red-500/10 text-red-500 text-sm rounded-lg">{error}</p>}
      {message && <p role="status" className="p-3 bg-emerald-500/10 text-emerald-500 text-sm rounded-lg">{message}</p>}
      {loading ? <p className="text-zinc-500 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Carregando salas...</p> :
        rooms.length === 0 ? <div className="rounded-xl p-5 border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-500">Nenhuma sala criada. Use “Criar sala” quando a migração de segurança estiver habilitada no Supabase.</div> :
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map(room => {
              const active = room.status === 'active' && Date.parse(room.expires_at) > Date.now();
              return <div key={room.id} className="p-4 rounded-xl bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <span className={`text-xs font-semibold ${active ? 'text-emerald-500' : 'text-zinc-500'}`}>{active ? '● Sala ativa' : room.status === 'closed' ? 'Sala encerrada' : 'Sala expirada'}</span>
                  <span className="text-xs text-zinc-500">Até {new Date(room.expires_at).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <code className="text-2xl tracking-widest font-black text-zinc-900 dark:text-white select-text">{room.join_code}</code>
                  <button type="button" onClick={() => void copy(room.join_code)} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800" title="Copiar código"><Copy className="w-4 h-4"/></button>
                </div>
                {active && <div className="space-y-2">
                  <a href={`/?draftJoin=${room.join_code}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 underline">Abrir página de entrada do jogador</a>
                  <button type="button" onClick={() => void copy(`${window.location.origin}/?draftJoin=${room.join_code}`)} className="ml-3 text-xs text-indigo-500 underline">Copiar link</button>
                  <p className="text-[11px] text-zinc-500">Se estiver acessando por localhost, troque o endereço pelo IP do computador na rede para abrir no celular.</p>
                  <DraftAutoJoinRequests roomId={room.id}/>
                  <DraftAutoRoomEvents roomId={room.id}/>
                </div>}
                {room.status === 'active' && <button type="button" disabled={busy} onClick={() => void close(room)} className="flex items-center gap-1 text-xs text-red-500 disabled:opacity-50"><XCircle className="w-3.5 h-3.5"/> Encerrar sala</button>}
              </div>;
            })}
          </div>}
    </section>
  );
}
