const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /"fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-\[#121212\] border-r border-zinc-200 dark:border-\[#2A2A2A\] h-screen flex flex-col transform transition-all duration-300 ease-in-out"/,
  `"fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-[#121212] border-r border-zinc-200 dark:border-[#2A2A2A] h-screen flex flex-col transform transition-all duration-300 ease-in-out shrink-0"`
);

// Completely rewrite the logout button to be perfectly clean
code = code.replace(
  /<button[\s\S]*?onClick=\{onLogout\}[\s\S]*?Sair do Sistema\s*<\/span>\s*<\/button>/,
  `<button 
            onClick={onLogout}
            title={isCollapsed ? "Sair do Sistema" : undefined}
            className={cn("w-full flex items-center rounded-xl text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors", isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-3 gap-0" : "justify-center gap-2 px-4 py-3")}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={cn("whitespace-nowrap", isCollapsed ? "md:hidden ml-2" : "")}>Sair</span>
          </button>`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
