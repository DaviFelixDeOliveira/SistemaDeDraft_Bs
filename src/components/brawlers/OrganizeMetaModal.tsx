import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Brawler } from '../../types';
import { fuzzySearch } from '../../lib/utils';
import { BrawlerArtwork } from '../ui/BrawlerArtwork';

export const META_TIERS = ['S', 'A', 'B', 'C', 'D'] as const;
export type MetaTier = typeof META_TIERS[number];

export function metaTierCounts(brawlers: Brawler[]): Record<MetaTier, number> {
  const counts: Record<MetaTier, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const brawler of brawlers) {
    if (META_TIERS.some(tier => tier === brawler.tier)) counts[brawler.tier as MetaTier]++;
  }
  return counts;
}

export function findMetaCandidates(brawlers: Brawler[], search: string, target: MetaTier): Brawler[] {
  return brawlers
    .filter(b => !search.trim() || fuzzySearch(search.trim(), b.name))
    .sort((a, b) => {
      if ((a.tier === target) !== (b.tier === target)) return a.tier === target ? 1 : -1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
}

interface Props {
  isOpen: boolean;
  brawlers: Brawler[];
  onClose: () => void;
  onApply: (brawlerIds: string[], tier: MetaTier) => Promise<void>;
}

/** Tier manual de cada equipe, independente das análises de picks, bans e winrate. */
export function OrganizeMetaModal({ isOpen, brawlers, onClose, onApply }: Props) {
  const [targetTier, setTargetTier] = useState<MetaTier>('S');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const counts = useMemo(() => metaTierCounts(brawlers), [brawlers]);
  const candidates = useMemo(() => findMetaCandidates(brawlers, search, targetTier), [brawlers, search, targetTier]);
  const currentIds = useMemo(() => new Set(
    brawlers.filter(b => b.tier === targetTier).map(b => b.id)
  ), [brawlers, targetTier]);
  const checked = useMemo(() => selectedIds.filter(id => !currentIds.has(id)), [selectedIds, currentIds]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, saving]);

  if (!isOpen) return null;

  const changeTier = (tier: MetaTier) => {
    setTargetTier(tier);
    setSelectedIds([]);
    setSearch('');
    setError('');
    setSuccess('');
  };

  const toggle = (id: string) => {
    if (saving || currentIds.has(id)) return;
    setSelectedIds(previous => previous.includes(id)
      ? previous.filter(item => item !== id) : [...previous, id]);
    setError('');
    setSuccess('');
  };

  const save = async () => {
    if (checked.length === 0 || saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await onApply(checked, targetTier);
      setSelectedIds([]);
      setSuccess(`${checked.length} brawler(s) movido(s) para Tier ${targetTier} nesta equipe.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o meta. Atualize e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-5"
      onMouseDown={event => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="organize-meta-title"
        className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-white/10 dark:bg-[#121212] dark:text-white">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4 dark:border-white/10 sm:p-5">
          <div className="min-w-0">
            <h2 id="organize-meta-title" className="flex items-center gap-2 text-xl font-extrabold">
              <SlidersHorizontal size={21} className="text-indigo-500" /> Organizar Meta
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Escolha um tier e selecione os brawlers para alterá-lo. O meta pertence somente à sua equipe.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar organização do meta"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white">
            <X size={21} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Tier de destino</p>
          <div className="mb-4 grid grid-cols-5 gap-2" role="group" aria-label="Selecionar tier de destino">
            {META_TIERS.map(tier => (
              <button type="button" key={tier} onClick={() => changeTier(tier)} disabled={saving}
                aria-pressed={tier === targetTier}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60
                  ${tier === targetTier
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10'}`}>
                <span>{tier}</span>
                <span className={`text-[10px] font-semibold ${tier === targetTier ? 'text-indigo-100' : 'text-zinc-500'}`}>
                  {counts[tier]} brawlers
                </span>
              </button>
            ))}
          </div>

          <label htmlFor="meta-search" className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">
            Buscar brawler
          </label>
          <div className="relative mb-3">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
            <input id="meta-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Ex.: Gus, Mortis, Piper..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-[#090909] dark:text-white" />
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{candidates.length} resultado(s) · {checked.length} selecionado(s)</span>
            {checked.length > 0 && <button type="button" onClick={() => setSelectedIds([])} disabled={saving}
              className="font-bold text-indigo-600 hover:underline dark:text-indigo-300">Limpar seleção</button>}
          </div>

          <div className="grid max-h-[42vh] grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-white/10 dark:bg-[#090909] sm:grid-cols-2">
            {candidates.map(brawler => {
              const isInTarget = brawler.tier === targetTier;
              const isChecked = checked.includes(brawler.id);
              return (
                <button key={brawler.id} type="button" disabled={isInTarget || saving}
                  aria-pressed={isChecked}
                  title={isInTarget ? `Já está no Tier ${targetTier}` : `Mover ${brawler.name} para Tier ${targetTier}`}
                  onClick={() => toggle(brawler.id)}
                  className={`flex min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed
                    ${isChecked ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-200 bg-white hover:border-indigo-300 dark:border-white/10 dark:bg-[#191919] dark:hover:border-indigo-500/50'}
                    ${isInTarget ? 'opacity-55' : ''}`}>
                  <BrawlerArtwork name={brawler.name} iconUrl={brawler.iconUrl} imageUrl={brawler.imageUrl}
                    className="h-11 w-11 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{brawler.name}</span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {isInTarget ? `Já é Tier ${targetTier}` : `Atual: Tier ${brawler.tier || 'não definido'}`}
                    </span>
                  </div>
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border
                    ${isInTarget ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                    : isChecked ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-zinc-300 dark:border-white/25'}`}>
                    {(isChecked || isInTarget) && <Check size={15} />}
                  </div>
                </button>
              );
            })}
            {candidates.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-zinc-500">
                Nenhum brawler encontrado. Experimente outra pesquisa.
              </p>
            )}
          </div>

          {error && <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
          {success && <p role="status" className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={16}/>{success}</p>}
        </div>

        <footer className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-zinc-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:p-5">
          <p className="text-xs text-zinc-500">Apenas o tier manual muda. Picks, bans e winrate permanecem intactos.</p>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-xl px-4 py-3 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10">Fechar</button>
            <button type="button" disabled={saving || checked.length === 0} onClick={() => void save()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17}/>}
              {saving ? 'Salvando...' : `Mover ${checked.length} para Tier ${targetTier}`}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
