import { useEffect, useState } from 'react';
import { AlertTriangle, FlaskConical, RotateCcw, ScanEye, ShieldCheck } from 'lucide-react';
import { brawlerService } from '../../services/brawlerService';
import { mapService } from '../../services/mapService';
import type { Brawler, GameMap } from '../../types';
import {
  applyDraftAutoObservation, emptyDraftAutoSnapshot, expectedPickingTeam,
  type DraftAutoObservation, type DraftAutoSource, type DraftAutoTeam
} from '../../lib/draftAutoProtocol';

type Kind = 'map' | 'first-pick' | 'ban' | 'pick';
const baseField = 'w-full bg-white dark:bg-[#0A0A0A] border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm';
const labelClass = 'block mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400';

export function DraftAutoLab() {
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const [state, setState] = useState(emptyDraftAutoSnapshot);
  const [kind, setKind] = useState<Kind>('map');
  const [source, setSource] = useState<DraftAutoSource>('screen');
  const [confidence, setConfidence] = useState(0.96);
  const [team, setTeam] = useState<DraftAutoTeam>('ally');
  const [slot, setSlot] = useState(0);
  const [mapId, setMapId] = useState('');
  const [brawlerId, setBrawlerId] = useState('');
  const [allyStarts, setAllyStarts] = useState(true);
  const [messages, setMessages] = useState<{status:string;reason:string}[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([mapService.getMaps(), brawlerService.getBrawlers()])
      .then(([m, b]) => { if (active) { setMaps(m); setBrawlers(b); } })
      .catch(() => { if (active) setLoadError('Não foi possível carregar o catálogo de mapas e personagens.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const name = (id: string | null) => brawlers.find(b => b.id === id)?.name ?? (id ?? '—');
  const mapName = (id: string | null) => maps.find(m => m.id === id)?.name ?? (id ?? '—');

  function simulate() {
    const base = { eventId: crypto.randomUUID(), source, confidence };
    let observation: DraftAutoObservation;
    if (kind === 'map') observation = { ...base, kind: 'map', mapId };
    else if (kind === 'first-pick') observation = { ...base, kind: 'first-pick', allyStarts };
    else if (kind === 'ban') observation = { ...base, kind: 'ban', team, slot, brawlerId };
    else observation = { ...base, kind: 'pick', team, slot, brawlerId };
    const outcome = applyDraftAutoObservation(state, observation);
    setState(outcome.state);
    setMessages(old => [{ status: outcome.status, reason: outcome.reason }, ...old].slice(0, 8));
  }

  const bans = (list: (string | null)[], title: string) => (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">{title}</h4>
      <div className="grid grid-cols-3 gap-2">
        {list.map((id, i) => <div key={i} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] text-zinc-500">Ban {i+1}</div><div className="text-xs font-medium truncate">{name(id)}</div>
        </div>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><FlaskConical className="text-indigo-500"/> Draft Automático — laboratório</h2>
        <p className="text-zinc-500 text-sm mt-2">Primeira etapa experimental: validar como o sistema recebe e confere informações do draft.</p>
      </div>
      <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 flex gap-3 items-start">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500"/>
        <p className="text-sm text-zinc-600 dark:text-zinc-300"><strong>Simulação local, não sincronizada.</strong> Ainda não cria código de sala, transmite imagens, reconhece personagens nem captura o jogo. A opção “Captura de tela” abaixo simula um evento que poderá vir do aplicativo futuramente. Nenhum dado é gravado no Supabase.</p>
      </div>
      {loadError && <p className="text-red-500 text-sm">{loadError}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 space-y-4">
          <h3 className="font-bold flex items-center gap-2"><ScanEye className="w-5 h-5 text-indigo-500"/> Simular observação</h3>
          <div>
            <label className={labelClass}>Informação recebida</label>
            <select className={baseField} value={kind} onChange={e=>{setKind(e.target.value as Kind);setSlot(0);}}>
              <option value="map">Mapa</option><option value="first-pick">Quem começa</option>
              <option value="ban">Ban</option><option value="pick">Pick</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Origem simulada</label>
              <select className={baseField} value={source} onChange={e=>setSource(e.target.value as DraftAutoSource)}>
                <option value="screen">Captura de tela</option><option value="manual">Correção manual</option>
                <option value="provider">API autorizada</option>
              </select></div>
            <div><label className={labelClass}>Confiança simulada</label>
              <select className={baseField} value={confidence} onChange={e=>setConfidence(Number(e.target.value))}>
                <option value="0.6">60% · incerta</option><option value="0.96">96% · alta</option><option value="0.99">99% · alta</option>
              </select></div>
          </div>
          {kind==='map' ? <div><label className={labelClass}>Mapa reconhecido (simulado)</label>
            <select className={baseField} value={mapId} onChange={e=>setMapId(e.target.value)}>
              <option value="">Selecione o mapa</option>
              {maps.map(m=><option value={m.id} key={m.id}>{m.name} — {m.mode}</option>)}
            </select></div>
            : kind==='first-pick' ? <div><label className={labelClass}>Quem começa</label>
              <select className={baseField} value={allyStarts?'ally':'enemy'} onChange={e=>setAllyStarts(e.target.value==='ally')}>
                <option value="ally">Nossa equipe</option><option value="enemy">Inimigo</option>
              </select></div>
              : <>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Equipe</label><select className={baseField} value={team} onChange={e=>setTeam(e.target.value as DraftAutoTeam)}>
                    <option value="ally">Nossa equipe</option><option value="enemy">Inimigo</option>
                  </select></div>
                  <div><label className={labelClass}>{kind==='ban'?'Slot do ban':'Ordem geral do pick'}</label>
                    <select className={baseField} value={Math.min(slot,kind==='ban'?2:5)} onChange={e=>setSlot(Number(e.target.value))}>
                      {Array.from({length:kind==='ban'?3:6},(_,i)=><option key={i} value={i}>{i+1}</option>)}
                    </select></div>
                </div>
                <div><label className={labelClass}>Brawler</label><select className={baseField} value={brawlerId} onChange={e=>setBrawlerId(e.target.value)}>
                  <option value="">Selecione um brawler</option>
                  {brawlers.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}
                </select></div>
              </>}
          <button type="button" onClick={simulate} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg">Enviar evento simulado</button>
          <div>
            <label className={labelClass}>Imagem de exemplo (visualização local, sem análise)</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" className="block w-full text-xs" onChange={e=>{
              const file=e.target.files?.[0];
              if(file && file.size<=5*1024*1024 && file.type.startsWith('image/'))setPreviewUrl(URL.createObjectURL(file));
              else if(file)setMessages(old=>[{status:'review',reason:'A imagem precisa ter no máximo 5 MB e ser PNG, JPEG ou WebP.'},...old]);
              e.target.value='';
            }}/>
            {previewUrl && <img className="mt-3 max-h-52 rounded-lg border border-zinc-200 dark:border-zinc-800 object-contain" src={previewUrl} alt="Prévia local da captura selecionada"/>}
          </div>
        </section>
        <section className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex justify-between items-center gap-2">
            <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="text-emerald-500 w-5 h-5"/> Estado confirmado</h3>
            <button type="button" className="text-xs flex gap-1 items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 px-2 py-1.5" onClick={() => {setState(emptyDraftAutoSnapshot());setMessages([]);}}><RotateCcw className="w-3 h-3"/> Reiniciar</button>
          </div>
          <div className="rounded-lg bg-zinc-100 dark:bg-[#0A0A0A] p-3 text-sm space-y-1">
            <p><span className="text-zinc-500">Mapa:</span> {mapName(state.mapId)}</p>
            <p><span className="text-zinc-500">Começa:</span> {state.allyStarts===null?'—':state.allyStarts?'Nossa equipe':'Inimigo'}</p>
          </div>
          {bans(state.allyBans,'Nossos bans')}
          {bans(state.enemyBans,'Bans inimigos')}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Picks na ordem do draft</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {state.picks.map((p,i)=><div key={i} className="rounded-lg p-2 border border-zinc-200 dark:border-zinc-800">
                <div className="text-[10px] text-zinc-500">Pick {i+1} · {p?.team==='ally'?'Nossa equipe':p?.team==='enemy'?'Inimigo':state.allyStarts!==null?(expectedPickingTeam(state.allyStarts,i)==='ally'?'Nossa equipe':'Inimigo'):'—'}</div>
                <div className="text-xs font-semibold truncate">{name(p?.brawlerId??null)}</div>
              </div>)}
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold">Resultado das observações</h4>
            {!messages.length&&<p className="text-xs text-zinc-500">Sem eventos ainda.</p>}
            {messages.map((m,i)=><p key={i} className={`text-xs rounded-lg p-2 ${m.status==='applied'?'bg-emerald-500/10':m.status==='review'?'bg-amber-500/10':'bg-zinc-500/10'}`}>
              {m.status==='applied'?'✓ Aplicado':m.status==='review'?'⚠ Revisão necessária':'Já registrado'} — {m.reason}
            </p>)}
          </div>
        </section>
      </div>
    </div>
  );
}
