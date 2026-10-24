import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Lightbulb, Ban } from 'lucide-react';
import { Brawler } from '../../types';
import { cn, getBrawlerBgColor } from '../../lib/utils';
import { BrawlerFilterBar, useBrawlerFilters, applyBrawlerFilters } from '../BrawlerFilters';
import { BrawlerArtwork } from './BrawlerArtwork';

interface BrawlerSelectDropdownProps {
  disabledReasons?: Record<string, string>;
  key?: React.Key;
  placeholder: string;
  value: string | null;
  onChange: (brawlerId: string) => void;
  disabledBrawlers: string[];
  suggestedBrawlers?: string[];
  allBrawlers: Brawler[];
  icon?: React.ReactNode;
}

export function BrawlerSelectDropdown({ placeholder, value, onChange, disabledBrawlers, disabledReasons = {}, suggestedBrawlers = [], allBrawlers, icon }: BrawlerSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const brawlerFilters = useBrawlerFilters();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedBrawler = value ? allBrawlers.find(b => b.id === value) : null;
  const filteredBrawlers = applyBrawlerFilters(allBrawlers, brawlerFilters);

  const sortedBrawlers = useMemo(() => {
    if (!brawlerFilters.search && !brawlerFilters.tier && !brawlerFilters.brawlerClass && !brawlerFilters.rarity && brawlerFilters.sortOrder === 'none') {
      return [...allBrawlers].sort((a, b) => {
        const aSug = suggestedBrawlers.includes(a.id);
        const bSug = suggestedBrawlers.includes(b.id);
        if (aSug && !bSug) return -1;
        if (!aSug && bSug) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    return filteredBrawlers;
  }, [allBrawlers, filteredBrawlers, brawlerFilters.search, brawlerFilters.tier, brawlerFilters.brawlerClass, brawlerFilters.rarity, brawlerFilters.sortOrder, suggestedBrawlers]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && sortedBrawlers.length > 0) {
      const firstAvailable = sortedBrawlers.find(b => !disabledBrawlers.includes(b.id));
      if (firstAvailable) {
        onChange(firstAvailable.id);
        setIsOpen(false);
        brawlerFilters.setSearch('');
        brawlerFilters.setTier('');
        brawlerFilters.setBrawlerClass('');
        brawlerFilters.setRarity('');
        brawlerFilters.setSortOrder('none');
      }
    }
  };

  return (
    <div className="relative w-full min-w-0" ref={wrapperRef}>
      <div 
        className={cn(
          "flex min-h-[48px] items-center justify-between gap-2 w-full bg-slate-50 dark:bg-[#11141D] border rounded-xl px-3 py-2 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-indigo-500/40",
          selectedBrawler ? "border-zinc-600" : "border-slate-200 dark:border-[#2A2A2A] hover:border-zinc-600"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedBrawler ? (
          <div className="flex items-center gap-2">
            <BrawlerArtwork name={selectedBrawler.name} iconUrl={selectedBrawler.iconUrl} imageUrl={selectedBrawler.imageUrl}
              className="h-6 w-6 flex-shrink-0 rounded" />
            <span className="text-sm text-slate-900 dark:text-white">{selectedBrawler.name}</span>
            {icon}
          </div>
        ) : (
          <span className="text-sm text-slate-500 dark:text-zinc-400 truncate">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-500 dark:text-zinc-500" />
      </div>

      {isOpen && (
        <div className="absolute z-[70] left-0 right-0 w-full min-w-[min(260px,80vw)] mt-2 bg-white dark:bg-[#161A26] border border-slate-200 dark:border-white/15 rounded-xl shadow-2xl max-h-[360px] flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-200 dark:border-[#2A2A2A] sticky top-0 bg-white dark:bg-[#1A1A1A] z-10 rounded-t-lg">
            <BrawlerFilterBar 
              filters={brawlerFilters} 
              compact 
              onKeyDown={handleKeyDown} 
              autoFocus={true}
            />
          </div>
          <div className="p-1 overflow-y-auto flex-1">
            {sortedBrawlers.length > 0 ? (
              sortedBrawlers.map(brawler => {
                const isDisabled = disabledBrawlers.includes(brawler.id);
                const disableReason = disabledReasons[brawler.id] || "Brawler Indisponível (Já Selecionado/Banido)";
                const isSuggested = suggestedBrawlers.includes(brawler.id) && !brawlerFilters.search && !brawlerFilters.tier && !brawlerFilters.brawlerClass && !brawlerFilters.rarity && brawlerFilters.sortOrder === 'none';
                return (
                  
                  <div
                    key={brawler.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors relative group/brawler",
                      isDisabled 
                        ? "opacity-40 cursor-not-allowed" 
                        : "hover:bg-indigo-500/15 hover:text-indigo-500 dark:hover:text-cyan-300 cursor-pointer text-slate-700 dark:text-zinc-300",
                      isSuggested && !isDisabled && "bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 hover:text-cyan-600"
                    )}
                    onClick={() => {
                      if (!isDisabled) {
                        onChange(brawler.id);
                        setIsOpen(false);
                      }
                    }}
                  >
                     <BrawlerArtwork name={brawler.name} iconUrl={brawler.iconUrl} imageUrl={brawler.imageUrl}
                       className="h-6 w-6 flex-shrink-0 rounded" />
                     <span className="flex-1">{brawler.name}</span>
                     {isSuggested && !isDisabled && (
                       <Lightbulb className="w-3.5 h-3.5 ml-auto text-cyan-300" />
                     )}
                     
                     {/* Tooltip Rich Flutuante */}
                     <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/brawler:opacity-100 group-hover/brawler:visible transition-all z-[60] font-medium pointer-events-none">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("w-2 h-2 rounded-full", getBrawlerBgColor(brawler))} />
                          <span className="font-bold">{brawler.name}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-600 mb-1">{brawler.brawlerClass} • {brawler.rarity}</div>
                        {isDisabled && (
                          <div className="mt-2 pt-2 border-t border-zinc-700 dark:border-zinc-300 text-red-500 font-bold flex items-center gap-1">
                            <Ban className="w-3 h-3" /> {disableReason}
                          </div>
                        )}
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45" />
                     </div>
                  </div>

                );
              })
            ) : (
              <div className="py-4 text-center text-sm text-slate-500 dark:text-zinc-400">
                Nenhum brawler encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
