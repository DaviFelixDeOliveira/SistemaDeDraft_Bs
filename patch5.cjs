const fs = require('fs');
let code = fs.readFileSync('src/components/players/PlayerModals.tsx', 'utf8');

code = code.replace(
`import { Brawler, Player, MatchPick, Match } from '../../types';`,
`import { Brawler, Player, MatchPick, Match } from '../../types';\nimport { BrawlerFilterBar, useBrawlerFilters, applyBrawlerFilters } from '../BrawlerFilters';`
);

code = code.replace(
`  const [brawlers, setBrawlers] = useState<Brawler[]>([]);`,
`  const [brawlers, setBrawlers] = useState<Brawler[]>([]);
  const brawlerFilters = useBrawlerFilters();`
);

code = code.replace(
`  const [brawlerSearch, setBrawlerSearch] = useState('');
    
  const filteredComfortBrawlers = brawlers.filter(b => 
    brawlerSearch ? b.name.toLowerCase().includes(brawlerSearch.toLowerCase()) : (b.tier === 'S' || b.tier === 'A' || b.tier === 'B')
  ).slice(0, 24);`,
`  const filteredComfortBrawlers = applyBrawlerFilters(brawlers, brawlerFilters).slice(0, 24);`
);

code = code.replace(
`              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Buscar brawler (pressione Enter p/ adicionar)..."
                  value={brawlerSearch}
                  onChange={(e) => setBrawlerSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredComfortBrawlers.length > 0) {
                        const target = filteredComfortBrawlers[0];
                        toggleBrawler(target.id);
                        setBrawlerSearch('');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#2A2A2A] rounded-lg focus:outline-none focus:border-[#FF3366] text-zinc-900 dark:text-white"
                />
              </div>`,
`              <div className="mb-2">
                <BrawlerFilterBar 
                  filters={brawlerFilters} 
                  compact
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredComfortBrawlers.length > 0) {
                        const target = filteredComfortBrawlers[0];
                        toggleBrawler(target.id);
                      }
                    }
                  }}
                />
              </div>`
);

fs.writeFileSync('src/components/players/PlayerModals.tsx', code);
