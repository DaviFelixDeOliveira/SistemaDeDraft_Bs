const fs = require('fs');
let code = fs.readFileSync('src/components/draft/StepPostMatch.tsx', 'utf8');

if (!code.includes('BrawlerSelectDropdown')) {
  code = code.replace(
    `import { Brawler, GameMap, Player } from '../../types';`,
    `import { Brawler, GameMap, Player } from '../../types';\nimport { BrawlerSelectDropdown } from '../ui/BrawlerSelectDropdown';`
  );
}

// For "brawlerOut" it's only tbkPicks (up to 3 items). Let's keep it as a simple select because it's only 3 items.
// But for "brawlerIn", we want BrawlerSelectDropdown.
code = code.replace(
`<select 
                         value={brawlerIn} 
                         onChange={(e) => setBrawlerIn(e.target.value)}
                         className="w-full bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-md pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-emerald-500"
                       >
                         <option value="">Selecionar...</option>
                          {brawlers.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                       </select>`,
`<BrawlerSelectDropdown 
                          placeholder="Selecionar brawler..." 
                          value={brawlerIn} 
                          onChange={(val) => setBrawlerIn(val)} 
                          disabledBrawlers={[...tbkPicks, ...enemyPicks]} 
                          allBrawlers={brawlers} 
                       />`
);

// Remove the icon div below brawlerIn
code = code.replace(
`<div className={cn("absolute left-2 top-1.5 w-6 h-6 rounded overflow-hidden pointer-events-none", brawlerOut ? getBrawlerBgColor(brawlers.find(b => b.id === brawlerOut) || {}) : "bg-slate-200 dark:bg-zinc-800")}>
                         {brawlerIn && brawlers.find(b => b.id === brawlerIn)?.iconUrl && (
                            <img src={brawlers.find(b => b.id === brawlerIn)?.imageUrl || brawlers.find(b => b.id === brawlerIn)?.iconUrl} className="w-full h-full object-cover" />
                         )}
                       </div>`,
``
);

fs.writeFileSync('src/components/draft/StepPostMatch.tsx', code);
