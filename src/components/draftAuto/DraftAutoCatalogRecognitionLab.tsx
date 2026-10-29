import { useEffect,useMemo,useRef,useState } from 'react';
import { BookImage,RefreshCw } from 'lucide-react';
import { evaluateDraftHoldout, summarizeDraftTrainingCoverage, type DraftHoldoutReport } from '../../lib/draftAutoHoldout';
import {
  clearDraftAutoPortraitCrops,listDraftAutoPortraitCrops,makeDraftAutoPortraitCrop,
  saveDraftAutoPortraitCrop,type DraftAutoPortraitCrop,
} from '../../services/draftAutoPortraitCrops';
import {
  DRAFT_LOCAL_PORTRAITS_KEY, addDraftLearnedPortrait,
  matchDraftLearnedPortrait, parseDraftLearnedPortraits,
  type DraftLearnedPortrait,
} from '../../lib/draftAutoLearnedPortrait';
import { inspectDraftEmptySlot, type DraftEmptySlotEvidence } from '../../lib/draftAutoEmptySlot';
import { corroborateDraftEmptyCards } from '../../lib/draftAutoEmptyReference';
import { diagnoseDraftStructureLabel } from '../../lib/draftAutoCatalogStructure';
import { diagnoseDraftCombinedLabel } from '../../lib/draftAutoCatalogCombined';
import { draftHudPixelRect,type DraftHudRegion } from '../../lib/draftAutoLayout';
import {
  parseDraftCatalog,matchDraftCatalogPortrait,diagnoseDraftCatalogLabel,
  type DraftCatalogReference,
} from '../../lib/draftAutoCatalogVisual';
import {
  portraitFingerprint,portraitSimilarity,type DraftPortraitFingerprint,
} from '../../lib/draftAutoPortraitIdentity';

