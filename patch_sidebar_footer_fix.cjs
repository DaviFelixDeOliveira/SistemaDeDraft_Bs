const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Fix the "Sair do Sistema" button
code = code.replace(
  /<button \s*onClick=\{onLogout\}\s*className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500\/10 transition-colors"\s*>\s*<LogOut className="w-4 h-4" \/>\s*Sair do Sistema\s*<\/button>/,
  `<button 
            onClick={onLogout}
            title={isCollapsed ? "Sair do Sistema" : undefined}
            className={cn("w-full flex items-center rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors", isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-2 gap-0" : "justify-center gap-2 px-4 py-2")}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Sair do Sistema</span>}
            <span className={cn("md:hidden", isCollapsed ? "ml-2" : "hidden")}>Sair do Sistema</span>
          </button>`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
