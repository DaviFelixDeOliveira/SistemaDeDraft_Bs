import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Eye, Loader2, MapPinned, Search, X, AlertCircle } from 'lucide-react';
import { loadExternalMaps, type ExternalGameMap } from '../../services/catalogApiService';
import { MapPreviewModal } from '../ui/MapPreviewModal';
import type { GameMap } from '../../types';

interface Props {
  existingMaps: GameMap[];
  onClose: () => void;
  onSelect: (map: ExternalGameMap) => void;
}

export function MapCatalogModal({ existingMaps, onClose, onSelect }: Props) {
  const [allMaps, setAllMaps] = useState<ExternalGameMap[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ExternalGameMap | null>(null);
  const [error, setError] = useState('');
  const existing = useMemo(() => new Map(existingMaps.map(map => [map.id, map])), [existingMaps]);

  useEffect(() => {
    let live = true;
    loadExternalMaps().then(data => { if (live) { setAllMaps(data); setError(''); } })
      .catch((err: Error) => { if (live) setError(err.message); })
      .finally(() => { if (live) setLoading(false); });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !preview) onClose(); };
    window.addEventListener('keydown', escape);
    return () => { live = false; window.removeEventListener('keydown', escape); };
  }, [onClose, preview]);

  const filtered = useMemo(() => {
    const text = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (text.length < 2) return [];
    return allMaps
      .filter(m => m.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(text))
      .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.name.localeCompare(b.name))
      .slice(0, 60);
  }, [allMaps, query]);


  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md"
      onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Buscar mapas"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl dark:bg-[#151722]"
        onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:p-5">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
              <MapPinned className="h-5 w-5 text-indigo-500" /> Buscar mapas
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Pesquise pelo nome em inglês do jogo; visualize antes de adicionar à rotação.
            </p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose}
            className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-white/10">
            <X size={20} />
          </button>
        </header>

        <div className="border-b border-slate-200 p-4 dark:border-white/10 sm:px-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} autoFocus
              placeholder="Digite pelo menos 2 letras do nome..."
              aria-label="Buscar mapa"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-[#0C0F19] dark:text-white" />
          </div>
          {error && <p role="alert" className="mt-3 flex gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300"><AlertCircle size={15} />{error}</p>}
        </div>

        <div className="min-h-[250px] space-y-2 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex min-h-[230px] items-center justify-center gap-3 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={21} /> Buscando mapas...
            </div>
          ) : query.trim().length < 2 ? (
            <div className="flex min-h-[230px] flex-col items-center justify-center gap-2 text-center text-sm text-slate-500 dark:text-zinc-400">
              <Search size={32} className="text-indigo-400/60" />
              Pesquise um mapa para adicioná-lo à sua rotação.
              <span className="text-xs">Sua equipe escolhe quais mapas estão na rotação competitiva.</span>
            </div>
          ) : filtered.length ? filtered.map(map => (
            <div key={map.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-[#0C0F18]">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-indigo-500/10">
                {map.imageUrl ? <img src={map.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
                  : <MapPinned className="m-auto mt-5 text-indigo-400" size={24} />}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">{existing.get(map.id)?.name || map.name}</h4>
                {existing.has(map.id) && existing.get(map.id)?.name !== map.name &&
                  <p className="truncate text-[11px] text-slate-500">Original: {map.name}</p>}
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{map.mode}</p>
                {map.disabled && <p className="text-[11px] text-amber-600 dark:text-amber-400">Sinalizado como fora da rotação na API</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => setPreview(map)}
                  title={`Visualizar ${map.name}`} aria-label={`Visualizar imagem do mapa ${map.name}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-indigo-700 transition-colors hover:bg-indigo-500/10 focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-white/15 dark:text-cyan-300">
                  <Eye size={19} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onSelect(map)}
                  className="inline-flex min-w-[92px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-cyan-400">
                  {existing.has(map.id) ? <Check size={15} /> : <Plus size={15} />}
                  {existing.has(map.id) ? (existing.get(map.id)?.isActive ? 'Editar' : 'Reativar') : 'Adicionar'}
                </button>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center text-sm text-slate-500 dark:text-zinc-400">
              Nenhum mapa encontrado para essa busca.
            </div>
          )}
        </div>
        <footer className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-zinc-500">
          Ao adicionar, o nome em inglês é usado inicialmente. Você pode editá-lo depois, sem afetar outras equipes.
        </footer>
        {preview && (
          <MapPreviewModal
            map={{
              id: preview.id, name: existing.get(preview.id)?.name || preview.name,
              mode: preview.mode, terrain: 'Misto', imageUrl: preview.imageUrl || undefined,
              isActive: true
            }}
            onClose={() => setPreview(null)}
          />
        )}
      </div>
    </div>
  );
}
