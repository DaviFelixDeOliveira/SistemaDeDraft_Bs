const fs = require('fs');
let code = fs.readFileSync('src/components/brawlers/BrawlersHub.tsx', 'utf8');

const target1 = `                       {/* C) Card 2: Desempenho, Picks e Winrate */}
                       <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl p-5 shadow-sm flex flex-col gap-5">
                          <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                             <Activity className="w-5 h-5 text-emerald-500" /> Desempenho e Picks
                          </h4>
                             
                          <div>
                             <div className="flex justify-between text-sm mb-1.5">
                                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Winrate Geral</span>
                                <span className="font-black text-emerald-500">{brawlerStatsDetail?.tbkPicksCount > 0 ? \`\${brawlerStatsDetail.winrate}%\` : '0%'}</span>
                             </div>
                             <div className="w-full h-2 bg-zinc-100 dark:bg-[#1A1A1A] rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full relative" style={{ width: \`\${brawlerStatsDetail?.tbkPicksCount > 0 ? brawlerStatsDetail.winrate : 0}%\` }}>
                                   <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 blur-[2px] rounded-full animate-pulse" />
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div className="flex flex-col gap-3">
                                <div className="bg-zinc-50 dark:bg-[#1A1A1A] p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50 flex flex-col justify-center flex-1">
                                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Picks (TBK vs Inimigos)</span>
                                   <div className="flex items-end gap-2">
                                      <span className="text-2xl font-black text-blue-500">{brawlerStatsDetail?.tbkPicksCount || 0}</span>
                                      <span className="text-sm font-bold text-zinc-500 mb-1">vs</span>
                                      <span className="text-2xl font-black text-red-500">{brawlerStatsDetail?.enemyPicksCount || 0}</span>
                                   </div>
                                </div>
                             </div>
                                
                             <div className="bg-zinc-50 dark:bg-[#1A1A1A] p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Comfort Picks (Atletas)</span>
                                <div className="space-y-2">
                                   {brawlerStatsDetail?.comfortStats && brawlerStatsDetail.comfortStats.length > 0 ? (
                                      brawlerStatsDetail.comfortStats.map((cs: any, idx: number) => (
                                         <div key={idx} className="flex items-center gap-2 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">{idx + 1}</div>
                                            <span className="text-zinc-700 dark:text-zinc-300 font-medium flex-1">{cs.playerName}</span>
                                            <span className="font-bold text-emerald-500">{cs.winrate}% WR ({cs.matches})</span>
                                         </div>
                                      ))
                                   ) : (
                                      <span className="text-xs text-zinc-500 italic">Sem partidas com atletas ainda</span>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>`;

const rep1 = `                       {/* C) Card 2: Desempenho, Picks e Winrate */}
                       <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-xl p-6 shadow-sm flex flex-col gap-6">
                          <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                             <Activity className="w-5 h-5 text-emerald-500" /> Desempenho Global
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {/* Stats Column */}
                             <div className="flex flex-col justify-between">
                                {/* Winrate Geral */}
                                <div className="mb-4">
                                   <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Winrate Geral</span>
                                      <span className="text-2xl font-black text-zinc-900 dark:text-white">
                                         {brawlerStatsDetail?.tbkPicksCount > 0 ? \`\${brawlerStatsDetail.winrate}%\` : '0%'}
                                      </span>
                                   </div>
                                   <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: \`\${brawlerStatsDetail?.tbkPicksCount > 0 ? brawlerStatsDetail.winrate : 0}%\` }} />
                                   </div>
                                </div>

                                {/* Picks TBK vs Inimigos */}
                                <div className="flex items-center justify-between py-3 border-t border-zinc-100 dark:border-zinc-800/60">
                                   <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Picks da Equipe</span>
                                   <span className="text-xl font-bold text-zinc-900 dark:text-white">{brawlerStatsDetail?.tbkPicksCount || 0}</span>
                                </div>
                                <div className="flex items-center justify-between py-3 border-t border-zinc-100 dark:border-zinc-800/60">
                                   <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Picks Inimigos</span>
                                   <span className="text-xl font-bold text-zinc-900 dark:text-white">{brawlerStatsDetail?.enemyPicksCount || 0}</span>
                                </div>
                             </div>

                             {/* Comfort Picks Column */}
                             <div className="bg-zinc-50 dark:bg-[#1A1A1A] p-4 rounded-xl border border-zinc-200 dark:border-[#2A2A2A]">
                                <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Atletas de Conforto</h5>
                                <div className="space-y-3">
                                   {brawlerStatsDetail?.comfortStats && brawlerStatsDetail.comfortStats.length > 0 ? (
                                      brawlerStatsDetail.comfortStats.map((cs, idx) => (
                                         <div key={idx} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-3">
                                              <div className="w-6 h-6 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300 shadow-sm">{idx + 1}</div>
                                              <span className="text-zinc-900 dark:text-white font-medium">{cs.playerName}</span>
                                            </div>
                                            <div className="text-right flex flex-col">
                                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{cs.winrate}% WR</span>
                                              <span className="text-[10px] text-zinc-500">{cs.matches} {cs.matches === 1 ? 'partida' : 'partidas'}</span>
                                            </div>
                                         </div>
                                      ))
                                   ) : (
                                      <span className="text-sm text-zinc-500 italic block mt-4 text-center">Nenhum atleta listou como conforto.</span>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>`;

code = code.replace(target1, rep1);

fs.writeFileSync('src/components/brawlers/BrawlersHub.tsx', code);
