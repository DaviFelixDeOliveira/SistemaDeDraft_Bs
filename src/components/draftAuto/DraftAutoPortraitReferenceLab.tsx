import { useEffect,useState } from 'react';
import { Fingerprint,Trash2 } from 'lucide-react';
import { draftHudPixelRect,type DraftHudRegion } from '../../lib/draftAutoLayout';
import {
  portraitFingerprint,matchDraftPortrait,
  type DraftPortraitFingerprint,type DraftPortraitReference,
} from '../../lib/draftAutoPortraitIdentity';

type Example=DraftPortraitReference&{slotId:string};
type PortraitBySlot=Record<string,DraftPortraitFingerprint>;

function load(src:string):Promise<HTMLImageElement>{
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Não foi possível abrir um dos prints.'));
    img.src=src;
  });
}

function descriptors(image:HTMLImageElement,regions:DraftHudRegion[]):PortraitBySlot {
  const found:PortraitBySlot={};
  for(const region of regions){
    if(region.kind!=='pick-slot')continue;
    const rect=draftHudPixelRect(region,image.naturalWidth,image.naturalHeight);
    const canvas=document.createElement('canvas');
    canvas.width=64;canvas.height=80;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    if(!context)throw new Error('Este navegador não permite analisar os retratos.');
    context.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,64,80);
    const fingerprint=portraitFingerprint(context.getImageData(0,0,64,80));
    if(fingerprint)found[region.id]=fingerprint;
  }
  return found;
}

/**
 * Human-labeled reference experiment, scoped to the screenshot comparison.
 * No persistent labels, no catalog ID lookup and no confirmation or game event.
 */
export function DraftAutoPortraitReferenceLab({
  firstUrl,secondUrl,regions,
}:{firstUrl:string;secondUrl:string;regions:DraftHudRegion[]}) {
  const [referencePixels,setReferencePixels]=useState<PortraitBySlot>({});
  const [candidatePixels,setCandidatePixels]=useState<PortraitBySlot>({});
  const [examples,setExamples]=useState<Example[]>([]);
  const [selectedSlot,setSelectedSlot]=useState('blue-1');
  const [name,setName]=useState('');
  const [error,setError]=useState('');

  useEffect(()=>{
    setExamples([]);
    let live=true;
    (async()=>{
      const [first,second]=await Promise.all([load(firstUrl),load(secondUrl)]);
      if(!live)return;
      setReferencePixels(descriptors(first,regions));
      setCandidatePixels(descriptors(second,regions));
      setError('');
    })().catch(reason=>{
      if(live){setReferencePixels({});setCandidatePixels({});
        setError(reason instanceof Error?reason.message:'Falha ao preparar referências.');}
    });
    return()=>{live=false;};
  },[firstUrl,regions]);

  // On swapping the target screenshot, keep the references from the first
  // screenshot but regenerate the target signatures.
  useEffect(()=>{
    let live=true;
    setCandidatePixels({});
    load(secondUrl).then(img=>{
      if(live)setCandidatePixels(descriptors(img,regions));
    }).catch(reason=>{
      if(live)setError(reason instanceof Error?reason.message:'Falha ao comparar a segunda captura.');
    });
    return()=>{live=false;};
  },[secondUrl,regions]);

  const slots=regions.filter(r=>r.kind==='pick-slot');
  const savedLabels=[...new Set(examples.map(e=>e.label.toLocaleLowerCase('pt-BR')))];
  const add=()=>{
    const label=name.trim().slice(0,48);
    if(label.length<2){setError('Digite o nome do personagem visível no slot escolhido.');return;}
    const fingerprint=referencePixels[selectedSlot];
    if(!fingerprint){setError('Esta carta ainda não está disponível para criar uma referência.');return;}
    setExamples(previous=>[...previous.filter(r=>r.slotId!==selectedSlot),
      {label,slotId:selectedSlot,fingerprint}]);
    setName('');setError('');
  };

  return <section className="mt-4 space-y-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
    <h4 className="flex items-center gap-2 text-sm font-bold text-white">
      <Fingerprint className="h-4 w-4 text-indigo-300"/>
      Reconhecimento por exemplos — laboratório local
    </h4>
    <p className="text-xs text-zinc-400">
      Para experimentar a identificação, <strong>você informa o nome</strong> de pelo menos
      dois brawlers visíveis na <strong>primeira imagem</strong>.
      O sistema compara a aparência das cartas da segunda imagem com esses exemplos.
      Não possui ainda as 108 referências oficiais e pode não reconhecer skins diferentes.
    </p>
    <div className="space-y-2">
      <label className="block text-xs text-zinc-300">Carta da primeira captura</label>
      <select className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm"
        value={selectedSlot} onChange={e=>setSelectedSlot(e.target.value)}>
        {slots.map(region=><option key={region.id} value={region.id}>{region.label}</option>)}
      </select>
      <label className="block text-xs text-zinc-300">Nome que você reconheceu visualmente</label>
      <input className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm"
        value={name} maxLength={48} onChange={e=>setName(e.target.value)}
        placeholder="Ex.: Griff (não escolha slots vazios)"/>
      <button type="button" onClick={add}
        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
        Adicionar referência manual
      </button>
    </div>
    {examples.length>0&&<div className="space-y-1">
      <p className="text-xs text-zinc-300">
        Referências temporárias: {examples.length} carta(s), {savedLabels.length} nome(s) diferente(s)
      </p>
      {examples.map(ref=><div key={ref.slotId} className="flex justify-between gap-2 text-xs text-zinc-400">
        <span>{slots.find(r=>r.id===ref.slotId)?.label??ref.slotId}: {ref.label}</span>
        <button type="button" aria-label={`Excluir referência de ${ref.label}`} title="Excluir referência"
          onClick={()=>setExamples(previous=>previous.filter(e=>e.slotId!==ref.slotId))}
          className="text-zinc-400 hover:text-red-300">
          <Trash2 className="h-3.5 w-3.5"/>
        </button>
      </div>)}
    </div>}
    {error&&<p role="alert" className="text-xs text-red-400">{error}</p>}
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-200">Possíveis correspondências na segunda imagem</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map(region=>{
          const result=candidatePixels[region.id]
            ?matchDraftPortrait(candidatePixels[region.id],examples):null;
          return <div key={region.id} className="rounded-lg border border-zinc-700 bg-zinc-950/60 p-2 text-xs">
            <strong>{region.label}</strong>
            {result?.status==='similar-example'
              ?<p className="mt-1 text-emerald-300">
                Parecido com o exemplo: {result.label}
                <span className="block text-[11px] text-zinc-400">Semelhança {Math.round(result.similarity*100)}% — não é identificação confirmada</span>
              </p>
              :<p className="mt-1 text-zinc-400">
                {result?.status==='insufficient-references'
                  ?'Cadastre dois brawlers diferentes'
                  :'Sem correspondência segura'}
              </p>}
          </div>;
        })}
      </div>
    </div>
    <p className="text-[11px] text-amber-300">
      Mesmo uma imagem parecida pode representar outro brawler, uma skin ou um slot vazio.
      Não há preenchimento de picks, bans ou eventos. As referências são descartadas ao
      trocar a primeira captura ou fechar o laboratório.
    </p>
  </section>;
}
