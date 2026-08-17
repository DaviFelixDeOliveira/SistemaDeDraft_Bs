const fs = require('fs');
let code = fs.readFileSync('src/components/ui/BrawlerSelectDropdown.tsx', 'utf8');

code = code.replace(
  /interface BrawlerSelectDropdownProps \{/,
  `interface BrawlerSelectDropdownProps {\n  disabledReasons?: Record<string, string>;`
);

code = code.replace(
  /export function BrawlerSelectDropdown\(\{ placeholder, value, onChange, disabledBrawlers, suggestedBrawlers = \[\], allBrawlers, icon \}: BrawlerSelectDropdownProps\) \{/,
  `export function BrawlerSelectDropdown({ placeholder, value, onChange, disabledBrawlers, disabledReasons = {}, suggestedBrawlers = [], allBrawlers, icon }: BrawlerSelectDropdownProps) {`
);

code = code.replace(
  /const isDisabled = disabledBrawlers\.includes\(brawler\.id\);/,
  `const isDisabled = disabledBrawlers.includes(brawler.id);\n                const disableReason = disabledReasons[brawler.id] || "Brawler Indisponível (Já Selecionado/Banido)";`
);

// Add group-hover relative logic to the rendered brawler row to show tooltip
// Wait, I need to add rarity color too. "cores de raridade" 

const brawlerRender = `
                  <div
                    key={brawler.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors relative group/brawler",
                      isDisabled 
                        ? "opacity-40 cursor-not-allowed" 
                        : "hover:bg-[#FF3366]/20 hover:text-[#FF3366] cursor-pointer text-slate-700 dark:text-zinc-300",
                      isSuggested && !isDisabled && "bg-[#FFCC00]/10 border border-[#FFCC00]/30 text-[#FFCC00] hover:text-[#FFCC00]"
                    )}
                    onClick={() => {
                      if (!isDisabled) {
                        onChange(brawler.id);
                        setIsOpen(false);
                      }
                    }}
                  >
                     <div className={cn("w-6 h-6 rounded flex-shrink-0 overflow-hidden relative", getBrawlerBgColor(brawler))}>
                       {brawler.iconUrl && <img src={brawler.iconUrl} alt="" className="w-full h-full object-cover" />}
                       <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: getBrawlerBgColor(brawler).replace('bg-', '').replace('border-', '') }} />
                     </div>
                     <span className="flex-1">{brawler.name}</span>
                     {isSuggested && !isDisabled && (
                       <Lightbulb className="w-3.5 h-3.5 ml-auto text-[#FFCC00]" />
                     )}
                     
                     {/* Tooltip Rich Flutuante */}
                     <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover/brawler:opacity-100 group-hover/brawler:visible transition-all z-[60] font-medium pointer-events-none">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("w-2 h-2 rounded-full", getBrawlerBgColor(brawler))} />
                          <span className="font-bold">{brawler.name}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-600 mb-1">{brawler.brawlerClass} • {brawler.rarity}</div>
                        {isDisabled && (
                          <div className="mt-2 pt-2 border-t border-zinc-700 dark:border-zinc-300 text-red-500 font-bold flex items-center gap-1">
                            <Ban className="w-3 h-3" /> {disableReason}
                          </div>
                        )}
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45" />
                     </div>
                  </div>
`;

code = code.replace(
  /<div\s*key=\{brawler\.id\}[\s\S]*?<\/div>\s*\);\s*\}\)\s*\) : \(/,
  brawlerRender + `\n                );\n              })\n            ) : (`
);

if(!code.includes('Ban')) {
   code = code.replace(/import \{ ChevronDown, Search, Lightbulb \} from 'lucide-react';/, `import { ChevronDown, Search, Lightbulb, Ban } from 'lucide-react';`);
}

fs.writeFileSync('src/components/ui/BrawlerSelectDropdown.tsx', code);
