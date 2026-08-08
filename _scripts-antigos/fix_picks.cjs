const fs = require('fs');

let content = fs.readFileSync('src/components/draft/StepPicks.tsx', 'utf8');

// Ensure import includes getBrawlerClassIcon
content = content.replace(
  "import { cn, getBrawlerBgColor } from '../../lib/utils';", 
  "import { cn, getBrawlerBgColor, getBrawlerClassIcon } from '../../lib/utils';"
);

// Add icons to tbk picks
content = content.replace(
  /<span key=\{i\} className="text-\[10px\] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-1\.5 py-0\.5 rounded font-medium">\{t\}<\/span>/g,
  `<span key={i} className="text-[10px] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">{getBrawlerClassIcon(t, "w-3 h-3")}{t}</span>`
);

fs.writeFileSync('src/components/draft/StepPicks.tsx', content);
