const fs = require('fs');
let code = fs.readFileSync('src/components/draft/StepMapAndBans.tsx', 'utf8');

if (!code.includes('BrawlerFilterBar')) {
  code = code.replace(
    `import { computeBanScore, EnemyPickStatsMap } from '../../lib/draftEngineUtils';`,
    `import { computeBanScore, EnemyPickStatsMap } from '../../lib/draftEngineUtils';\nimport { BrawlerFilterBar, useBrawlerFilters, applyBrawlerFilters } from '../BrawlerFilters';`
  );
}

code = code.replace(
`function BrawlerBanSelect({ placeholder, value, onChange, disabledBrawlers, suggestedBrawlers = [], allBrawlers }: BrawlerBanSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');`,
`function BrawlerBanSelect({ placeholder, value, onChange, disabledBrawlers, suggestedBrawlers = [], allBrawlers }: BrawlerBanSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const brawlerFilters = useBrawlerFilters();`
);

code = code.replace(
`const selectedBrawler = value ? allBrawlers.find(b => b.id === value) : null;
  const filteredBrawlers = allBrawlers.filter(b => fuzzySearch(search, b.name));

  const sortedBrawlers = useMemo(() => {
    if (!search) {`,
`const selectedBrawler = value ? allBrawlers.find(b => b.id === value) : null;
  const filteredBrawlers = applyBrawlerFilters(allBrawlers, brawlerFilters);

  const sortedBrawlers = useMemo(() => {
    if (!brawlerFilters.search && !brawlerFilters.tier && !brawlerFilters.brawlerClass && !brawlerFilters.rarity && brawlerFilters.sortOrder === 'none') {`
);

code = code.replace(
`    return filteredBrawlers;
  }, [allBrawlers, filteredBrawlers, search, suggestedBrawlers]);`,
`    return filteredBrawlers;
  }, [allBrawlers, filteredBrawlers, brawlerFilters.search, brawlerFilters.tier, brawlerFilters.brawlerClass, brawlerFilters.rarity, brawlerFilters.sortOrder, suggestedBrawlers]);`
);

code = code.replace(
`        onChange(firstAvailable.id);
        setIsOpen(false);
        setSearch('');`,
`        onChange(firstAvailable.id);
        setIsOpen(false);
        brawlerFilters.setSearch('');
        brawlerFilters.setTier('');
        brawlerFilters.setBrawlerClass('');
        brawlerFilters.setRarity('');
        brawlerFilters.setSortOrder('none');`
);

code = code.replace(
`<div className="p-2 border-b border-slate-200 dark:border-[#2A2A2A] sticky top-0 bg-white dark:bg-[#1A1A1A] z-10 rounded-t-lg">
            <input
              type="text"
              placeholder="Buscar brawler..."
              className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded pl-3 pr-2 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          </div>`,
`<div className="p-2 border-b border-slate-200 dark:border-[#2A2A2A] sticky top-0 bg-white dark:bg-[#1A1A1A] z-10 rounded-t-lg">
            <BrawlerFilterBar 
              filters={brawlerFilters} 
              compact 
              onKeyDown={handleKeyDown} 
            />
          </div>`
);

code = code.replace(
`const isSuggested = suggestedBrawlers.includes(brawler.id) && !search;`,
`const isSuggested = suggestedBrawlers.includes(brawler.id) && !brawlerFilters.search && !brawlerFilters.tier && !brawlerFilters.brawlerClass && !brawlerFilters.rarity && brawlerFilters.sortOrder === 'none';`
);

fs.writeFileSync('src/components/draft/StepMapAndBans.tsx', code);
