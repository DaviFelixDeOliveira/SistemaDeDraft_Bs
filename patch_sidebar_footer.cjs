const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /<div className="flex items-center justify-between px-3 py-2\.5 bg-zinc-100 dark:bg-\[#1A1A1A\] rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400">[\s\S]*?Entrou como<\/span>\s*<\/div>\s*<span className=\{cn\(\s*"px-2 py-0\.5 rounded-full text-\[10px\] uppercase font-black tracking-wider",\s*userRole === 'admin' \? "bg-\[#FF3366\]\/10 text-\[#FF3366\] border border-\[#FF3366\]\/20" : "bg-blue-500\/10 text-blue-500 border border-blue-500\/20"\s*\)\}>\s*\{userRole === 'admin' \? 'Admin' : 'Player'\}\s*<\/span>\s*<\/div>/,
  `<div className={cn("flex items-center px-3 py-2.5 bg-zinc-100 dark:bg-[#1A1A1A] rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400", isCollapsed ? "md:justify-center justify-between" : "justify-between")}>
            <div className="flex items-center gap-2">
              {userRole === 'admin' ? (
                <Shield className="w-4 h-4 text-[#FF3366] shrink-0" />
              ) : (
                <UserIcon className="w-4 h-4 text-blue-500 shrink-0" />
              )}
              <span className={cn("text-zinc-700 dark:text-zinc-300", isCollapsed ? "md:hidden" : "")}>Entrou como</span>
            </div>
            <span className={cn(
              "rounded-full text-[10px] uppercase font-black tracking-wider",
              userRole === 'admin' ? "bg-[#FF3366]/10 text-[#FF3366] border border-[#FF3366]/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20",
              isCollapsed ? "md:hidden px-2 py-0.5" : "px-2 py-0.5"
            )}>
              {userRole === 'admin' ? 'Admin' : 'Player'}
            </span>
          </div>`
);

code = code.replace(
  /\{userRole === 'admin' && \(\s*<div className="flex gap-2">\s*<button \s*onClick=\{handleExportBackup\}\s*className="flex-1 flex items-center justify-center gap-1\.5 px-4 py-2 bg-zinc-100 dark:bg-\[#1A1A1A\] hover:bg-zinc-200 dark:hover:bg-\[#2A2A2A\] rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors"\s*title="Exportar backup completo em JSON"\s*>\s*<Download className="w-3\.5 h-3\.5" \/>\s*Backup\s*<\/button>\s*<button\s*onClick=\{\(\) => fileInputRef\.current\?\.click\(\)\}\s*className="flex-1 flex items-center justify-center gap-1\.5 px-4 py-2 bg-zinc-100 dark:bg-\[#1A1A1A\] hover:bg-zinc-200 dark:hover:bg-\[#2A2A2A\] rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors"\s*title="Restaurar backup via arquivo JSON"\s*>\s*<Upload className="w-3\.5 h-3\.5" \/>\s*Restaurar\s*<\/button>\s*<input\s*type="file"\s*ref=\{fileInputRef\}\s*className="hidden"\s*accept="\.json"\s*onChange=\{handleRestoreBackup\}\s*\/>\s*<\/div>\s*\)/,
  `{userRole === 'admin' && (
            <div className={cn("flex", isCollapsed ? "md:flex-col gap-2" : "gap-2")}>
              <button 
                onClick={handleExportBackup}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Exportar backup"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span>Backup</span>}
                <span className={cn("md:hidden", isCollapsed ? "" : "hidden")}>Backup</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-100 dark:bg-[#1A1A1A] hover:bg-zinc-200 dark:hover:bg-[#2A2A2A] rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Restaurar backup"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span>Restaurar</span>}
                <span className={cn("md:hidden", isCollapsed ? "" : "hidden")}>Restaurar</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleRestoreBackup}
              />
            </div>
          )}`
);

code = code.replace(
  /<button\s*onClick=\{\(\) => setConfirmConfig\(\{\s*isOpen: true,\s*title: 'Sair do Sistema',\s*message: 'Deseja encerrar sua sessão no TBK Hub\?',\s*processingText: 'Saindo\.\.\.',\s*successText: '',\s*action: async \(\) => onLogout\(\)\s*\}\)\}\s*className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 dark:text-zinc-400 hover:text-\[#FF3366\] hover:bg-\[#FF3366\]\/10 rounded-lg text-sm font-medium transition-colors"\s*>\s*<LogOut className="w-5 h-5" \/>\s*Sair\s*<\/button>/,
  `<button
            onClick={() => setConfirmConfig({
              isOpen: true,
              title: 'Sair do Sistema',
              message: 'Deseja encerrar sua sessão no TBK Hub?',
              processingText: 'Saindo...',
              successText: '',
              action: async () => onLogout()
            })}
            title="Sair do Sistema"
            className={cn("w-full flex items-center rounded-lg text-sm font-medium transition-colors hover:text-[#FF3366] hover:bg-[#FF3366]/10 text-zinc-500 dark:text-zinc-400", isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-3 gap-0" : "gap-3 px-4 py-3")}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Sair</span>}
            <span className={cn("md:hidden ml-3", isCollapsed ? "" : "hidden")}>Sair</span>
          </button>`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
