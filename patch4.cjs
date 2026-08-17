const fs = require('fs');
let code = fs.readFileSync('src/components/draft/StepPicks.tsx', 'utf8');

code = code.replace(
`import { GameMap, Player } from '../../types';`,
`import { GameMap, Player } from '../../types';\nimport { BrawlerFilterBar, useBrawlerFilters, applyBrawlerFilters } from '../BrawlerFilters';`
);

code = code.replace(
`export function StepPicks({ draftState, setDraftState, onNext, onPrev }: StepPicksProps) {
  const [search, setSearch] = useState('');`,
`export function StepPicks({ draftState, setDraftState, onNext, onPrev }: StepPicksProps) {
  const brawlerFilters = useBrawlerFilters();`
);

code = code.replace(
`  const filteredBrawlers = useMemo(() => {
    return brawlers.filter(b => fuzzySearch(search, b.name));
  }, [search, brawlers]);`,
`  const filteredBrawlers = useMemo(() => {
    return applyBrawlerFilters(brawlers, brawlerFilters);
  }, [brawlers, brawlerFilters.search, brawlerFilters.tier, brawlerFilters.brawlerClass, brawlerFilters.rarity, brawlerFilters.sortOrder]);`
);

code = code.replace(
`        handleSelectBrawler(firstAvailable);
        setSearch('');`,
`        handleSelectBrawler(firstAvailable);
        brawlerFilters.setSearch('');
        brawlerFilters.setTier('');
        brawlerFilters.setBrawlerClass('');
        brawlerFilters.setRarity('');
        brawlerFilters.setSortOrder('none');`
);

code = code.replace(
`             <div className="relative z-10">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar brawler..."
                  className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
             </div>`,
`             <div className="relative z-10">
                <BrawlerFilterBar 
                  filters={brawlerFilters} 
                  onKeyDown={handleKeyDown} 
                />
             </div>`
);

fs.writeFileSync('src/components/draft/StepPicks.tsx', code);
