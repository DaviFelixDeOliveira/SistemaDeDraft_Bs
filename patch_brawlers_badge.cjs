const fs = require('fs');
let code = fs.readFileSync('src/components/brawlers/BrawlersHub.tsx', 'utf8');

code = code.replace(
  /<div className="flex items-center gap-2 bg-white dark:bg-\[#1A1A1A\] border border-zinc-200 dark:border-\[#2A2A2A\] rounded-full px-3 py-1 shadow-sm">\s*<div className="w-1\.5 h-1\.5 rounded-full bg-emerald-500 animate-pulse" \/>\s*<span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">\s*\{brawlers\.length\} Brawlers Disponíveis\s*<\/span>\s*<\/div>/,
  `<div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3.5 py-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {brawlers.length} Brawlers Disponíveis
              </span>
            </div>`
);

fs.writeFileSync('src/components/brawlers/BrawlersHub.tsx', code);
