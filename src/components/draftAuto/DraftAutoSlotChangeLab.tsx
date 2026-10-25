import { useEffect,useRef,useState } from 'react';
import { ArrowLeftRight,ImagePlus } from 'lucide-react';
import { draftHudPixelRect,type DraftHudRegion } from '../../lib/draftAutoLayout';
import { compareDraftSlotCrops,type DraftSlotDifference } from '../../lib/draftAutoSlotChange';
import { validateDraftFrame } from '../../lib/draftAutoFrame';
import { inspectSlotMarker } from '../../lib/draftAutoVisualEvidence';
import {
  describeDraftSlotTemporalEvidence, draftTemporalHintLabel,
  type DraftSlotTemporalEvidence,
} from '../../lib/draftAutoSlotTemporal';

type SlotResult={region:DraftHudRegion;diff:DraftSlotDifference;temporal:DraftSlotTemporalEvidence};
type ComparisonSummary={
  results:SlotResult[];
  changed:number;
  warning:string|null;
};

function loadImage(src:string):Promise<HTMLImageElement>{
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Não foi possível abrir uma das imagens.'));
    img.src=src;
  });
}

/**
 * Two independent local screenshots of the same game phase.
 * No event is created even if many slots change: colour animations, skins,
 * overlays, a different match or a shifted crop can look like a real pick.
 */