type SlotFingerprint={
  portrait:DraftPortraitFingerprint;
  emptyEvidence:DraftEmptySlotEvidence;
  preview:string;
  facePreview:string;
};
type SlotFingerprints=Record<string,SlotFingerprint>;
type LoadingState='idle'|'loading'|'ready'|'failed';
export type DraftAutoCatalogSlotGuess = {
  regionId: string;
  status: 'possible' | 'empty' | 'unknown';
  name?: string;
};

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
    if(fp) {
      const faceCanvas=document.createElement('canvas');
      faceCanvas.width=64;faceCanvas.height=64;
      const faceCtx=faceCanvas.getContext('2d');
      if(!faceCtx)throw new Error('Recorte facial indisponível neste navegador.');
      // Same central region as portraitFingerprint: no nick, gears, side badges
      // or full screenshot is stored.
      faceCtx.drawImage(canvas,11,16,39,42,0,0,64,64);
      found[region.id]={
        portrait:fp,
        emptyEvidence:inspectDraftEmptySlot(pixels),
        preview:canvas.toDataURL('image/png'),
        facePreview:faceCanvas.toDataURL('image/png'),
      };
    }
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
  screenshotUrl,regions,compact=false,onResults,
}:{screenshotUrl:string;regions:DraftHudRegion[];compact?:boolean;
  onResults?:(result:DraftAutoCatalogSlotGuess[]|null)=>void}) {
  const [targets,setTargets]=useState<SlotFingerprints>({});
  const [references,setReferences]=useState<DraftCatalogReference[]>([]);
  const [phase,setPhase]=useState<LoadingState>('idle');
  const [total,setTotal]=useState(0);
  const [processed,setProcessed]=useState(0);
  const [failedImages,setFailedImages]=useState(0);
  const [error,setError]=useState('');
  const [diagnosticSlot,setDiagnosticSlot]=useState('blue-2');
  const [learned,setLearned]=useState<DraftLearnedPortrait[]>([]);
  const [savedCrops,setSavedCrops]=useState<DraftAutoPortraitCrop[]>([]);
  const [trainingSlot,setTrainingSlot]=useState('blue-1');
  const [trainingId,setTrainingId]=useState('');
  const [trainingMessage,setTrainingMessage]=useState('');
  const [holdoutLabels,setHoldoutLabels]=useState<Record<string,string>>({});
  const [holdoutReport,setHoldoutReport]=useState<DraftHoldoutReport|null>(null);
  const [diagnosticKnownId,setDiagnosticKnownId]=useState('');
  const controllerRef=useRef<AbortController|null>(null);

  useEffect(()=>{
    let live=true;
    void listDraftAutoPortraitCrops().then(items=>{
      if(live)setSavedCrops(items);
    }).catch(()=>{
      // Old browsers / blocked IndexedDB can still use fingerprint-only mode.
    });
    try {
      setLearned(parseDraftLearnedPortraits(
        JSON.parse(window.localStorage.getItem(DRAFT_LOCAL_PORTRAITS_KEY)??'[]'),
      ));
    } catch { setLearned([]); }
    return ()=>{
      live=false;
      controllerRef.current?.abort();
    };
  },[]);

  useEffect(()=>{
    let live=true;
    setDiagnosticKnownId('');
    setHoldoutLabels({});
    setHoldoutReport(null);
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
  const learnedMatches=useMemo(()=>Object.fromEntries(
    slots.map(region=>[region.id, targets[region.id]
      ?matchDraftLearnedPortrait(targets[region.id].portrait,learned)
      :null]),
  ) as Record<string,ReturnType<typeof matchDraftLearnedPortrait>|null>,
    [slots,targets,learned]);
  const diagnosedSlot=results.find(r=>r.region.id===diagnosticSlot);
  const diagnosedTarget=targets[diagnosticSlot];
  const humanDiagnostic=useMemo(()=>diagnosticKnownId&&diagnosedTarget
    ?diagnoseDraftCatalogLabel(diagnosedTarget.portrait,references,Number(diagnosticKnownId))
    :null,[diagnosticKnownId,diagnosedTarget,references]);
  const structuralDiagnostic=useMemo(()=>diagnosticKnownId&&diagnosedTarget
    ?diagnoseDraftStructureLabel(diagnosedTarget.portrait,references,Number(diagnosticKnownId))
    :null,[diagnosticKnownId,diagnosedTarget,references]);
  const combinedDiagnostic=useMemo(()=>diagnosticKnownId&&diagnosedTarget
    ?diagnoseDraftCombinedLabel(diagnosedTarget.portrait,references,Number(diagnosticKnownId))
    :null,[diagnosticKnownId,diagnosedTarget,references]);
  const alphabeticalReferences=useMemo(()=>[...references].sort((a,b)=>
    a.name.localeCompare(b.name,'pt-BR')),[references]);
  const trainingCoverage=summarizeDraftTrainingCoverage(
    Object.values(holdoutLabels).filter(Boolean).map(label=>
      label==='empty'?'empty':Number(label)),
    learned.map(example=>example.brawlerId),
  );

  function storeLearned(next:DraftLearnedPortrait[]) {
    try {
      window.localStorage.setItem(DRAFT_LOCAL_PORTRAITS_KEY,JSON.stringify(next));
      setLearned(next);
      setHoldoutReport(null);
      setTrainingMessage('');
    } catch {
      setTrainingMessage('Não foi possível salvar exemplos neste navegador.');
    }
  }

  function assessUnseenScreenshot() {
    const observations=results.flatMap(({region,match,emptyState})=>{
      const truth=holdoutLabels[region.id];
      if(!truth)return [];
      const actual=truth==='empty'?'empty' as const:Number(truth);
      const learnedMatch=learnedMatches[region.id];
      const memorized=learnedMatch?.status==='seen-example';
      const predicted=emptyState!=='unknown'?'empty' as const:
        memorized?null:
        learnedMatch?.status==='possible'?learnedMatch.brawlerId:
        match?.status==='possible-match'?match.gameId:null;
      return [{actual,predicted,memorized}];
    });
    setHoldoutReport(evaluateDraftHoldout(observations));
  }

  async function addTrainingExample() {
    const target=targets[trainingSlot];
    const ref=references.find(item=>String(item.id)===trainingId);
    if(!target||!ref){setTrainingMessage('Escolha uma carta preenchida e o brawler correto.');return;}
    if(emptyDecisions[trainingSlot]!=='unknown'){
      setTrainingMessage('Esse slot parece vazio. Verifique o recorte antes de ensinar.');
      return;
    }
    if(learned.some(item=>item.brawlerId===ref.id &&
      (portraitSimilarity(item.fingerprint,target.portrait)??0)>=.995)){
      setTrainingMessage('Este brawler já tem um retrato praticamente igual salvo. Só ensine novamente se a aparência no draft for diferente.');
      return;
    }
    const next=addDraftLearnedPortrait(learned,{
      brawlerId:ref.id,name:ref.name,fingerprint:target.portrait,
    });
    storeLearned(next);
    const crop=makeDraftAutoPortraitCrop(
      ref.id,ref.name,target.portrait,target.facePreview,
    );
    if(crop) {
      try {
        await saveDraftAutoPortraitCrop(crop);
        setSavedCrops(await listDraftAutoPortraitCrops());
      } catch {
        setTrainingMessage('Assinatura visual salva, mas o recorte em imagem não pôde ser guardado.');
      }
    }
  }

  function exportFaceDataset() {
    if(!savedCrops.length)return;
    const payload={
      version:1,format:'draft-face-crops',exportedAt:new Date().toISOString(),
      examples:savedCrops,
    };
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'}));
    const link=document.createElement('a');
    link.href=url;link.download='biblioteca-retratos-draft.json';
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  useEffect(()=>{
    if(!onResults)return;
    if(phase!=='ready'){onResults(null);return;}
    onResults(results.map(({region,match,emptyState})=>{
      const local=learnedMatches[region.id];
      const possible=local?.status==='seen-example'?null:
        local?.status==='possible'?local.name:
        match?.status==='possible-match'?match.name:null;
      return {
        regionId:region.id,
        status:emptyState!=='unknown'?'empty':possible?'possible':'unknown',
        name:emptyState==='unknown'?possible??undefined:undefined,
      };
    }));
  },[phase,results,onResults,learnedMatches]);

  if(compact) return <section className="mt-3 space-y-2 rounded-lg border border-cyan-700/40 p-3">
    <p className="text-xs font-semibold text-zinc-200">Palpites de brawler na segunda imagem</p>
    <p className="text-xs text-zinc-400">Opcional. Só compara com artes públicas; skins podem confundir. Não confirma escolhas.</p>
    <button type="button" disabled={phase==='loading'} onClick={()=>void loadCatalog()}
      className="w-full rounded-lg bg-cyan-700 p-2 text-sm font-semibold text-white disabled:opacity-50">
      {phase==='loading'?'Analisando catálogo…':'Analisar brawlers da segunda imagem'}
    </button>
    {phase==='loading'&&<p role="status" className="text-xs text-zinc-400">
      Imagens lidas: {processed} de {total||'…'}.
    </p>}
    {phase==='ready'&&<p className="text-xs text-emerald-300">
      {references.length} referências disponíveis. Veja os palpites junto ao estado de cada slot acima.
    </p>}
    {error&&<p role="alert" className="text-xs text-red-400">{error}</p>}
  </section>;


  return <section className="mt-4 space-y-3 rounded-xl border border-cyan-600/40 bg-cyan-500/5 p-3">
    <h4 className="flex items-center gap-2 text-sm font-bold text-white">
      <BookImage className="h-4 w-4 text-cyan-300"/>
      Possíveis brawlers desta imagem
    </h4>
    <p className="text-xs text-zinc-300">
      O sistema compara os seis slots com o catálogo de brawlers. Ele pode
      encontrar um personagem parecido ou uma carta vazia.
      <strong> Possível não significa confirmado.</strong>
    </p>
    <button type="button" disabled={phase==='loading'} onClick={()=>void loadCatalog()}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 p-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-cyan-600">
      <RefreshCw className={`h-4 w-4 ${phase==='loading'?'animate-spin':''}`}/>
      {phase==='loading'?'Lendo brawlers…':references.length?'Analisar novamente':'Reconhecer brawlers da imagem'}
    </button>
    {phase==='loading'&&<p role="status" className="text-xs text-zinc-300">
      Imagens processadas: {processed} de {total||'…'}. Falhas de leitura: {failedImages}.
    </p>}
    {phase==='ready'&&<p role="status" className="text-xs text-emerald-300">
      {references.length} brawlers com imagens utilizáveis; {failedImages} imagens indisponíveis.
    </p>}
    {error&&<p role="alert" className="text-xs text-red-300">{error}</p>}
    {phase==='ready'&&<div className="space-y-2">
      <p className="text-xs font-bold text-zinc-200">Resultado dos seis slots (não confirmado)</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {results.map(({region,match,emptyState})=><div key={region.id}
          className="min-w-0 rounded-lg border border-zinc-700 bg-zinc-950/70 p-2 text-xs">
          <strong>{region.label}</strong>
          {emptyState==='unknown'&&learnedMatches[region.id]?.status==='seen-example'
            ?<p className="mt-1 break-words text-amber-200">
              Exemplo já ensinado: {learnedMatches[region.id]?.name}
              <span className="block text-[10px] text-zinc-400">
                Esta carta corresponde exatamente a um exemplo salvo. Isso não mede acerto em imagem nova.
              </span>
            </p>
            :emptyState==='unknown'&&learnedMatches[region.id]?.status==='possible'
            ?<p className="mt-1 break-words text-emerald-300">
              Possivelmente {learnedMatches[region.id]?.name}
              <span className="block text-[10px] text-zinc-400">
                Parecido com retrato real salvo neste navegador. Não confirma pick.
              </span>
            </p>
            :emptyState!=='unknown'
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
          {emptyState==='unknown'&&learnedMatches[region.id]?.status!=='seen-example'&&match?.status==='uncertain'&&match.nearest[0]&&
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
        <summary className="cursor-pointer font-semibold">
          Por que o sistema não reconheceu? (comparação local)
        </summary>
        <p className="mt-2 text-zinc-400">
          Semelhança visual não é probabilidade de acerto. A biblioteca só sugere
          quando a semelhança é pelo menos 96% e a vantagem sobre outro
          personagem é de pelo menos 4 pontos percentuais.
        </p>
        <div className="mt-2 space-y-1">
          {results.map(({region,emptyState})=>{
            const candidate=learnedMatches[region.id];
            return <p key={region.id}>
              <strong>{region.label}:</strong>{' '}
              {emptyState!=='unknown'?'Possível slot vazio.':
                !candidate?.closestName?'Biblioteca local sem comparação suficiente.':
                `${candidate.closestName} — ${Math.round(candidate.similarity*100)}% de semelhança; vantagem de ${Math.round(candidate.margin*100)} pontos percentuais. ${candidate.status==='unknown'?'Não atingiu os requisitos.':'Hipótese visual, não confirmada.'}`}
            </p>;
          })}
        </div>
      </details>
      <div className="space-y-2 rounded-lg border border-cyan-700/50 bg-cyan-950/20 p-2 text-xs">
        <strong className="text-cyan-200">Ensinar retratos reais do jogo (opcional)</strong>
        <p className="text-zinc-300">
          Em geral, o draft usa o retrato padrão mesmo quando há skin. Alguns personagens
          podem ter retratos alternativos: cadastre-os com o mesmo nome do brawler.
          Use somente cartas da tela do draft, não imagens de outros menus.
          Os recortes do rosto ficam apenas neste navegador.
        </p>
        <label className="block space-y-1">
          <span className="text-zinc-300">Carta no print</span>
          <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2"
            value={trainingSlot} onChange={e=>setTrainingSlot(e.target.value)}>
            {slots.map(region=><option key={region.id} value={region.id}>{region.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-zinc-300">Brawler verdadeiro (escolha você)</span>
          <select className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-2"
            value={trainingId} onChange={e=>setTrainingId(e.target.value)}>
            <option value="">Selecione...</option>
            {alphabeticalReferences.map(ref=><option key={ref.id} value={String(ref.id)}>
              {ref.name}
            </option>)}
          </select>
        </label>
        <button type="button" onClick={()=>void addTrainingExample()}
          disabled={!targets[trainingSlot]||!trainingId}
          className="w-full rounded-md bg-cyan-700 p-2 font-semibold text-white disabled:opacity-50">
          Guardar este retrato como exemplo
        </button>
        <p className="text-zinc-400">
          {learned.length} exemplos de {new Set(learned.map(item=>item.brawlerId)).size} brawlers salvos.
          {' '}O acerto deve ser avaliado em outra captura, não naquela usada para ensinar.
        </p>
        <p className="text-amber-200">
          Treinar seis cartas e reconhecer essas mesmas seis não significa 100% de precisão.
          Para medir acertos, use um print de outra partida.
        </p>
        <details className="rounded border border-zinc-700 p-2">
          <summary className="cursor-pointer">
            Recortes reais salvos neste navegador ({savedCrops.length})
          </summary>
          <p className="mt-1 text-zinc-400">
            Guardamos só a região central do rosto, sem nomes de jogadores.
            As seis referências antigas podem conter apenas assinatura, sem imagem.
          </p>
          <div className="mt-2 flex max-h-52 flex-wrap gap-2 overflow-y-auto">
            {savedCrops.slice(0,80).map(crop=><div key={crop.id}
              className="w-16 rounded border border-zinc-700 p-1 text-center">
              <img src={crop.faceDataUrl} alt={crop.name} className="mx-auto h-12 w-12 object-contain"/>
              <span className="block truncate text-[10px]">{crop.name}</span>
            </div>)}
          </div>
          {savedCrops.length>0&&<button type="button" onClick={exportFaceDataset}
            className="mt-2 rounded bg-zinc-800 px-2 py-1 text-xs text-cyan-200">
            Baixar biblioteca de recortes (backup JSON)
          </button>}
        </details>
        {trainingMessage&&<p role="alert" className="text-amber-300">{trainingMessage}</p>}
        {learned.length>0&&<button type="button" className="text-red-300 underline"
          onClick={()=>{
            if(window.confirm('Apagar todos os exemplos de retratos salvos neste navegador?')){
              storeLearned([]);
              void clearDraftAutoPortraitCrops().then(()=>setSavedCrops([])).catch(()=>
                setTrainingMessage('Não foi possível apagar os recortes em imagem.'));
            }
          }}>Apagar exemplos salvos</button>}
      </div>
      <details className="rounded-lg border border-zinc-700/80 p-2 text-xs text-zinc-300">
        <summary className="cursor-pointer font-semibold">
          Avaliar precisão com um print NOVO (sem ensinar)
        </summary>
        <p className="mt-2 text-zinc-400">
          Use uma captura diferente da usada para ensinar, preferencialmente de outra partida.
          Informe quais brawlers realmente aparecem. O sistema compara as respostas sem
          salvá-las nem treiná-las automaticamente.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {results.map(({region})=><label key={region.id} className="min-w-0 space-y-1">
            <span className="block font-semibold">{region.label}</span>
            <select className="w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-950 p-1.5 text-xs"
              value={holdoutLabels[region.id]??''}
              onChange={e=>{
                setHoldoutLabels(previous=>({...previous,[region.id]:e.target.value}));
                setHoldoutReport(null);
              }}>
              <option value="">Não avaliar</option>
              <option value="empty">Carta vazia</option>
              {alphabeticalReferences.map(ref=><option key={ref.id} value={String(ref.id)}>{ref.name}</option>)}
            </select>
          </label>)}
        </div>
        <button type="button" onClick={assessUnseenScreenshot}
          disabled={!Object.values(holdoutLabels).some(Boolean)}
          className="mt-3 w-full rounded-md bg-indigo-600 p-2 font-semibold text-white disabled:opacity-50">
          Conferir acertos desta imagem
        </button>
        {holdoutReport&&<div className="mt-3 space-y-1 rounded-md border border-zinc-700 p-2">
          <strong>Resultado do teste (não treinou nada)</strong>
          <p>Acertos: {holdoutReport.correct} · Erros: {holdoutReport.incorrect}
            {' '}· Sem resposta: {holdoutReport.abstained}</p>
          <p>Brawlers com retratos já ensinados: {trainingCoverage.known} de {trainingCoverage.total}
            {' '}selecionados nesta imagem. {trainingCoverage.unseen} ainda sem exemplos locais.</p>
          <p>Assinaturas visuais idênticas às ensinadas: {holdoutReport.memorized}
            {' '}(excluídas da avaliação).</p>
          <p>Acertos entre as {holdoutReport.evaluated} cartas novas rotuladas:
            {' '}{holdoutReport.accuracy===null?'Ainda não há teste independente':
              Math.round(holdoutReport.accuracy*100)+'%'}.
          </p>
          {holdoutReport.evaluated<20&&<p className="text-amber-200">
            Amostra pequena: este resultado não representa a precisão real.
            Continue avaliando capturas diferentes.
          </p>}
        </div>}
      </details>
      <details className="rounded-lg border border-zinc-700/80 p-2 text-xs text-zinc-300">
        <summary className="cursor-pointer font-medium">
          Testes técnicos dos métodos de reconhecimento (opcional)
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
        {structuralDiagnostic&&<div className="mt-2 rounded-md border border-violet-800/70 bg-violet-950/20 p-2 text-[11px]">
          <p className="font-semibold text-violet-200">
            Comparação experimental — formas e contraste (sem usar cores RGB diretas)
          </p>
          <p className="mt-1">
            Brawler informado: <strong>{structuralDiagnostic.rank}º de {structuralDiagnostic.total}</strong>.
            {' '}Primeiro colocado por esse método: {structuralDiagnostic.bestName}.
            {' '}Semelhança estrutural: {Math.round(structuralDiagnostic.similarity*100)}%.
          </p>
          <p className="mt-1 text-zinc-300">
            Três mais próximos: {structuralDiagnostic.topThree.map((candidate,index)=>
              `${index+1}º ${candidate.name}`).join(' · ')}.
          </p>
          {humanDiagnostic&&<p className="mt-1 text-zinc-400">
            Método atual por cores: {humanDiagnostic.rank}º lugar.
            {' '}Método novo por estrutura: {structuralDiagnostic.rank}º lugar.
            {' '}Mesmo que melhore, ainda não comprova reconhecimento confiável.
          </p>}
          <p className="mt-1 text-amber-300">
            Experimento comparativo: não altera as sugestões do Draft,
            não aprende automaticamente e não envia dados.
          </p>
        </div>}
        {combinedDiagnostic&&<p className="mt-2 rounded-md border border-zinc-700 p-2 text-[11px]">
          <strong>Terceiro método (cores + formas):</strong>
          {' '}brawler informado em <strong>{combinedDiagnostic.rank}º de {combinedDiagnostic.total}</strong>.
          {' '}Primeiro colocado: {combinedDiagnostic.bestName}.
          {' '}Três mais próximos: {combinedDiagnostic.topThree.map((r,index)=>
            `${index+1}º ${r.name}`).join(' · ')}.
          {' '}Pontuação experimental, não é probabilidade de acerto.
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
      Teste local: não envia imagens ou escolhas ao coach. Sem confirmação
      automática de pick, ban ou pré-seleção. Imagens públicas são usadas só como referência.
    </p>
  </section>;
}
