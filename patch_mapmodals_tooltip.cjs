const fs = require('fs');
let code = fs.readFileSync('src/components/maps/MapModals.tsx', 'utf8');

code = code.replace(
  /<span className=\{cn\(\s*"text-xs uppercase font-bold tracking-wider px-2 py-0\.5 rounded-full border",\s*map\.terrain === 'Aberto' \? 'bg-blue-500\/10 text-blue-600 border-blue-500\/20' :\s*map\.terrain === 'Fechado' \? 'bg-orange-500\/10 text-orange-600 border-orange-500\/20' :\s*'bg-emerald-500\/10 text-emerald-600 border-emerald-500\/20'\s*\)\}>\s*Terreno \{map\.terrain\}\s*<\/span>/,
  `<div className="relative group/terrain">
                <span className={cn(
                  "text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border cursor-help flex items-center gap-1",
                  map.terrain === 'Aberto' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                  map.terrain === 'Fechado' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                )}>
                  Terreno {map.terrain}
                  <Info className="w-3.5 h-3.5" />
                </span>
                <div className="absolute top-full left-0 mt-2 w-56 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] rounded-lg shadow-xl opacity-0 invisible group-hover/terrain:opacity-100 group-hover/terrain:visible transition-all z-20 font-medium pointer-events-none">
                  {map.terrain === 'Aberto' && 'Mapas abertos favorecem composições de longo alcance (Snipers) e controle de visão.'}
                  {map.terrain === 'Semi-Aberto' && 'Equilíbrio entre rotas de flanco e controle central. Requer composições versáteis.'}
                  {map.terrain === 'Fechado' && 'Mapas fechados favorecem tanques, assassinos e brawlers de alto dano a curta distância.'}
                  {map.terrain === 'Misto' && 'Zonas abertas e fechadas. Exige brawlers que dominem áreas específicas do mapa.'}
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-zinc-900 dark:bg-zinc-100 rotate-45" />
                </div>
              </div>`
);

fs.writeFileSync('src/components/maps/MapModals.tsx', code);
