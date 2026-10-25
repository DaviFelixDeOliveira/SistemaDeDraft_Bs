import { useEffect, useState } from 'react';
import { LayoutGrid, SlidersHorizontal } from 'lucide-react';
import {
  draftHudPixelRect, draftHudRegions, DEFAULT_DRAFT_HUD_CALIBRATION,
  type DraftHudCalibration, type DraftHudRegion,
} from '../../lib/draftAutoLayout';
import { inspectSlotMarker, type SlotMarkerEvidence } from '../../lib/draftAutoVisualEvidence';

type Extracted = {
  region: DraftHudRegion;
  thumbnail: string;
  marker: SlotMarkerEvidence | null;
};

/**
 * The only purpose of this screen is confirming approximate geometry of
 * previously supplied full-frame draft screenshots. The app neither
 * identifies brawlers nor transmits any visual event based on its output.
 */
export function DraftAutoSlotLocatorLab({ imageUrl }: { imageUrl: string }) {
  const [settings, setSettings] = useState<DraftHudCalibration>(DEFAULT_DRAFT_HUD_CALIBRATION);
  const [regions, setRegions] = useState<DraftHudRegion[]>([]);
  const [samples, setSamples] = useState<Extracted[]>([]);
  const [active, setActive] = useState('blue-1');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    const image = new Image();
    image.onload = () => {
      if (!live) return;
      try {
        const calculated = draftHudRegions(image.naturalWidth, image.naturalHeight, settings);
        if (!calculated.length) throw new Error('Dimensões ou ajustes incompatíveis com a análise.');
        const next: Extracted[] = calculated.map(region => {
          const rect = draftHudPixelRect(region, image.naturalWidth, image.naturalHeight);
          const canvas = document.createElement('canvas');
          // Small diagnostic thumbnail, not a copy stored on a server.
          const scale = Math.min(1, 230 / Math.max(rect.width, rect.height));
          canvas.width = Math.max(1, Math.round(rect.width * scale));
          canvas.height = Math.max(1, Math.round(rect.height * scale));
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('Não foi possível analisar os recortes neste navegador.');
          ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height,
            0, 0, canvas.width, canvas.height);
          return {
            region,
            thumbnail: canvas.toDataURL('image/png'),
            marker: region.kind === 'pick-slot'
              ? inspectSlotMarker(ctx.getImageData(0, 0, canvas.width, canvas.height))
              : null,
          };
        });
        if (live) { setRegions(calculated); setSamples(next); setError(''); }
      } catch (reason) {
        if (live) { setRegions([]); setSamples([]); setError(reason instanceof Error ? reason.message : 'Falha ao processar regiões.'); }
      }
    };
    image.onerror = () => { if (live) { setRegions([]); setSamples([]); setError('Não foi possível carregar a captura.'); } };
    image.src = imageUrl;
    return () => { live = false; image.onload = null; image.onerror = null; };
  }, [imageUrl, settings]);

  const update = (key: keyof DraftHudCalibration, value: number) =>
    setSettings(previous => ({ ...previous, [key]: value }));
  const selected = samples.find(s => s.region.id === active);
  return (
    <section className="space-y-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
      <h4 className="flex items-center gap-2 text-sm font-bold"><LayoutGrid className="h-4 w-4 text-cyan-400"/> Localizador de slots — tela completa (experimental)</h4>
      <p className="text-xs text-zinc-400">
        As caixas mostram <strong>posições aproximadas</strong> dos seis slots de picks e das duas áreas laterais de bans.
        Ajuste até as caixas coincidirem com a interface do jogo. Ainda não localizamos as cartas
        por visão computacional; não identificamos personagens nem enviamos eventos ao coach.
      </p>
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300"><SlidersHorizontal className="h-4 w-4"/> Ajustar localização</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Largura do jogo: {settings.gameWidthPercent}%</span>
          <input type="range" className="w-full accent-indigo-500" min={60} max={100} step={1}
            value={settings.gameWidthPercent} onChange={e=>update('gameWidthPercent', Number(e.target.value))}/>
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Deslocamento lateral: {settings.horizontalShiftPercent}%</span>
          <input type="range" className="w-full accent-indigo-500" min={-15} max={15} step={1}
            value={settings.horizontalShiftPercent} onChange={e=>update('horizontalShiftPercent', Number(e.target.value))}/>
        </label>
        <label className="space-y-1 text-xs text-zinc-400">
          <span>Altura de início dos slots: {settings.picksTopPercent}%</span>
          <input type="range" className="w-full accent-indigo-500" min={61} max={82} step={1}
            value={settings.picksTopPercent} onChange={e=>update('picksTopPercent', Number(e.target.value))}/>
        </label>
      </div>
      <button type="button" onClick={()=>setSettings(DEFAULT_DRAFT_HUD_CALIBRATION)}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300">Restaurar posições</button>
      <div className="relative overflow-hidden rounded-lg border border-zinc-700 bg-black">
        <img src={imageUrl} alt="Captura completa com regiões ilustrativas dos slots inferiores"
          className="block h-auto w-full"/>
        {regions.map(region=><button key={region.id} type="button"
          title={region.label} onClick={()=>setActive(region.id)}
          aria-label={`Ver recorte: ${region.label}`}
          className={`absolute border-2 ${region.id===active?'border-yellow-300 bg-yellow-300/15':'border-cyan-300/75 bg-cyan-300/10'}`}
          style={{left:`${region.x*100}%`,top:`${region.y*100}%`,
            width:`${region.width*100}%`,height:`${region.height*100}%`}}>
          <span className="absolute -top-4 left-0 whitespace-nowrap bg-zinc-950/90 px-1 text-[9px] font-semibold text-white">{region.label}</span>
        </button>)}
      </div>
      <p className="text-[11px] text-amber-300">
        Confira especialmente os limites das cartas. Não interpretar o número físico do slot como a ordem snake (1–6).
      </p>
      {selected && <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-950/60 p-2">
        <img src={selected.thumbnail} alt={`Prévia do recorte de ${selected.region.label}`} className="h-28 w-24 shrink-0 object-contain bg-black"/>
        <div className="space-y-1 text-xs text-zinc-300">
          <strong>{selected.region.label}</strong>
          <p className="text-zinc-400">{selected.region.kind==='ban-area'?
            'Área lateral de bans. Ainda não separa cada ban individual.' :
            selected.marker?.status==='candidate'?
              `Possível marcador de ${selected.marker.marker==='pick'?'pick':'ban'} nesta região. Não é confirmação de escolha.`:
              'Nenhum marcador confiável identificado nesta região.'}</p>
        </div>
      </div>}
      {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
      <p className="text-[11px] text-zinc-500">
        Os recortes permanecem neste navegador e desaparecem ao sair da tela. As posições variam
        entre resoluções e vídeos; esta ferramenta é para conferir a geometria antes de desenvolver a localização automática.
      </p>
    </section>
  );
}
