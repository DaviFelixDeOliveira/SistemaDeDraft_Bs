const fs = require('fs');
let code = fs.readFileSync('src/components/players/PlayersHub.tsx', 'utf8');

code = code.replace(
`                  <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingPlayer(player); }}
                      className="text-zinc-400 hover:text-blue-500 transition-colors p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm" 
                      title="Editar Jogador"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => togglePlayerStatus(player.id, e)}
                      className="text-zinc-400 hover:text-amber-500 transition-colors p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm" 
                      title={player.isActive !== false ? "Arquivar Jogador" : "Desarquivar Jogador"}
                    >
                      {player.isActive !== false ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id, player.nickname); }}
                      className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm" 
                      title="Excluir Jogador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>`,
`                  <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingPlayer(player); }}
                      className="text-zinc-400 hover:text-blue-500 transition-colors p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm" 
                      title="Editar Jogador"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id, player.nickname); }}
                      className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm" 
                      title="Excluir Jogador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>`
);

code = code.replace(
`<div className="flex flex-col gap-1 pr-24">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">{player.nickname}</h3>`,
`<div className="flex flex-col gap-1 pr-16">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">{player.nickname}</h3>
                    {!isPlayerMode && (
                      <button 
                        onClick={(e) => togglePlayerStatus(player.id, e)}
                        className="text-zinc-400 hover:text-amber-500 transition-colors p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-sm" 
                        title={player.isActive !== false ? "Arquivar Jogador" : "Desarquivar Jogador"}
                      >
                        {player.isActive !== false ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>`
);

fs.writeFileSync('src/components/players/PlayersHub.tsx', code);
