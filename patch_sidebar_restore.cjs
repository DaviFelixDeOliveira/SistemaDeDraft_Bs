const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /"fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-\[#121212\] border-r border-zinc-200 dark:border-\[#2A2A2A\] h-screen flex flex-col transform transition-transform duration-300 ease-in-out shrink-0",\s*isOpen \? "translate-x-0" : "-translate-x-full md:translate-x-0"/,
  `"fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-[#121212] border-r border-zinc-200 dark:border-[#2A2A2A] h-screen flex flex-col transform transition-all duration-300 ease-in-out",
        isCollapsed ? "w-64 md:w-20" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"`
);

code = code.replace(
  /<div className="p-6 flex items-center justify-between">\s*<div className="flex items-center gap-3">\s*<div className="w-8 h-8 rounded bg-\[#FF3366\] flex items-center justify-center shadow-\[0_0_15px_rgba\(255,51,102,0\.4\)\] shrink-0">\s*<Swords className="w-5 h-5 text-white" \/>\s*<\/div>\s*<h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">\s*TBK <span className="text-\[#FFCC00\]">Hub<\/span>\s*<\/h1>\s*<\/div>\s*<button \s*onClick=\{onClose\} \s*className="md:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"\s*>\s*<PanelLeftClose className="w-6 h-6" \/>\s*<\/button>\s*<\/div>/,
  `<div className={cn("p-6 flex items-center", isCollapsed ? "md:px-0 md:justify-center justify-between" : "justify-between")}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#FF3366] flex items-center justify-center shadow-[0_0_15px_rgba(255,51,102,0.4)] shrink-0">
              <Swords className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight md:block">
                TBK <span className="text-[#FFCC00]">Hub</span>
              </h1>
            )}
            <h1 className={cn("text-xl font-bold text-zinc-900 dark:text-white tracking-tight hidden", isCollapsed ? "md:hidden" : "md:hidden")}>
              TBK <span className="text-[#FFCC00]">Hub</span>
            </h1>
          </div>
          <button 
            onClick={toggleCollapse} 
            className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            <PanelLeftClose className={cn("w-5 h-5 transition-transform", isCollapsed ? "rotate-180" : "")} />
          </button>
          <button 
            onClick={onClose} 
            className="md:hidden text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <PanelLeftClose className="w-6 h-6" />
          </button>
        </div>`
);

code = code.replace(
  /className=\{cn\("cursor-pointer touch-manipulation", \s*"w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",\s*isActive \s*\? "bg-\[#FF3366\]\/10 text-\[#FF3366\] shadow-\[inset_2px_0_0_0_#FF3366\]" \s*: "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800\/50"\s*\)\}/g,
  `title={isCollapsed ? item.label : undefined}
                className={cn("cursor-pointer touch-manipulation", 
                  "w-full flex items-center rounded-lg text-sm font-medium transition-all",
                  isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-3 md:gap-0 gap-3" : "gap-3 px-4 py-3",
                  isActive 
                    ? "bg-[#FF3366]/10 text-[#FF3366] shadow-[inset_2px_0_0_0_#FF3366]" 
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}`
);

code = code.replace(
  /<Icon className="w-5 h-5" \/>\s*\{item\.label\}/g,
  `<Icon className="w-5 h-5 shrink-0" />
                <span className={cn(isCollapsed ? "md:hidden" : "")}>{item.label}</span>`
);

code = code.replace(
  /<div className="flex items-center justify-between px-3 py-2\.5 bg-zinc-100 dark:bg-\[#1A1A1A\] rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400">/,
  `<div className={cn("flex items-center px-3 py-2.5 bg-zinc-100 dark:bg-[#1A1A1A] rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400", isCollapsed ? "md:justify-center justify-between" : "justify-between")}>`
);

code = code.replace(
  /<Shield className="w-4 h-4 text-\[#FF3366\]" \/>/,
  `<Shield className="w-4 h-4 text-[#FF3366] shrink-0" />`
);
code = code.replace(
  /<UserIcon className="w-4 h-4 text-blue-500" \/>/,
  `<UserIcon className="w-4 h-4 text-blue-500 shrink-0" />`
);

code = code.replace(
  /<span className="text-zinc-700 dark:text-zinc-300">Entrou como<\/span>/,
  `<span className={cn("text-zinc-700 dark:text-zinc-300", isCollapsed ? "md:hidden" : "")}>Entrou como</span>`
);

code = code.replace(
  /"px-2 py-0\.5 rounded-full text-\[10px\] uppercase font-black tracking-wider",/g,
  `"rounded-full text-[10px] uppercase font-black tracking-wider",`
);

code = code.replace(
  /userRole === 'admin' \? "bg-\[#FF3366\]\/10 text-\[#FF3366\] border border-\[#FF3366\]\/20" : "bg-blue-500\/10 text-blue-500 border border-blue-500\/20"\s*\)\}>/,
  `userRole === 'admin' ? "bg-[#FF3366]/10 text-[#FF3366] border border-[#FF3366]/20" : "bg-blue-500/10 text-blue-500 border border-blue-500/20",
              isCollapsed ? "md:hidden px-2 py-0.5" : "px-2 py-0.5"
            )}>`
);

code = code.replace(
  /\{userRole === 'admin' && \(\s*<div className="flex gap-2">/,
  `{userRole === 'admin' && (
            <div className={cn("flex", isCollapsed ? "md:flex-col gap-2" : "gap-2")}>`
);

code = code.replace(
  /title="Exportar backup completo em JSON"\s*>\s*<Download className="w-3\.5 h-3\.5" \/>\s*Backup\s*<\/button>/,
  `title="Exportar backup"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span>Backup</span>}
                <span className={cn("md:hidden", isCollapsed ? "" : "hidden")}>Backup</span>
              </button>`
);

code = code.replace(
  /title="Restaurar backup via arquivo JSON"\s*>\s*<Upload className="w-3\.5 h-3\.5" \/>\s*Restaurar\s*<\/button>/,
  `title="Restaurar backup"
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span>Restaurar</span>}
                <span className={cn("md:hidden", isCollapsed ? "" : "hidden")}>Restaurar</span>
              </button>`
);


code = code.replace(
  /<button\s*onClick=\{\(\) => setConfirmConfig\(\{\s*isOpen: true,\s*title: 'Sair do Sistema',\s*message: 'Deseja encerrar sua sessão no TBK Hub\?',\s*processingText: 'Saindo\.\.\.',\s*successText: '',\s*action: async \(\) => onLogout\(\)\s*\}\)\}\s*className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500\/10 transition-colors"\s*>\s*<LogOut className="w-4 h-4" \/>\s*Sair do Sistema\s*<\/button>/,
  `<button
            onClick={() => setConfirmConfig({
              isOpen: true,
              title: 'Sair do Sistema',
              message: 'Deseja encerrar sua sessão no TBK Hub?',
              processingText: 'Saindo...',
              successText: '',
              action: async () => onLogout()
            })}
            title={isCollapsed ? "Sair do Sistema" : undefined}
            className={cn("w-full flex items-center rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors", isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-2 gap-0" : "justify-center gap-2 px-4 py-2")}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={cn("whitespace-nowrap", isCollapsed ? "md:hidden ml-2" : "")}>Sair</span>
          </button>`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
