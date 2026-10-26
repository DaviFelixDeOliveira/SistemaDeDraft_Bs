import { useEffect, useRef, useState } from 'react';
import { ScanEye } from 'lucide-react';
import { inspectSlotMarker, type SlotMarkerEvidence } from '../../lib/draftAutoVisualEvidence';
import { validateDraftFrame } from '../../lib/draftAutoFrame';

/**
 * Diagnostic only. Intentionally cannot call sendEvent: marker colours alone
 * cannot identify a brawler, team, slot, phase or confirmed game decision.
 */
export function DraftAutoVisualMarkerLab() {
  const [preview,setPreview]=useState<string | null>(null);
  const [result,setResult]=useState<SlotMarkerEvidence | null>(null);
  const [error,setError]=useState('');
  const previewRef=useRef<string | null>(null);

  useEffect(()=>()=>{if(previewRef.current) URL.revokeObjectURL(previewRef.current);},[]);

  const inspect = async (file: File) => {
    setError('');
    setResult(null);
    const invalid=validateDraftFrame(file.type,file.size);
    if(invalid){setError(invalid);return;}
    const url=URL.createObjectURL(file);
    const image=new Image();
    try {
      const pixels=await new Promise<ImageData>((resolve,reject)=>{
        image.onload=()=>{
          try {
            if(image.naturalWidth<64 || image.naturalHeight<64 ||
               image.naturalWidth*image.naturalHeight>24_000_000) {
              reject(new Error('O recorte deve ter ao menos 64 pixels por lado e no máximo 24 MP.'));
              return;
            }
            const canvas=document.createElement('canvas');
            canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
            const context=canvas.getContext('2d',{willReadFrequently:true});
            if(!context)throw new Error('Não foi possível processar o recorte.');
            context.drawImage(image,0,0);
            resolve(context.getImageData(0,0,canvas.width,canvas.height));
          } catch(e) {reject(e);}
        };
        image.onerror=()=>reject(new Error('Imagem incompatível.'));
        image.src=url;
      });
      if(previewRef.current)URL.revokeObjectURL(previewRef.current);
      previewRef.current=url;
      setPreview(url);
      setResult(inspectSlotMarker(pixels));
    } catch(e) {
      URL.revokeObjectURL(url);
      setError(e instanceof Error?e.message:'Não foi possível analisar o recorte.');
    }
  };

  return <section className="mt-5 space-y-3 rounded-xl border border-zinc-700 bg-zinc-900/60 p-3">
    <h4 className="font-bold text-sm flex items-center gap-2">
      <ScanEye className="h-4 w-4 text-indigo-400"/>
      Laboratório de ícones confirmados — teste isolado
    </h4>
    <p className="text-xs text-zinc-400">
      Escolha uma imagem recortada de <strong>um único slot inferior</strong> de ban ou pick.
      É um teste das cores dos ícones: não encontra slots no print inteiro, não
      reconhece brawlers e não envia eventos ao coach.
    </p>
    <label className="block cursor-pointer text-center rounded-lg border border-dashed border-indigo-500/50 p-3 text-xs text-indigo-300">
      Selecionar recorte de um slot
      <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp"
        onChange={event=>{
          const file=event.currentTarget.files?.[0];
          if(file)void inspect(file);
          event.currentTarget.value='';
        }}/>
    </label>
    {preview&&<img src={preview} alt="Recorte individual de slot analisado localmente"
      className="max-h-52 max-w-full object-contain mx-auto rounded border border-zinc-700 bg-black"/>}
    {result&&<div className={`text-xs rounded-lg p-3 ${result.status==='candidate'
      ?'bg-amber-500/10 text-amber-300':'bg-zinc-800 text-zinc-300'}`}>
      {result.status==='candidate'
        ?`Possível ícone de ${result.marker==='ban'?'BAN confirmado':'PICK confirmado'} detectado. Isso NÃO comprova a escolha nem identifica o brawler.`
        : result.reason}
      <p className="mt-2 opacity-70">Evidência de cor no canto do slot: vermelho {Math.round(result.redShare*100)}% · verde {Math.round(result.greenShare*100)}%.</p>
    </div>}
    {error&&<p role="alert" className="text-xs text-red-400">{error}</p>}
  </section>;
}
