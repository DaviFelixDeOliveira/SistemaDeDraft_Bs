import { useEffect, useState } from 'react';
import { ImageOff, MapPinned, X } from 'lucide-react';
import type { GameMap } from '../../types';

export function MapPreviewModal({ map, onClose }: { map: GameMap; onClose: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6"
      role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-label={`Visualização do mapa ${map.name}`}
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-[#12131B] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-indigo-500/15 p-2.5 text-indigo-300"><MapPinned size={20} aria-hidden="true" /></div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold text-white">{map.name}</h2>
              <p className="truncate text-xs text-zinc-400">{map.mode} · Terreno {map.terrain}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar visualização do mapa"
            className="rounded-xl border border-white/10 p-2.5 text-zinc-300 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400">
            <X size={20} />
          </button>
        </div>
        <div className="flex min-h-[260px] max-h-[75vh] items-center justify-center overflow-auto bg-[#080C17] p-3 sm:p-6">
          {map.imageUrl && !imageFailed ? (
            <img src={map.imageUrl} alt={`Mapa ${map.name}, modo ${map.mode}`}
              className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-[0_16px_45px_rgba(0,0,0,0.45)]"
              onError={() => setImageFailed(true)} />
          ) : (
            <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-zinc-400">
              <ImageOff size={40} className="text-zinc-600" aria-hidden="true" />
              <p className="font-semibold text-zinc-200">Imagem indisponível</p>
              <p className="text-sm">Este mapa ainda não possui uma imagem válida cadastrada.</p>
            </div>
          )}
        </div>
        <p className="border-t border-white/10 px-6 py-3 text-center text-xs text-zinc-500">
          Clique fora da janela ou pressione Esc para fechar.
        </p>
      </section>
    </div>
  );
}
