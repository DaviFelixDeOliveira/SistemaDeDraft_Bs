import { useEffect, useState } from 'react';
import { RadioTower, RefreshCcw } from 'lucide-react';
import { draftAutoCoachEvents, type DraftAutoRoomEvent } from '../../services/draftAutoGuestService';

function description(event: DraftAutoRoomEvent) {
  switch(event.kind) {
    case 'map': return `Mapa: ${event.map?.name ?? event.map_id ?? '—'}`;
    case 'first-pick': return `Começa: ${event.ally_starts ? 'Nossa equipe' : 'Inimigo'}`;
    case 'ban': return `Ban ${(event.slot??0)+1} (${event.team === 'ally' ? 'nosso' : 'inimigo'}): ${event.brawler?.name ?? event.brawler_id ?? '—'}`;
    case 'pick': return `Pick ${(event.slot??0)+1} (${event.team === 'ally' ? 'nosso' : 'inimigo'}): ${event.brawler?.name ?? event.brawler_id ?? '—'}`;
  }
}
export function DraftAutoRoomEvents({ roomId, onImport }: {roomId: string; onImport: (event: DraftAutoRoomEvent) => void}) {
  const [items, setItems] = useState<DraftAutoRoomEvent[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const data = await draftAutoCoachEvents.list(roomId);
        if (alive) {setItems(data);setError('');}
      } catch {
        if (alive) setError('Falha ao atualizar eventos recebidos.');
      }
    };
    void refresh();
    const handle = setInterval(() => void refresh(), 3000);
    return () => {alive=false;clearInterval(handle);};
  },[roomId]);
  return <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500"><RadioTower className="w-3.5 h-3.5"/> Eventos recebidos ({items.filter(item => item.review_status === 'pending').length} pendentes) <RefreshCcw className="w-3 h-3 opacity-60"/></div>
    {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    <p className="text-[11px] text-zinc-500">Os novos eventos também chegam diretamente à fila do Draft. Apenas o coach pode confirmar ou descartar.</p>
    {items.length===0 ? <p className="text-xs text-zinc-500">Aguardando informações dos jogadores aprovados.</p> :
    <div className="space-y-1 max-h-52 overflow-auto">
      {items.map(item=><div key={item.id} className="rounded-lg p-2 bg-indigo-500/5 border border-indigo-500/10">
        <div className="text-xs font-semibold">{description(item)}</div>
        <div className="text-[11px] text-zinc-500">{item.guest?.display_name ?? 'Jogador'} · {new Date(item.created_at).toLocaleTimeString('pt-BR')}</div>
        {item.review_status === 'pending'
          ? <button type="button" onClick={() => onImport(item)} className="mt-2 text-xs font-semibold text-indigo-500 hover:text-indigo-400 underline">Revisar no Draft</button>
          : <p className="text-[11px] mt-1 text-zinc-500">{item.review_status === 'applied' ? 'Confirmado pelo coach' : 'Descartado pelo coach'}</p>}
      </div>)}
    </div>}
  </div>;
}
