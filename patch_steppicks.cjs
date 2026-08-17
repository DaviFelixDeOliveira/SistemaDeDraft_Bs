const fs = require('fs');
let code = fs.readFileSync('src/components/draft/StepPicks.tsx', 'utf8');

code = code.replace(
  /<button onClick=\{handleUndoPick\} className="text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white underline">\s*Desfazer último pick\s*<\/button>/g,
  `<button onClick={handleUndoPick} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 mt-4 shadow-sm">
                 <Undo2 className="w-4 h-4" /> Desfazer último pick
               </button>`
);

code = code.replace(
  /<button\s*onClick=\{handleUndoPick\}\s*className="text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white underline mb-8"\s*>\s*Desfazer último pick\s*<\/button>/g,
  `<button onClick={handleUndoPick} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 mb-8 mx-auto shadow-sm">
            <Undo2 className="w-4 h-4" /> Desfazer último pick
          </button>`
);

if (!code.includes('Undo2')) {
  code = code.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Undo2 } from 'lucide-react';");
} else if (code.includes('import {') && !code.match(/Undo2/)) {
    code = code.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Undo2 } from 'lucide-react';");
}

fs.writeFileSync('src/components/draft/StepPicks.tsx', code);
