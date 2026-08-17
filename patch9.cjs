const fs = require('fs');
let code = fs.readFileSync('src/components/brawlers/BrawlersHub.tsx', 'utf8');

const target1 = `<span className="text-xs font-bold bg-[#FF3366]/10 text-[#FF3366] border border-[#FF3366]/20 px-3 py-1 rounded-full">
              {brawlers.length} Brawlers Cadastrados
            </span>`;
            
const rep1 = `<div className="flex items-center gap-2 bg-white dark:bg-[#1A1A1A] border border-zinc-200 dark:border-[#2A2A2A] rounded-full px-3 py-1 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {brawlers.length} Brawlers Disponíveis
              </span>
            </div>`;

code = code.replace(target1, rep1);

fs.writeFileSync('src/components/brawlers/BrawlersHub.tsx', code);
