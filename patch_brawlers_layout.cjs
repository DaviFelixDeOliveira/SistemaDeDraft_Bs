const fs = require('fs');
let code = fs.readFileSync('src/components/brawlers/BrawlersHub.tsx', 'utf8');

code = code.replace(
  /<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">\s*<div className="flex flex-col gap-3">\s*<div className="bg-zinc-50 dark:bg-\[#1A1A1A\] p-3 rounded-xl border border-zinc-100 dark:border-zinc-800\/50 flex flex-col justify-center flex-1">[\s\S]*?<\/div>\s*<\/div>\s*<div className="bg-zinc-50 dark:bg-\[#1A1A1A\] p-3 rounded-xl border border-zinc-100 dark:border-zinc-800\/50">\s*<span className="text-\[10px\] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Comfort Picks \(Atletas\)<\/span>\s*<div className="space-y-2">\s*\{brawlerStatsDetail\?\.comfortStats && brawlerStatsDetail\.comfortStats\.length > 0 \? \([\s\S]*?\) : \(\s*<span className="text-xs text-zinc-500 italic">Sem partidas com atletas ainda<\/span>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/div>/,
  `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Picks (TBK vs Inimigos)</span>
                                <div className="flex items-end gap-3">
                                   <div className="flex flex-col">
                                      <span className="text-3xl font-black text-blue-500 leading-none">{brawlerStatsDetail?.tbkPicksCount || 0}</span>
                                      <span className="text-[10px] text-zinc-500 font-semibold mt-1">TBK</span>
                                   </div>
                                   <span className="text-xl font-black text-zinc-300 dark:text-zinc-700 leading-none mb-4">/</span>
                                   <div className="flex flex-col">
                                      <span className="text-3xl font-black text-red-500 leading-none">{brawlerStatsDetail?.enemyPicksCount || 0}</span>
                                      <span className="text-[10px] text-zinc-500 font-semibold mt-1">Inimigos</span>
                                   </div>
                                </div>
                             </div>
                              
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Comfort Picks (Atletas)</span>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                   {brawlerStatsDetail?.comfortStats && brawlerStatsDetail.comfortStats.length > 0 ? (
                                      brawlerStatsDetail.comfortStats.map((cs: any, idx: number) => (
                                         <div key={idx} className="flex items-center gap-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                                            <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-[10px]">{idx + 1}</div>
                                            <span className="text-zinc-700 dark:text-zinc-300 font-semibold flex-1 truncate">{cs.playerName}</span>
                                            <div className="flex flex-col items-end">
                                              <span className="font-black text-emerald-500 text-xs">{cs.winrate}% WR</span>
                                              <span className="text-[10px] text-zinc-500 font-medium">{cs.matches} {cs.matches === 1 ? 'partida' : 'partidas'}</span>
                                            </div>
                                         </div>
                                      ))
                                   ) : (
                                      <span className="text-xs text-zinc-500 italic">Nenhum atleta marcou como conforto.</span>
                                   )}
                                </div>
                             </div>
                          </div>`
);

fs.writeFileSync('src/components/brawlers/BrawlersHub.tsx', code);
