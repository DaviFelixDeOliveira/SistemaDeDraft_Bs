import { useEffect, useState } from 'react';
import { Eye, Send, ShieldAlert } from 'lucide-react';
import { detectFirstPickAnnouncement, allyStartsFromBanner, type DraftVisionBannerColour, type DraftVisionResult } from '../../lib/draftAutoVision';
import { draftAutoGuestService, DraftAutoGuestAccessError, type GuestJoinSession } from '../../services/draftAutoGuestService';

type Props = { imageUrl: string; session: GuestJoinSession; onSessionExpired: () => void };

export function DraftAutoVisionPreview({imageUrl,session,onSessionExpired}: Props) {
  const [result,setResult] = useState<DraftVisionResult | null>(null);
  const [myColour,setMyColour] = useState<DraftVisionBannerColour | null>(null);
  const [busy,setBusy] = useState(false);
  const [sent,setSent] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');

  useEffect(()=>{
    let valid = true;
    setResult(null);setMyColour(null);setSent(false);setError('');setMessage('');
    const img = new Image();
    img.onload = () => {
      if (!valid) return;
      try {
        const scale = Math.min(1,960/img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1,Math.round(img.naturalWidth*scale));
        canvas.height = Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx = canvas.getContext('2d',{willReadFrequently:true});
        if (!ctx) throw Error('O navegador não conseguiu analisar esta imagem.');
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const pixels = ctx.getImageData(0,0,canvas.width,canvas.height);
        if(valid) setResult(detectFirstPickAnnouncement(pixels));
      } catch (cause) {
        if(valid) setError(cause instanceof Error?cause.message:'Falha ao analisar a imagem.');
      }
    };
    img.onerror = () => {if(valid)setError('Falha ao abrir a imagem para a análise visual.');};
    img.src = imageUrl;
    return ()=>{valid=false;img.onload=null;img.onerror=null;};
  },[imageUrl]);

  const begins = allyStartsFromBanner(result?.startingColour ?? null,myColour);
  const send = async () => {
    if (!result || result.kind !== 'first-pick-announcement' || begins === null || busy || sent) return;
    setBusy(true);setError('');setMessage('');
    try {
      await draftAutoGuestService.sendEvent(session,{kind:'first-pick',allyStarts:begins});
      setSent(true);
      setMessage('Ordem do primeiro pick enviada para revisão do coach. Nada foi aplicado sem a confirmação dele.');
    } catch(cause) {
      if (cause instanceof DraftAutoGuestAccessError) onSessionExpired();
      else setError(cause instanceof Error?cause.message:'Não foi possível enviar. Confira sua conexão.');
    } finally {setBusy(false);}
  };

  return <section className="space-y-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 text-left">
    <h4 className="text-sm font-bold flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-400"/> Reconhecimento visual experimental — quem começa</h4>
    <p className="text-xs text-zinc-400">Analisa somente a faixa grande “AZUL COMEÇA” / “VERMELHO COMEÇA” (ou inglês) usando as cores do print. Não interpreta cara ou coroa, bans, picks ou jogadores. Não é uma IA treinada e pode não reconhecer outros formatos.</p>
    {!result && !error && <p role="status" className="text-xs text-zinc-400">Analisando pixels da imagem no próprio dispositivo...</p>}
    {result && <div className="space-y-2">
      <p className={result.kind==='unknown'?'text-xs text-amber-400':'text-xs text-emerald-400'}>{result.explanation}</p>
      {result.kind==='first-pick-announcement' && <>
        <p className="text-xs text-zinc-400">Confirme sua equipe na tela antes de enviar:</p>
        <div className="flex gap-2">
          <button type="button" disabled={sent} onClick={()=>setMyColour('blue')}
            aria-pressed={myColour==='blue'} className={`flex-1 rounded-lg px-2 py-2 text-sm font-bold border ${myColour==='blue'?'border-blue-300 bg-blue-700/50':'border-blue-700 bg-blue-700/10'}`}>Sou azul</button>
          <button type="button" disabled={sent} onClick={()=>setMyColour('red')}
            aria-pressed={myColour==='red'} className={`flex-1 rounded-lg px-2 py-2 text-sm font-bold border ${myColour==='red'?'border-red-300 bg-red-700/50':'border-red-700 bg-red-700/10'}`}>Sou vermelho</button>
        </div>
        {begins!==null && <p className="text-xs text-white">Proposta: <strong>{begins?'Nossa equipe começa':'Inimigo começa'}</strong>. Compare com a imagem antes de enviar.</p>}
        <button type="button" disabled={begins===null || busy || sent}
          onClick={()=>void send()} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 disabled:opacity-40 w-full p-2.5 text-sm font-bold">
          <Send className="w-4 h-4"/>{busy?'Enviando...':sent?'Enviado ao coach':'Confirmar e enviar ao coach'}
        </button>
      </>}
      <details className="text-[11px] text-zinc-500"><summary>Dados da análise local (não representam precisão estatística)</summary>
        Fração vermelha: {Math.round(result.evidence.redShare*100)}% · azul: {Math.round(result.evidence.blueShare*100)}% · referência superior vermelha: {Math.round(result.evidence.baselineRedShare*100)}% · azul: {Math.round(result.evidence.baselineBlueShare*100)}%
      </details>
    </div>}
    <div className="text-[11px] text-zinc-400 flex items-start gap-1.5"><ShieldAlert className="w-3.5 h-3.5 shrink-0"/>Não enviar automaticamente: a confirmação do jogador e a revisão do coach continuam obrigatórias.</div>
    {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
    {message && <p className="text-xs text-emerald-400" role="status">{message}</p>}
  </section>;
}
