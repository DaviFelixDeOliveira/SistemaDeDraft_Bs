import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Lightbulb, Ban } from 'lucide-react';
import { Brawler } from '../../types';
import { cn, getBrawlerBgColor } from '../../lib/utils';
import { BrawlerFilterBar, useBrawlerFilters, applyBrawlerFilters } from '../BrawlerFilters';

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
    <div className="relative" ref={wrapperRef}>
      <div 
        className={cn(
          "flex items-center justify-between w-full bg-slate-50 dark:bg-[#0A0A0A] border rounded-lg px-3 py-2 cursor-pointer transition-colors",
          selectedBrawler ? "border-zinc-600" : "border-slate-200 dark:border-[#2A2A2A] hover:border-zinc-600"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedBrawler ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {selectedBrawler.iconUrl ? (
                <img src={selectedBrawler.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-zinc-500">IMG</span>
              )}
            </div>
            <span className="text-sm text-slate-900 dark:text-white">{selectedBrawler.name}</span>
            {icon}
          </div>
        ) : (
          <span className="text-sm text-zinc-600">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-500 dark:text-zinc-500" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-[300px] mt-1 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-lg shadow-xl max-h-80 flex flex-col">
          <div className="p-2 border-b border-slate-200 dark:border-[#2A2A2A] sticky top-0 bg-white dark:bg-[#1A1A1A] z-10 rounded-t-lg">
            <BrawlerFilterBar 
              filters={brawlerFilters} 
              compact 
              onKeyDown={handleKeyDown} 
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
                        : "hover:bg-[#FF3366]/20 hover:text-[#FF3366] cursor-pointer text-slate-700 dark:text-zinc-300",
                      isSuggested && !isDisabled && "bg-[#FFCC00]/10 border border-[#FFCC00]/30 text-[#FFCC00] hover:text-[#FFCC00]"
                    )}
                    onClick={() => {
                      if (!isDisabled) {
                        onChange(brawler.id);
                        setIsOpen(false);
                      }
                    }}
                  >
                     <div className={cn("w-6 h-6 rounded flex-shrink-0 overflow-hidden relative", getBrawlerBgColor(brawler))}>
                       {brawler.iconUrl && <img src={brawler.iconUrl} alt="" className="w-full h-full object-cover" />}
                       <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: getBrawlerBgColor(brawler).replace('bg-', '').replace('border-', '') }} />
                     </div>
                     <span className="flex-1">{brawler.name}</span>
                     {isSuggested && !isDisabled && (
                       <Lightbulb className="w-3.5 h-3.5 ml-auto text-[#FFCC00]" />
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
