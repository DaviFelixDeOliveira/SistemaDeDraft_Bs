import { useEffect, useState, type FormEvent } from 'react';
import { Send, Loader2, Info } from 'lucide-react';
import {
  draftAutoGuestService, DraftAutoGuestAccessError, type GuestJoinSession, type DraftAutoCatalog, type DraftAutoManualEvent,
} from '../../services/draftAutoGuestService';

const control = 'w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-sm';
export function DraftAutoGuestEventTester({ session, onSessionExpired }: { session: GuestJoinSession; onSessionExpired: () => void }) {
  const [catalog, setCatalog] = useState<DraftAutoCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<DraftAutoManualEvent['kind']>('map');
  const [mapId, setMapId] = useState('');
  const [allyStarts, setAllyStarts] = useState(true);
  const [team, setTeam] = useState<'ally'|'enemy'>('ally');
  const [slot, setSlot] = useState(0);
  const [brawlerId, setBrawlerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    draftAutoGuestService.catalog(session)
      .then(data => { if (alive) setCatalog(data); })
      .catch(err => {
        if (!alive) return;
        if (err instanceof DraftAutoGuestAccessError) onSessionExpired();
        else setError(err instanceof Error ? err.message : 'Falha ao carregar catálogo.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [session.requestId, session.token]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    setInfo(''); setError('');
    let event: DraftAutoManualEvent;
    if (kind === 'map') {
      if (!mapId) return setError('Selecione um mapa.');
      event = {kind:'map',mapId};
    } else if (kind === 'first-pick') {
      event = {kind:'first-pick',allyStarts};
    } else {
      if (!brawlerId) return setError('Selecione um brawler.');
      event = {kind,team,slot,brawlerId};
    }
    setBusy(true);
    try {
      await draftAutoGuestService.sendEvent(session,event);
      setInfo('Evento enviado ao coach. Confira a tela de sala no computador.');
    } catch (err) {
      if (err instanceof DraftAutoGuestAccessError) onSessionExpired();
      else setError(err instanceof Error ? err.message : 'Não foi possível enviar o evento.');
    } finally { setBusy(false); }
  };

  return <section className="space-y-3 border-t border-zinc-800 pt-4 text-left">
    <div className="flex gap-2 items-center"><Send className="w-4 h-4 text-indigo-400"/><h3 className="text-sm font-bold">Enviar informação para o coach</h3></div>
    <p className="text-xs text-zinc-400"><Info className="w-3.5 h-3.5 inline mr-1"/>Teste manual de transmissão. <strong>Não captura o Brawl Stars</strong>, não reconhece imagens e não altera o Draft automaticamente.</p>
    {loading ? <p className="text-xs text-zinc-400"><Loader2 className="w-4 h-4 inline animate-spin mr-2"/>Carregando opções...</p> :
      <form className="space-y-3" onSubmit={send}>
        <label className="text-xs block space-y-1">Informação
          <select className={control} value={kind} onChange={e => {setKind(e.target.value as DraftAutoManualEvent['kind']);setSlot(0);}}>
            <option value="map">Mapa</option>
            <option value="first-pick">Quem escolhe primeiro</option>
            <option value="ban">Ban</option>
            <option value="pick">Pick</option>
          </select></label>
        {kind === 'map' ? <label className="text-xs block space-y-1">Mapa
          <select className={control} value={mapId} onChange={e=>setMapId(e.target.value)}>
            <option value="">Selecione...</option>
            {catalog?.maps.map(m=><option value={m.id} key={m.id}>{m.name} — {m.mode}</option>)}
          </select></label> :
        kind === 'first-pick' ? <label className="text-xs block space-y-1">Quem começa
          <select className={control} value={allyStarts?'ally':'enemy'} onChange={e=>setAllyStarts(e.target.value==='ally')}>
            <option value="ally">Nossa equipe</option><option value="enemy">Equipe inimiga</option>
          </select></label> : <>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs block space-y-1">Equipe
              <select className={control} value={team} onChange={e=>setTeam(e.target.value as 'ally'|'enemy')}>
                <option value="ally">Nossa equipe</option><option value="enemy">Inimigo</option>
              </select></label>
            <label className="text-xs block space-y-1">{kind==='ban'?'Ban':'Ordem global do pick'}
              <select className={control} value={Math.min(slot,kind==='ban'?2:5)} onChange={e=>setSlot(Number(e.target.value))}>
                {Array.from({length:kind==='ban'?3:6},(_,i)=><option value={i} key={i}>{i+1}</option>)}
              </select></label>
          </div>
          <label className="text-xs block space-y-1">Brawler
            <select className={control} value={brawlerId} onChange={e=>setBrawlerId(e.target.value)}>
              <option value="">Selecione...</option>
              {catalog?.brawlers.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}
            </select></label>
        </>}
        <button type="submit" disabled={busy||!catalog} className="w-full rounded-lg p-3 font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50">{busy?'Enviando...':'Enviar para o coach'}</button>
      </form>}
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-2 text-xs text-red-400">{error}</p>}
    {info && <p role="status" className="rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-400">{info}</p>}
  </section>;
}
