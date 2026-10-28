import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { draftHudPixelRect, editDraftHudRegion, type DraftHudRegion } from '../../lib/draftAutoLayout';
import {
  estimateDraftGameViewport,draftRegionsForScene,FULL_DRAFT_VIEWPORT,
  type DraftGameViewport,type DraftScreenPhase,
} from '../../lib/draftAutoScene';
import { inspectSlotMarker,type SlotMarkerEvidence } from '../../lib/draftAutoVisualEvidence';
import { DraftAutoSlotChangeLab } from './DraftAutoSlotChangeLab';
import { DraftAutoSingleCheckLab } from './DraftAutoSingleCheckLab';
import { DraftAutoCatalogRecognitionLab } from './DraftAutoCatalogRecognitionLab';
import {
  detectDraftTeamDivider,alignDraftRegionsToTeamDivider,type DraftTeamDivider,
} from '../../lib/draftAutoTeamDivider';

type Extracted = {
  region: DraftHudRegion;
  thumbnail: string;
  marker: SlotMarkerEvidence | null;
};

type ViewportChoice = 'auto' | 'manual';

/**
 * Local diagnostics only: guesses pillarbox margins and overlays adjustable
 * boxes. Neither phase nor card identity is inferred from image content.
 */
export function DraftAutoSlotLocatorLab({ imageUrl }: { imageUrl: string }) {
  const [phase,setPhase]=useState<DraftScreenPhase>('selection');
  const [viewportChoice,setViewportChoice]=useState<ViewportChoice>('auto');
  const [manualWidth,setManualWidth]=useState(100);
  const [manualShift,setManualShift]=useState(0);
  const [verticalShift,setVerticalShift]=useState(0);
  const [autoViewport,setAutoViewport]=useState<DraftGameViewport|null>(null);
  const [divider,setDivider]=useState<DraftTeamDivider|null>(null);
  const [regions,setRegions]=useState<DraftHudRegion[]>([]);
  const [samples,setSamples]=useState<Extracted[]>([]);
  const [active,setActive]=useState('blue-1');
  const [error,setError]=useState('');
  // Each card can be positioned independently. The seed positions remain
  // automatic; dragging or resizing only affects the selected region.
  const [overrides,setOverrides]=useState<Record<string,DraftHudRegion>>({});
  const [dragPreview,setDragPreview]=useState<DraftHudRegion|null>(null);
  const [zoom,setZoom]=useState(false);
  const overlayRef=useRef<HTMLDivElement|null>(null);
  const dragRef=useRef<{
    id:string;pointerId:number;action:'move'|'resize';
    startX:number;startY:number;startRegion:DraftHudRegion;
    latest:DraftHudRegion;
  }|null>(null);

  useEffect(()=>{
    setOverrides({});setDragPreview(null);dragRef.current=null;
    setActive('blue-1');
  },[imageUrl]);

  useEffect(()=>{
    let live=true;
    const image=new Image();
    image.onload=()=>{
      if(!live)return;
      try{
        const detection=document.createElement('canvas');
        const scale=Math.min(1,640/image.naturalWidth);
        detection.width=Math.round(image.naturalWidth*scale);
        detection.height=Math.round(image.naturalHeight*scale);
        const ctx=detection.getContext('2d',{willReadFrequently:true});
        if(!ctx)throw new Error('O navegador não conseguiu analisar a imagem.');
        ctx.drawImage(image,0,0,detection.width,detection.height);
        const viewport=estimateDraftGameViewport(ctx.getImageData(0,0,detection.width,detection.height));
        if(live){setAutoViewport(viewport);setError('');}
      }catch(reason){
        if(live){setAutoViewport(null);setError(reason instanceof Error?reason.message:'Falha na análise do enquadramento.');}
      }
    };
    image.onerror=()=>{if(live){setAutoViewport(null);setError('Não foi possível abrir a imagem.');}};
    image.src=imageUrl;
    return()=>{live=false;image.onload=null;image.onerror=null;};
  },[imageUrl]);

  const width=manualWidth/100;
  const manual:DraftGameViewport={
    x:Math.max(0,Math.min(1-width,(1-width)/2+manualShift/100)),
    y:0,width,height:1,
  };
  const viewport=viewportChoice==='auto' ? (autoViewport??FULL_DRAFT_VIEWPORT) :manual;

  useEffect(()=>{
    let live=true;
    const image=new Image();
    image.onload=()=>{
      if(!live)return;
      try{
        const proposed=draftRegionsForScene(
          image.naturalWidth,image.naturalHeight,phase,viewport,verticalShift/100,
        );
        if(!proposed.length)throw new Error('Ajustes incompatíveis com esta imagem.');
        // Locate the actual blue/red background divider independently of
        // hard-coded screen width. This does NOT find individual cards.
        const sampled=document.createElement('canvas');
        const sampleScale=Math.min(1,640/image.naturalWidth);
        sampled.width=Math.round(image.naturalWidth*sampleScale);
        sampled.height=Math.round(image.naturalHeight*sampleScale);
        const sampleCtx=sampled.getContext('2d',{willReadFrequently:true});
        if(!sampleCtx)throw new Error('Não foi possível localizar a divisão das equipes.');
        sampleCtx.drawImage(image,0,0,sampled.width,sampled.height);
        const detectedDivider=detectDraftTeamDivider(
          sampleCtx.getImageData(0,0,sampled.width,sampled.height),viewport,
        );
        const calculated=alignDraftRegionsToTeamDivider(proposed,viewport,detectedDivider);
        const adjusted=calculated.map(region=>overrides[region.id]??region);
        const next:Extracted[]=adjusted.map(region=>{
          const rect=draftHudPixelRect(region,image.naturalWidth,image.naturalHeight);
          const canvas=document.createElement('canvas');
          const scale=Math.min(1,230/Math.max(rect.width,rect.height));
          canvas.width=Math.max(1,Math.round(rect.width*scale));
          canvas.height=Math.max(1,Math.round(rect.height*scale));
          const ctx=canvas.getContext('2d',{willReadFrequently:true});
          if(!ctx)throw new Error('Não foi possível preparar o recorte.');
          ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,canvas.width,canvas.height);
          return {
            region,thumbnail:canvas.toDataURL('image/png'),
            marker:region.kind==='pick-slot' && canvas.width>=64 && canvas.height>=64
              ?inspectSlotMarker(ctx.getImageData(0,0,canvas.width,canvas.height))
              :null,
          };
        });
        if(live){setRegions(adjusted);setSamples(next);setDivider(detectedDivider);setError('');}
      }catch(reason){
        if(live){setRegions([]);setSamples([]);setDivider(null);setError(reason instanceof Error?reason.message:'Falha no recorte.');}
      }
    };
    image.onerror=()=>{if(live){setRegions([]);setSamples([]);setDivider(null);setError('Não foi possível carregar a captura.');}};
    image.src=imageUrl;
    return()=>{live=false;image.onload=null;image.onerror=null;};
  },[imageUrl,phase,viewport.x,viewport.y,viewport.width,viewport.height,verticalShift,overrides]);

  const displayRegions=regions.map(region=>dragPreview?.id===region.id?dragPreview:region);
  const selected=samples.find(s=>s.region.id===active);

  function beginDrag(event:PointerEvent<HTMLButtonElement>,region:DraftHudRegion){
    if(event.pointerType==='mouse'&&event.button!==0)return;
    const action=(event.target as Element).closest('[data-resize]')?'resize':'move';
    dragRef.current={
      id:region.id,pointerId:event.pointerId,action,
      startX:event.clientX,startY:event.clientY,
      startRegion:region,latest:region,
    };
    setActive(region.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function moveDrag(event:PointerEvent<HTMLButtonElement>){
    const drag=dragRef.current,box=overlayRef.current;
    if(!drag||drag.pointerId!==event.pointerId||!box)return;
    const bounds=box.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const next=editDraftHudRegion(
      drag.startRegion,drag.action,
      (event.clientX-drag.startX)/bounds.width,
      (event.clientY-drag.startY)/bounds.height,
    );
    drag.latest=next;
    setDragPreview(next);
  }
  function endDrag(event:PointerEvent<HTMLButtonElement>,cancelled=false){
    const drag=dragRef.current;
    if(!drag||drag.pointerId!==event.pointerId)return;
    if(!cancelled){
      setOverrides(previous=>({...previous,[drag.id]:drag.latest}));
    }
    dragRef.current=null;
    setDragPreview(null);
  }
  function resetAll(){
    setOverrides({});setDragPreview(null);dragRef.current=null;
    setPhase('selection');setViewportChoice('auto');setVerticalShift(0);setManualWidth(100);setManualShift(0);
  }
  return <section className="space-y-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
    <h4 className="flex items-center gap-2 text-sm font-bold">
      <LayoutGrid className="h-4 w-4 text-cyan-400"/> Escolhas no jogo — localizar os seis jogadores
    </h4>
    <p className="text-xs text-zinc-400">
      Escolha se o print é da tela de seleção ou da preparação final.
      As caixas precisam cobrir os retratos corretamente antes da comparação.
      <strong> Isso não confirma picks ou bans.</strong>
    </p>
    <label className="block space-y-1 text-xs font-semibold text-zinc-300">
      Qual tela aparece na imagem?
      <select className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm"
        value={phase} onChange={e=>{setPhase(e.target.value as DraftScreenPhase);setVerticalShift(0);setOverrides({});setDragPreview(null);}}>
        <option value="selection">Durante bans e picks (slots na parte inferior)</option>
        <option value="final-preparation">Preparação final (seis picks no centro)</option>
      </select>
    </label>
    <details className="rounded-lg border border-zinc-700/70 p-2 text-xs text-zinc-300">
      <summary className="cursor-pointer font-semibold">Ajustar posição das caixas (se necessário)</summary>
      <label className="mt-2 block space-y-1 text-xs text-zinc-300">
      Localização da área do jogo
      <select className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm"
        value={viewportChoice} onChange={e=>setViewportChoice(e.target.value as ViewportChoice)}>
        <option value="auto">Tentar remover bordas laterais automaticamente</option>
        <option value="manual">Ajustar enquadramento manualmente</option>
      </select>
    </label>
    {viewportChoice==='auto'?
      <p className="text-xs text-zinc-400">
        {autoViewport?
          `Área provável: ${Math.round(autoViewport.width*100)}% da largura, começando em ${Math.round(autoViewport.x*100)}%. Confira visualmente.`:
          'Não foi possível confirmar bordas laterais; usando a largura total da imagem. Ajuste manualmente se necessário.'}
      </p>:<div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Largura do jogo: {manualWidth}%</span>
          <input type="range" className="w-full accent-indigo-500" min={60} max={100} step={1}
            value={manualWidth} onChange={e=>setManualWidth(Number(e.target.value))}/>
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Deslocamento lateral: {manualShift}%</span>
          <input type="range" className="w-full accent-indigo-500" min={-15} max={15} step={1}
            value={manualShift} onChange={e=>setManualShift(Number(e.target.value))}/>
        </label>
      </div>}
    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><SlidersHorizontal className="h-4 w-4"/> Ajuste vertical dos slots</div>
    <label className="block space-y-1 text-xs text-zinc-400">
      <span>Deslocamento: {verticalShift}%</span>
      <input type="range" className="w-full accent-indigo-500" min={-18} max={18} step={1}
        value={verticalShift} onChange={e=>setVerticalShift(Number(e.target.value))}/>
    </label>
    <button type="button" onClick={resetAll}
      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Restaurar posições</button>
    <p className="text-xs text-zinc-400">
      {divider
        ? `Divisão azul/vermelha sugerida pelos pixels da imagem: ${Math.round(divider.split*100)}% da área do jogo. Apenas referência de alinhamento.`
        : 'Não foi possível reconhecer uma divisão azul/vermelha confiável. As caixas continuam aproximadas.'}
    </p>
    </details>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <p className="text-zinc-300"><strong>Ajuste individual:</strong> arraste a caixa para mover. Arraste o canto ↘ para mudar o tamanho.</p>
      <button type="button" onClick={()=>setZoom(value=>!value)}
        className="rounded border border-zinc-600 px-2 py-1 text-cyan-200">
        {zoom?'Ver imagem inteira':'Ampliar para ajustar'}
      </button>
    </div>
    <div className="overflow-x-auto rounded-lg border border-zinc-700 bg-black">
      <div ref={overlayRef} className="relative" style={{width:zoom?'200%':'100%'}}>
        <img src={imageUrl} alt="Captura com caixas individuais arrastáveis"
          draggable={false} className="block h-auto w-full select-none"/>
        {displayRegions.map(region=><button key={region.id} type="button"
          title={`${region.label}: arraste para mover; use o canto inferior direito para redimensionar`}
          onClick={()=>setActive(region.id)}
          onPointerDown={e=>beginDrag(e,region)}
          onPointerMove={moveDrag}
          onPointerUp={e=>endDrag(e)}
          onPointerCancel={e=>endDrag(e,true)}
          onKeyDown={e=>{
            const step=e.shiftKey ? 0.01 : 0.0025;
            const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0;
            const dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
            if(dx||dy){
              e.preventDefault();setActive(region.id);
              setOverrides(previous=>({
                ...previous,
                [region.id]:editDraftHudRegion(previous[region.id]??region,'move',dx,dy),
              }));
            }
          }}
          aria-label={`Ajustar ${region.label}; setas do teclado movem a caixa`}
          className={`absolute cursor-move border-2 ${region.id===active?'border-yellow-300 bg-yellow-300/15':'border-cyan-300/75 bg-cyan-300/10'}`}
          style={{left:`${region.x*100}%`,top:`${region.y*100}%`,
            width:`${region.width*100}%`,height:`${region.height*100}%`,touchAction:'none'}}>
          <span className={`absolute left-0 top-0 max-w-full truncate px-1 text-[9px] font-bold text-white ${region.side==='blue'?'bg-blue-800/90':'bg-rose-800/90'}`}>
            {region.kind==='ban-area' ? (region.side==='blue'?'Bans A':'Bans V') : `${region.side==='blue'?'A':'V'}${(region.physicalSlot??0)+1}`}
          </span>
          {region.id===active&&<span data-resize="true"
            aria-hidden="true" className="absolute bottom-0 right-0 flex h-5 w-5 cursor-nwse-resize items-center justify-center border-l border-t border-yellow-300 bg-yellow-300 text-xs font-bold text-black">↘</span>}
        </button>)}
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
      <span>Selecionado: <strong>{selected?.region.label??'toque em uma caixa'}</strong>. Também é possível mover com as setas do teclado.</span>
      {overrides[active]&&<button type="button"
        className="rounded border border-zinc-600 px-2 py-1 text-cyan-200"
        onClick={()=>setOverrides(previous=>{
          const next={...previous};delete next[active];return next;
        })}>Restaurar apenas esta caixa</button>}
      {Object.keys(overrides).length>0&&<button type="button"
        className="rounded border border-zinc-600 px-2 py-1 text-zinc-300"
        onClick={()=>{setOverrides({});setDragPreview(null);}}>Restaurar todas as caixas</button>}
    </div>
    <DraftAutoSingleCheckLab imageUrl={imageUrl} regions={regions}/>
    <p className="text-[11px] text-amber-300">
      {phase==='final-preparation'
        ? 'A preparação final mostra os seis personagens juntos, mas não revela o momento exato de cada pick.'
        : 'Durante as escolhas, o sistema precisará acompanhar várias capturas para atualizar os counters antes do próximo turno. Este teste ainda não faz isso.'}
    </p>
    {selected&&<div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-950/60 p-2">
      <img src={selected.thumbnail} alt={`Prévia do recorte de ${selected.region.label}`}
        className="h-28 w-24 shrink-0 object-contain bg-black"/>
      <div className="space-y-1 text-xs text-zinc-300">
        <strong>{selected.region.label}</strong>
        <p className="text-zinc-400">
          {selected.region.kind==='ban-area'
            ?'Área aproximada dos bans; não identifica cada ícone lateral.'
            :selected.marker?.status==='candidate'
              ?`Indício de marcador de ${selected.marker.marker==='pick'?'pick':'ban'}; não identifica o personagem.`
              :'Ainda não há confirmação visual confiável neste recorte.'}
        </p>
      </div>
    </div>}
    {(regions.length===8||regions.length===6)&&<>
      <DraftAutoSlotChangeLab imageUrl={imageUrl} regions={regions}/>
      <details className="rounded-lg border border-zinc-700 p-2">
        <summary className="cursor-pointer text-xs text-zinc-400">
          Teste opcional: reconhecer brawlers somente da primeira imagem
        </summary>
        <DraftAutoCatalogRecognitionLab screenshotUrl={imageUrl} regions={regions}/>
      </details>
    </>}
    {error&&<p role="alert" className="text-xs text-red-400">{error}</p>}
    <p className="text-[11px] text-zinc-500">
      Sem envio de imagens/eventos. Bordas e proporções variam entre dispositivos;
      a próxima fase deverá localizar as cartas por evidência visual, não por coordenadas fixas.
    </p>
  </section>;
}
