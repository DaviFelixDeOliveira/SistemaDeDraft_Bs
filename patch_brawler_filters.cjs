const fs = require('fs');
let code = fs.readFileSync('src/components/BrawlerFilters.tsx', 'utf8');

const advancedFilterDesign = `
      {isExpanded && (
        <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 shadow-lg">
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Tier</label>
            <div className="flex flex-wrap gap-1.5">
              {['S', 'A', 'B', 'C', 'D'].map(t => (
                <button
                  key={t}
                  onClick={() => filters.setTier(filters.tier === t ? '' : t)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-xs font-bold transition-all border flex items-center justify-center",
                    filters.tier === t 
                      ? "bg-[#FFCC00] text-black border-[#FFCC00] shadow-[0_0_10px_rgba(255,204,0,0.3)]" 
                      : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-[#FFCC00]/50 hover:text-[#FFCC00]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Classe</label>
            <div className="flex flex-wrap gap-1.5">
              {['Algoz', 'Controle', 'Destruidor', 'Suporte', 'Tanque', 'Tiro Preciso', 'Artilharia'].map(c => (
                <button
                  key={c}
                  onClick={() => filters.setBrawlerClass(filters.brawlerClass === c ? '' : c)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    filters.brawlerClass === c 
                      ? "bg-blue-500 text-white border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                      : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-500/50 hover:text-blue-500"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Raridade</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: 'CaminhoTrof', label: 'C. Troféus', color: 'hover:border-blue-300 hover:text-blue-300', active: 'bg-blue-400 border-blue-400 text-white' },
                { name: 'Raro', label: 'Raro', color: 'hover:border-green-400 hover:text-green-400', active: 'bg-green-500 border-green-500 text-white' },
                { name: 'Super Raro', label: 'S. Raro', color: 'hover:border-blue-500 hover:text-blue-500', active: 'bg-blue-600 border-blue-600 text-white' },
                { name: 'Épico', label: 'Épico', color: 'hover:border-purple-400 hover:text-purple-400', active: 'bg-purple-500 border-purple-500 text-white' },
                { name: 'Mítico', label: 'Mítico', color: 'hover:border-red-400 hover:text-red-400', active: 'bg-red-500 border-red-500 text-white' },
                { name: 'Lendário', label: 'Lendário', color: 'hover:border-yellow-400 hover:text-yellow-400', active: 'bg-yellow-500 border-yellow-500 text-black' }
              ].map(r => (
                <button
                  key={r.name}
                  onClick={() => filters.setRarity(filters.rarity === r.name ? '' : r.name)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
                    filters.rarity === r.name 
                      ? r.active
                      : \`bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 \${r.color}\`
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-3 mt-1 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
             <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
               <button 
                 onClick={() => filters.setSortOrder('name_asc')}
                 className={cn("px-2 py-1 rounded-md text-xs font-medium transition-colors", filters.sortOrder === 'name_asc' ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
               >
                 A-Z
               </button>
               <button 
                 onClick={() => filters.setSortOrder('name_desc')}
                 className={cn("px-2 py-1 rounded-md text-xs font-medium transition-colors", filters.sortOrder === 'name_desc' ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
               >
                 Z-A
               </button>
               <button 
                 onClick={() => filters.setSortOrder('none')}
                 className={cn("px-2 py-1 rounded-md text-xs font-medium transition-colors", filters.sortOrder === 'none' ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
               >
                 Padrão
               </button>
             </div>
             
             {(filters.tier || filters.brawlerClass || filters.rarity || filters.sortOrder !== 'none') && (
               <button 
                 onClick={() => {
                  filters.setTier('');
                  filters.setBrawlerClass('');
                  filters.setRarity('');
                  filters.setSortOrder('none');
                }}
                className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                Limpar
              </button>
             )}
          </div>
        </div>
      )}
`;

code = code.replace(
  /\{isExpanded && \(\s*<div className="bg-zinc-50[\s\S]*?<\/div>\s*\)\}/,
  advancedFilterDesign
);

if(!code.includes('import { cn }')) {
  code = `import { cn } from '../lib/utils';\n` + code;
}

fs.writeFileSync('src/components/BrawlerFilters.tsx', code);
