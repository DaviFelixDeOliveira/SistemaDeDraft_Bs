import { useEffect,useMemo,useRef,useState } from 'react';
import { BookImage,RefreshCw } from 'lucide-react';
import { inspectDraftEmptySlot, type DraftEmptySlotEvidence } from '../../lib/draftAutoEmptySlot';
import { corroborateDraftEmptyCards } from '../../lib/draftAutoEmptyReference';
import { draftHudPixelRect,type DraftHudRegion } from '../../lib/draftAutoLayout';
import {
  parseDraftCatalog,matchDraftCatalogPortrait,diagnoseDraftCatalogLabel,
  type DraftCatalogReference,
} from '../../lib/draftAutoCatalogVisual';
import {
  portraitFingerprint,type DraftPortraitFingerprint,
} from '../../lib/draftAutoPortraitIdentity';

type SlotFingerprint={
  portrait:DraftPortraitFingerprint;
  emptyEvidence:DraftEmptySlotEvidence;
  preview:string;
};
type SlotFingerprints=Record<string,SlotFingerprint>;
type LoadingState='idle'|'loading'|'ready'|'failed';

function loadScreenshot(src:string):Promise<HTMLImageElement>{
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('Não foi possível abrir a segunda captura.'));
    image.src=src;
  });
}

function getSlotFingerprints(image:HTMLImageElement,regions:DraftHudRegion[]):SlotFingerprints{
  const found:SlotFingerprints={};
  for(const region of regions){
    if(region.kind!=='pick-slot')continue;
    const rect=draftHudPixelRect(region,image.naturalWidth,image.naturalHeight);
    const canvas=document.createElement('canvas');
    canvas.width=64;canvas.height=80;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw new Error('Leitura de pixels indisponível neste navegador.');
    ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,64,80);
    const pixels=ctx.getImageData(0,0,64,80);
    const fp=portraitFingerprint(pixels);
    if(fp)found[region.id]={
      portrait:fp,
      emptyEvidence:inspectDraftEmptySlot(pixels),
      preview:canvas.toDataURL('image/png'),
    };
  }
  return found;
}

/** Cross-origin images MUST opt in to CORS before assigning src. */
function imageWithCors(url:string,signal:AbortSignal):Promise<HTMLImageElement>{
  return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(new Error('Cancelado'));return;}
    const image=new Image();
    image.crossOrigin='anonymous';
    image.decoding='async';
    const cleanup=()=>{
      image.onload=null;
      image.onerror=null;
      signal.removeEventListener('abort',abort);
    };
    const abort=()=>{cleanup();image.src='';reject(new Error('Cancelado'));};
    image.onload=()=>{cleanup();resolve(image);};
    image.onerror=()=>{cleanup();reject(new Error('Imagem indisponível ou CORS não autorizado'));};
    signal.addEventListener('abort',abort,{once:true});
    image.src=url;
  });
}

/** Public bordered/borderless artwork is NOT guaranteed to match the in-game slot. */
function imageFingerprint(image:HTMLImageElement):DraftPortraitFingerprint|null{
  const canvas=document.createElement('canvas');
  canvas.width=64;canvas.height=80;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)return null;
  ctx.fillStyle='#151526';
  ctx.fillRect(0,0,64,80);
  const scale=Math.max(64/image.naturalWidth,80/image.naturalHeight);
  const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
  ctx.drawImage(image,(64-w)/2,(80-h)/2,w,h);
  // A non-CORS CDN image throws SecurityError here. The caller skips it.
  return portraitFingerprint(ctx.getImageData(0,0,64,80));
}

/**
 * Guest-only experimental image comparison to the public catalog.
 * No image uploads, no team/private data, no draft events, no saved matches.
 * Does not require manually typing names in each training session.
 */
