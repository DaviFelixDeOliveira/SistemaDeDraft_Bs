const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /<div className="flex items-center gap-3">\s*<div className="w-8 h-8 rounded bg-\[#FF3366\] flex items-center justify-center shadow-\[0_0_15px_rgba\(255,51,102,0\.4\)\]">\s*<Swords className="w-5 h-5 text-white" \/>\s*<\/div>\s*<h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">\s*TBK <span className="text-\[#FFCC00\]">Hub<\/span>\s*<\/h1>\s*<\/div>/m,
  `<div className="flex items-center gap-3">
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
          </button>`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
