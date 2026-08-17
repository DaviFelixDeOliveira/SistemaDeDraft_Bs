const fs = require('fs');
let code = fs.readFileSync('src/components/draft/StepPicks.tsx', 'utf8');

code = code.replace(
`<div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar brawler..."
                  className="w-full bg-slate-50 dark:bg-[#0A0A0A] border border-slate-200 dark:border-[#2A2A2A] rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
             </div>`,
`<div className="relative w-64 z-10">
                <BrawlerFilterBar 
                  filters={brawlerFilters} 
                  compact 
                  onKeyDown={handleKeyDown} 
                />
             </div>`
);

fs.writeFileSync('src/components/draft/StepPicks.tsx', code);