export function DraftAutoSlotChangeLab({
  imageUrl,regions,
}:{imageUrl:string;regions:DraftHudRegion[]}) {
  const [secondUrl,setSecondUrl]=useState<string|null>(null);
  const secondRef=useRef<string|null>(null);
  const [summary,setSummary]=useState<ComparisonSummary|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>()=>{
    if(secondRef.current)URL.revokeObjectURL(secondRef.current);
  },[]);
  // A different base screenshot invalidates the comparison altogether.
  useEffect(()=>{
    if(secondRef.current)URL.revokeObjectURL(secondRef.current);
    secondRef.current=null;
    setSecondUrl(null);
    setSummary(null);
    setError('');
  },[imageUrl]);

  function selectNext(file:File) {
    const invalid=validateDraftFrame(file.type,file.size);
    if(invalid){setError(invalid);return;}
    const url=URL.createObjectURL(file);
    if(secondRef.current)URL.revokeObjectURL(secondRef.current);
    secondRef.current=url;
    setSecondUrl(url);
    setSummary(null);
    setError('');
  }

  useEffect(()=>{
    if(!secondUrl||regions.length===0)return;
    let live=true;
    setBusy(true);
    setSummary(null);
    (async()=>{
      const [first,second]=await Promise.all([loadImage(imageUrl),loadImage(secondUrl)]);
      if(!live)return;
      if(first.naturalWidth<400||first.naturalHeight<300||
        second.naturalWidth<400||second.naturalHeight<300||
        first.naturalWidth*first.naturalHeight>24_000_000||
        second.naturalWidth*second.naturalHeight>24_000_000) {
        throw new Error('Uma das imagens tem dimensões incompatíveis.');
      }
      const ratio1=first.naturalWidth/first.naturalHeight;
      const ratio2=second.naturalWidth/second.naturalHeight;
      if(Math.abs(ratio1/ratio2-1)>.035){
        throw new Error('As imagens têm proporções diferentes. Use duas capturas da mesma tela e orientação.');
      }
      const results:SlotResult[]=[];
      for(const region of regions){
        if(region.kind!=='pick-slot')continue;
        const crop=(image:HTMLImageElement,targetWidth:number,targetHeight:number)=>{
          const {x,y,width,height}=draftHudPixelRect(region,image.naturalWidth,image.naturalHeight);
          const canvas=document.createElement('canvas');
          canvas.width=targetWidth;canvas.height=targetHeight;
          const ctx=canvas.getContext('2d',{willReadFrequently:true});
          if(!ctx)throw new Error('Este navegador não conseguiu ler os pixels.');
          ctx.drawImage(image,x,y,width,height,0,0,canvas.width,canvas.height);
          return ctx.getImageData(0,0,canvas.width,canvas.height);
        };
        const initial=crop(first,64,80);
        const subsequent=crop(second,64,80);
        const result=compareDraftSlotCrops(initial,subsequent);
        if(!result)continue;
        // The marker heuristic needs a larger crop to resolve a check or
        // no-entry shape. The portrait comparison intentionally excludes it.
        const beforeMarker=inspectSlotMarker(crop(first,160,200));
        const afterMarker=inspectSlotMarker(crop(second,160,200));
        const temporal=describeDraftSlotTemporalEvidence(result,beforeMarker,afterMarker);
        results.push({region,diff:result,temporal});
      }
      const changed=results.filter(r=>r.diff.visualChangeCandidate).length;
      if(live)setSummary({
        results,changed,
        warning:changed>=4
          ?'Muitos slots mudaram. Pode ser outra partida, animação, mudança de layout ou várias escolhas. Não é possível determinar a ordem.'
          :null,
      });
    })().catch(cause=>{
      if(live)setError(cause instanceof Error?cause.message:'Erro ao comparar as imagens.');
    }).finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;};
  },[imageUrl,secondUrl,regions]);

  return <section className="mt-4 space-y-3 rounded-xl border border-zinc-700 bg-zinc-950/40 p-3">
    <h4 className="flex items-center gap-2 text-sm font-bold text-white">
      <ArrowLeftRight className="h-4 w-4 text-indigo-400"/> Comparar duas capturas — alteração de slots
    </h4>
    <p className="text-xs text-zinc-400">
      A captura já aberta será o <strong>antes</strong>. Selecione um segundo print da
      <strong> mesma partida, fase e orientação</strong> para ver quais retratos mudaram.
      Comparamos separadamente o <strong>retrato</strong> e os possíveis <strong>ícones de confirmação</strong>.
      A análise é experimental, não reconhece o personagem nem confirma um pick ou ban. Nada é transmitido.
    </p>
    <label className="block cursor-pointer rounded-lg border border-dashed border-indigo-500/50 p-3 text-center text-xs text-indigo-300 hover:bg-indigo-500/10">
      <span className="flex items-center justify-center gap-2"><ImagePlus className="h-4 w-4"/>Selecionar segunda captura</span>
      <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp"
        onChange={e=>{const file=e.currentTarget.files?.[0];if(file)selectNext(file);e.currentTarget.value='';}}/>
    </label>
    {secondUrl&&<img src={secondUrl} alt="Segunda captura comparada apenas no navegador"
      className="mx-auto max-h-40 max-w-full rounded-lg border border-zinc-700 object-contain"/>}
    {busy&&<p role="status" className="text-xs text-zinc-400">Comparando as áreas dos seis jogadores…</p>}
    {error&&<p role="alert" className="text-xs text-red-400">{error}</p>}
    {summary&&<div className="space-y-2">
      <p className="text-sm font-semibold text-zinc-200">
        {summary.changed} de 6 slots com alteração visual relevante
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {summary.results.map(({region,diff,temporal})=><div key={region.id}
          className={`rounded-lg border p-2 text-xs ${diff.visualChangeCandidate?
            'border-amber-500/50 bg-amber-500/10 text-amber-200':
            'border-zinc-700 bg-zinc-900/60 text-zinc-300'}`}>
          <strong>{region.label}</strong>
          <p className="mt-1">{diff.visualChangeCandidate?'Mudança possível':'Sem mudança relevante'}</p>
          <p className="mt-1 opacity-70">{Math.round(diff.changedFraction*100)}% de pixels diferentes</p>
          {temporal.hint!=='no-visual-change'&&temporal.hint!=='portrait-change-only'&&
            <p className="mt-2 border-t border-current/20 pt-1">{draftTemporalHintLabel(temporal)}</p>}
        </div>)}
      </div>
      {summary.warning&&<p className="text-xs text-amber-300">{summary.warning}</p>}
      <p className="text-[11px] text-zinc-400">
        Resultado experimental baseado em diferenças de cor dentro de cada retrato. Uma animação,
        tela desalinhada ou outro jogador mudando a pré-seleção pode gerar alerta;
        ausência de alerta também não garante ausência de pick. O detector de ícones ainda depende
        de recortes exatos e pode errar. <strong>Nenhuma transição é uma escolha confirmada</strong>
        e nada será aplicado ao Draft.
      </p>
    </div>}
  </section>;
}