export function DraftAutoCatalogRecognitionLab({
  screenshotUrl,regions,
}:{screenshotUrl:string;regions:DraftHudRegion[]}) {
  const [targets,setTargets]=useState<SlotFingerprints>({});
  const [references,setReferences]=useState<DraftCatalogReference[]>([]);
  const [phase,setPhase]=useState<LoadingState>('idle');
  const [total,setTotal]=useState(0);
  const [processed,setProcessed]=useState(0);
  const [failedImages,setFailedImages]=useState(0);
  const [error,setError]=useState('');
  const [diagnosticSlot,setDiagnosticSlot]=useState('blue-2');
  const [diagnosticKnownId,setDiagnosticKnownId]=useState('');
  const controllerRef=useRef<AbortController|null>(null);

  useEffect(()=>()=>{
    controllerRef.current?.abort();
  },[]);

  useEffect(()=>{
    let live=true;
    setDiagnosticKnownId('');
    setTargets({});
    loadScreenshot(screenshotUrl).then(image=>{
      if(live)setTargets(getSlotFingerprints(image,regions));
    }).catch(reason=>{
      if(live)setError(reason instanceof Error?reason.message:'Não foi possível comparar esta imagem.');
    });
    return()=>{live=false;};
  },[screenshotUrl,regions]);

  const loadCatalog=async()=>{
    controllerRef.current?.abort();
    const controller=new AbortController();
    controllerRef.current=controller;
    const {signal}=controller;
    setPhase('loading');setProcessed(0);setFailedImages(0);
    setReferences([]);setTotal(0);setError('');
    try{
      // Public metadata, not team-private Supabase data and not game draft data.
      const response=await fetch('https://api.brawlapi.com/v1/brawlers',{
        headers:{Accept:'application/json'},
        signal,
      });
      if(!response.ok)throw new Error('Catálogo público indisponível.');
      const catalog=parseDraftCatalog(await response.json());
      if(signal.aborted)return;
      setTotal(catalog.length);
      const collected:DraftCatalogReference[]=[];
      let next=0,complete=0,failures=0;
      const worker=async()=>{
        while(!signal.aborted){
          const index=next++;
          if(index>=catalog.length)return;
          const entry=catalog[index];
          try {
            const image=await imageWithCors(entry.imageUrl,signal);
            if(signal.aborted)return;
            const fingerprint=imageFingerprint(image);
            if(fingerprint)collected.push({...entry,fingerprint});
            else failures++;
          }catch{
            if(signal.aborted)return;
            failures++;
          }
          complete++;
          if(!signal.aborted) {
            setProcessed(complete);setFailedImages(failures);
          }
        }
      };
      await Promise.all(Array.from({length:Math.min(6,catalog.length)},()=>worker()));
      if(signal.aborted)return;
      setReferences(collected);
      if(collected.length<2)throw new Error(
        'O navegador não conseguiu ler imagens suficientes da CDN. Verifique a conexão e o suporte a CORS.'
      );
      setPhase('ready');
    }catch(reason){
      if(signal.aborted)return;
      setPhase('failed');
      setError(reason instanceof Error?reason.message:'Falha ao carregar catálogo.');
    }
  };

  const slots=useMemo(()=>regions.filter(r=>r.kind==='pick-slot'),[regions]);
  const emptyDecisions=useMemo(()=>corroborateDraftEmptyCards(targets),[targets]);
  const results=useMemo(()=>slots.map(region=>{
    const target=targets[region.id];
    const emptyState=emptyDecisions[region.id]??'unknown';
    return {
      region,emptyState,
      match:target&&emptyState==='unknown'
        ?matchDraftCatalogPortrait(target.portrait,references)
        :null,
    };
  }),[slots,targets,references,emptyDecisions]);
  const diagnosedSlot=results.find(r=>r.region.id===diagnosticSlot);
  const diagnosedTarget=targets[diagnosticSlot];
  const humanDiagnostic=useMemo(()=>diagnosticKnownId&&diagnosedTarget
    ?diagnoseDraftCatalogLabel(diagnosedTarget.portrait,references,Number(diagnosticKnownId))
    :null,[diagnosticKnownId,diagnosedTarget,references]);
  const alphabeticalReferences=useMemo(()=>[...references].sort((a,b)=>
    a.name.localeCompare(b.name,'pt-BR')),[references]);

  return <section className="mt-4 space-y-3 rounded-xl border border-cyan-600/40 bg-cyan-500/5 p-3">
    <h4 className="flex items-center gap-2 text-sm font-bold text-white">
      <BookImage className="h-4 w-4 text-cyan-300"/>
      Identificação pelo catálogo — sem cadastrar nomes
    </h4>
    <p className="text-xs text-zinc-300">
      Teste opcional: carrega automaticamente imagens dos brawlers publicados na BrawlAPI
      e tenta comparar com os seis retratos desta captura. <strong>Você não precisa
      digitar os nomes.</strong>
    </p>
    <p className="text-xs text-amber-300">
      As imagens do catálogo podem ser diferentes das cartas do jogo, inclusive por skins.
      Um resultado parecido NÃO é uma escolha confirmada. Quando não houver evidência forte,
      o sistema deve dizer que não sabe. Os slots vazios agora podem ser comparados com
      dois exemplos encontrados na mesma imagem. Isso continua sendo uma hipótese visual.
    </p>
    <button type="button" disabled={phase==='loading'} onClick={()=>void loadCatalog()}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 p-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-cyan-600">
      <RefreshCw className={`h-4 w-4 ${phase==='loading'?'animate-spin':''}`}/>
      {phase==='loading'?'Lendo catálogo visual…':references.length?'Recarregar catálogo':'Carregar catálogo visual'}
    </button>
    {phase==='loading'&&<p role="status" className="text-xs text-zinc-300">
      Imagens processadas: {processed} de {total||'…'}. Falhas de leitura: {failedImages}.
    </p>}
    {phase==='ready'&&<p role="status" className="text-xs text-emerald-300">
      {references.length} brawlers com imagens utilizáveis; {failedImages} imagens indisponíveis.
    </p>}
    {error&&<p role="alert" className="text-xs text-red-300">{error}</p>}
    {phase==='ready'&&<div className="space-y-2">
      <p className="text-xs font-bold text-zinc-200">Hipóteses visuais — segunda imagem</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {results.map(({region,match,emptyState})=><div key={region.id}
          className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-950/70 p-2 text-xs">
          <strong>{region.label}</strong>
          {emptyState!=='unknown'
            ?<p className="mt-1 text-amber-200">
              Provavelmente vazio
              <span className="block text-[10px] text-zinc-400">
                {emptyState==='similar-to-empty'
                  ?'Semelhante a dois outros slots vazios desta imagem.'
                  :'Indício pelo padrão roxo da carta.'} Não confirmado.
              </span>
            </p>
            :match?.status==='possible-match'
            ?<p className="mt-1 break-words text-emerald-300">
              Possivelmente {match.name}
              <span className="block text-[10px] text-zinc-400">
                Semelhança visual {Math.round(match.similarity*100)}%, não é probabilidade de acerto.
              </span>
            </p>
            :<p className="mt-1 text-zinc-400">Sem identificação segura</p>}
          {emptyState==='unknown'&&match?.status==='uncertain'&&match.nearest[0]&&
            <details className="mt-2 text-[10px] text-zinc-500">
              <summary className="cursor-pointer">Ver palpite fraco (diagnóstico)</summary>
              <p className="mt-1 break-words">
                Imagem mais parecida: {match.nearest[0].name}
                {' '}({Math.round(match.nearest[0].similarity*100)}% de semelhança).
                Pode ser outro brawler ou um slot vazio.
              </p>
            </details>}
        </div>)}
      </div>
      <details className="rounded-lg border border-zinc-700/80 p-2 text-xs text-zinc-300">
        <summary className="cursor-pointer font-medium">
          Investigar um nome errado no catálogo (diagnóstico opcional)
        </summary>
        <p className="mt-2 text-[11px] text-amber-300">
          O catálogo usa artes que podem não corresponder às skins do jogo. Uma
          semelhança de 82% NÃO significa 82% de acerto. Informe manualmente
          o personagem verdadeiro apenas para medir seu lugar no ranking;
          isso não treina o detector nem altera o Draft.
        </p>
        <div className="mt-3 grid gap-2">
          <label className="space-y-1">
            <span className="block text-[11px] font-semibold">Slot da imagem</span>
            <select value={diagnosticSlot} onChange={e=>{
              setDiagnosticSlot(e.target.value);
              setDiagnosticKnownId('');
            }} className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2">
              {slots.map(region=><option key={region.id} value={region.id}>{region.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] font-semibold">
              Nome verdadeiro (informado por você, não detectado)
            </span>
            <select value={diagnosticKnownId} onChange={e=>setDiagnosticKnownId(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2">
              <option value="">Escolher brawler, se souber</option>
              {alphabeticalReferences.map(ref=><option key={ref.id} value={String(ref.id)}>
                {ref.name}
              </option>)}
            </select>
          </label>
        </div>
        {humanDiagnostic&&<p className="mt-2 rounded-md border border-cyan-800 bg-cyan-950/30 p-2 text-[11px]">
          O brawler informado ficou em <strong>{humanDiagnostic.rank}º de {humanDiagnostic.total}</strong>
          {' '}retratos do catálogo, com {Math.round(humanDiagnostic.similarity*100)}% de semelhança RGB.
          {' '}O primeiro colocado foi {humanDiagnostic.bestName}
          {humanDiagnostic.scoreGap>0
            ?` (${Math.round(humanDiagnostic.scoreGap*100)} pontos percentuais acima)`
            :''}. Isso mede o comparador, não a chance de identificação correta.
        </p>}
        {diagnosticKnownId&&!humanDiagnostic&&<p className="mt-2 text-[11px] text-zinc-400">
          Não foi possível comparar essa referência com a imagem atual.
        </p>}
        <p className="mt-3 text-[11px] font-semibold">
          Três artes públicas mais parecidas com {diagnosedSlot?.region.label??'o slot'}
        </p>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {diagnosedSlot?.match?.nearest.map((candidate,index)=>{
            const source=references.find(r=>r.id===candidate.gameId);
            return <div key={candidate.gameId}
              className="min-w-0 rounded-md border border-zinc-700 bg-zinc-950 p-1">
              {source&&<img src={source.imageUrl} alt={`Arte do catálogo: ${candidate.name}`}
                loading="lazy" className="mx-auto h-16 w-14 object-contain" />}
              <p className="break-words text-[10px]">{index+1}º: {candidate.name}</p>
              <p className="text-[10px] text-zinc-400">
                {Math.round(candidate.similarity*100)}% semelhante
              </p>
            </div>;
          })}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          Estes são os retratos que o sistema está comparando, não três
          identificações. A anotação manual é descartada ao trocar a imagem
          ou sair desta tela. Nada é transmitido.
        </p>
      </details>
      <details className="rounded-lg border border-zinc-700/80 p-2 text-xs text-zinc-300">
        <summary className="cursor-pointer font-medium">
          Conferir os seis recortes e o motivo dos resultados
        </summary>
        <p className="mt-2 text-[11px] text-amber-300">
          Se uma carta está vazia no jogo mas a miniatura não mostra o ponto de
          interrogação inteiro, confira a posição das caixas no localizador acima.
          Nomes de jogador e bordas não devem dominar o recorte.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map(region=>{
            const target=targets[region.id];
            return <div key={region.id}
              className="min-w-0 space-y-1 rounded-lg border border-zinc-700 p-1.5">
              <p className="font-medium">{region.label}</p>
              {target?.preview&&<img src={target.preview} alt={`Recorte local do slot ${region.label}`}
                className="mx-auto h-24 w-20 object-contain" />}
              <p className="text-[10px] text-zinc-400">
                Padrão roxo: {target?Math.round(target.emptyEvidence.purpleShare*100):'–'}%
                {' '}| Escuro: {target?Math.round(target.emptyEvidence.darkShare*100):'–'}%
                {' '}| Variação: {target?Math.round(target.emptyEvidence.luminanceSpread):'–'}
              </p>
            </div>;
          })}
        </div>
      </details>
    </div>}
    <p className="text-[11px] text-zinc-500">
      Os slots marcados como provavelmente vazios não passam pelo comparador de personagens.
      Palpites fracos ficam ocultos por padrão. As capturas continuam no navegador.
      São baixadas apenas imagens públicas de referência; nenhuma informação é enviada
      ao coach ou salva no Supabase. A etapa ainda não reconhece automaticamente
      todos os brawlers nem valida picks, bans ou jogadores.
    </p>
  </section>;
}
