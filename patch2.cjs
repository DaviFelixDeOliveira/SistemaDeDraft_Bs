const fs = require('fs');
let code = fs.readFileSync('src/components/BrawlerFilters.tsx', 'utf8');

code = code.replace(
`export function BrawlerFilterBar({ filters, compact = false }: { filters: BrawlerFiltersState, compact?: boolean }) {`,
`export function BrawlerFilterBar({ filters, compact = false, onKeyDown }: { filters: BrawlerFiltersState, compact?: boolean, onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void }) {`
);

code = code.replace(
`className="w-full bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366] transition-colors"
          />`,
`className="w-full bg-zinc-50 dark:bg-[#0A0A0A] border border-zinc-200 dark:border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366] transition-colors"
            onKeyDown={onKeyDown}
          />`
);
fs.writeFileSync('src/components/BrawlerFilters.tsx', code);
