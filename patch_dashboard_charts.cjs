const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/Dashboard.tsx', 'utf8');

const customChartTooltip = `
  const CustomBrawlerTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white shadow-xl min-w-[150px]">
          <p className="font-bold mb-2 border-b border-[#2A2A2A] pb-2 text-sm">{label || data.name}</p>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-zinc-400">Picks (Nós)</span>
              </span>
              <span className="font-bold text-blue-500">{data.tbkPickCount}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-zinc-400">Bans (Geral)</span>
              </span>
              <span className="font-bold text-red-500">{data.ban}</span>
            </div>
            <div className="flex justify-between items-center gap-4 mt-1 border-t border-[#2A2A2A] pt-1">
              <span className="text-zinc-400 text-xs">Winrate (Nós)</span>
              <span className={cn("font-bold text-xs", data.winrate >= 50 ? "text-emerald-500" : "text-red-500")}>{data.winrate}%</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-zinc-400 text-xs">Vitórias / Derrotas</span>
              <span className="font-bold text-xs"><span className="text-emerald-500">{data.tbkWins}V</span> - <span className="text-red-500">{data.tbkLosses}D</span></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
`;

code = code.replace(
  /const CustomXAxisTick = \(props: any\) => \{/,
  customChartTooltip + '\n  const CustomXAxisTick = (props: any) => {'
);

code = code.replace(
  /<BarChart data=\{\(brawlerStats \|\| \[\]\)\.slice\(0, 5\)\}/,
  `<BarChart data={(brawlerStats || []).slice().sort((a,b) => (b.tbkPickCount || 0) - (a.tbkPickCount || 0)).slice(0, 5)}`
);

code = code.replace(
  /<RechartsTooltip content=\{<CustomTooltip \/>\} \/>/,
  `<RechartsTooltip content={<CustomBrawlerTooltip />} cursor={{fill: 'transparent'}} />`
);

code = code.replace(
  /<Bar dataKey="pick" name="Picks" fill="#3B82F6" radius=\{\[4, 4, 0, 0\]\} \/>/,
  `<Bar dataKey="tbkPickCount" name="Nossos Picks" fill="#3B82F6" radius={[4, 4, 0, 0]} />`
);

code = code.replace(
  /<span className="text-\[10px\] text-slate-500 font-bold">\{b\.tbkPickCount \|\| b\.pick\} picks<\/span>/,
  `<div className="flex flex-col items-center mt-1 text-[10px] text-slate-500 font-bold leading-none gap-0.5">
                        <span><span className="text-blue-500">{b.tbkPickCount || 0}</span> picks nossos</span>
                        <span><span className="text-red-500">{b.enemyPickCount || 0}</span> picks ini.</span>
                      </div>`
);

// We need to also add an import for CustomTooltip if we replaced it? No, CustomTooltip was imported.

fs.writeFileSync('src/components/dashboard/Dashboard.tsx', code);
