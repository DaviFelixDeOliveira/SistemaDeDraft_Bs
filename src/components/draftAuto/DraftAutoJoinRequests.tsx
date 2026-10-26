import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { draftAutoCoachRequests, type JoinRequest } from '../../services/draftAutoGuestService';

export function DraftAutoJoinRequests({ roomId }: { roomId: string }) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await draftAutoCoachRequests.list(roomId);
        if (active) { setRequests(result); setError(''); }
      } catch { if (active) setError('Falha ao consultar solicitações.'); }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => { active = false; clearInterval(timer); };
  }, [roomId]);
  const decide = async (request: JoinRequest, status: 'approved' | 'rejected') => {
    setBusy(request.id); setError('');
    try {
      await draftAutoCoachRequests.review(roomId, request.id, status);
      setRequests(old => old.map(x => x.id===request.id ? { ...x, status } : x));
    } catch(err) { setError(err instanceof Error ? err.message : 'Não foi possível responder.'); }
    finally { setBusy(null); }
  };
  return <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
    <p className="text-xs font-bold text-zinc-500">Solicitações de jogadores ({requests.filter(r=>r.status==='pending').length} pendentes)</p>
    {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
    {requests.length===0 && <p className="text-xs text-zinc-500">Nenhum jogador solicitou entrada.</p>}
    {requests.map(request=><div key={request.id} className="flex justify-between items-center gap-2 bg-zinc-100 dark:bg-[#090909] rounded-lg p-2">
      <div className="min-w-0"><p className="text-sm font-semibold truncate">{request.display_name}</p>
        <p className="text-[11px] text-zinc-500">{request.status==='pending'?'Aguardando':request.status==='approved'?'Aprovado':'Recusado'}</p></div>
      {request.status==='pending' && Date.parse(request.expires_at)>Date.now() && <div className="flex gap-1">
        <button title="Aprovar entrada" disabled={busy!==null} onClick={()=>void decide(request,'approved')} className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50">{busy===request.id?<Loader2 className="w-4 h-4 animate-spin"/>:<Check className="w-4 h-4"/>}</button>
        <button title="Recusar entrada" disabled={busy!==null} onClick={()=>void decide(request,'rejected')} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-50"><X className="w-4 h-4"/></button>
      </div>}
    </div>)}
  </div>;
}
