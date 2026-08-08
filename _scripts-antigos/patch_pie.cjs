const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/Dashboard.tsx', 'utf8');

content = content.replace(
  'const [bansSortOrder, setBansSortOrder] = useState<\'picks\' | \'bans\'>(\'bans\');',
  'const [bansSortOrder, setBansSortOrder] = useState<\'picks\' | \'bans\'>(\'bans\');\n  const [hoveredMode, setHoveredMode] = useState<any>(null);'
);

const centerPieRegex = /<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">[\s\S]*?<\/div>/;

const newCenterPie = `<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-3xl font-black text-slate-900 dark:text-white">
                 {hoveredMode ? \`\${hoveredMode.winrate}%\` : \`\${stats.winrate}%\`}
               </span>
               <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-500 tracking-wider text-center max-w-[80px]">
                 {hoveredMode ? hoveredMode.name : 'Geral'}
               </span>
            </div>`;

content = content.replace(centerPieRegex, newCenterPie);

const pieRegex = /<Pie[\s\S]*?>/;
const newPie = `<Pie
                  data={modeWinrate}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  onMouseEnter={(_, index) => setHoveredMode(modeWinrate[index])}
                  onMouseLeave={() => setHoveredMode(null)}
                  onClick={(_, index) => setHoveredMode(modeWinrate[index])}
                >`;
                
content = content.replace(pieRegex, newPie);

fs.writeFileSync('src/components/dashboard/Dashboard.tsx', content);
