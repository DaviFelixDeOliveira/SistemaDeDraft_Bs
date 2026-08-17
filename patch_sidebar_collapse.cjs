const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Add state for collapsed
if (!code.includes('isCollapsed')) {
  code = code.replace(
    /const fileInputRef = useRef<HTMLInputElement>\(null\);/,
    `const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tbk_hub_sidebar_collapsed') === 'true';
    }
    return false;
  });
  
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('tbk_hub_sidebar_collapsed', String(next));
      return next;
    });
  };`
  );

  // Use Tooltip
  if (!code.includes('CustomTooltip')) {
    code = code.replace(
      /import \{ ConfirmModal \} from '.\/ui\/ConfirmModal';/,
      `import { ConfirmModal } from './ui/ConfirmModal';\nimport { CustomTooltip } from './ui/CustomTooltip';`
    );
  }

  // Width adjustment
  code = code.replace(
    /"fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-\[#121212\] border-r border-zinc-200 dark:border-\[#2A2A2A\] h-screen flex flex-col transform transition-transform duration-300 ease-in-out"/,
    `"fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-[#121212] border-r border-zinc-200 dark:border-[#2A2A2A] h-screen flex flex-col transform transition-all duration-300 ease-in-out",
        isCollapsed ? "w-64 md:w-20" : "w-64"`
  );

  // Sidebar header with collapse button
  code = code.replace(
    /<div className="p-6 flex items-center justify-between">/,
    `<div className={cn("p-6 flex items-center", isCollapsed ? "md:px-0 md:justify-center justify-between" : "justify-between")}>`
  );

  code = code.replace(
    /<h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">\s*TBK Hub\s*<\/h1>\s*<\/div>\s*<div className="hidden md:block">/,
    `{!isCollapsed && <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight md:block">TBK Hub</h1>}
            <h1 className={cn("text-xl font-bold text-zinc-900 dark:text-white tracking-tight hidden", isCollapsed ? "hidden md:hidden" : "md:hidden")}>TBK Hub</h1>
          </div>
          <button 
            onClick={toggleCollapse} 
            className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            <PanelLeftClose className={cn("w-5 h-5 transition-transform", isCollapsed ? "rotate-180" : "")} />
          </button>
          <div className="md:hidden">`
  );

  // Menu Items mapping
  code = code.replace(
    /return \(\s*<button\s*key=\{item\.id\}\s*onClick=\{[\s\S]*?className=\{cn\("cursor-pointer touch-manipulation",\s*"w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",\s*isActive\s*\? "bg-\[#FF3366\]\/10 text-\[#FF3366\] shadow-\[inset_2px_0_0_0_#FF3366\]"\s*: "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800\/50"\s*\)\}\s*>\s*<Icon className="w-5 h-5" \/>\s*\{item\.label\}\s*<\/button>\s*\);/g,
    `
            const buttonContent = (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={cn("cursor-pointer touch-manipulation", 
                  "w-full flex items-center rounded-lg text-sm font-medium transition-all",
                  isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-3 gap-0" : "gap-3 px-4 py-3",
                  isActive 
                    ? "bg-[#FF3366]/10 text-[#FF3366] shadow-[inset_2px_0_0_0_#FF3366]" 
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <Icon className={cn("w-5 h-5", isCollapsed ? "" : "shrink-0")} />
                {!isCollapsed && <span>{item.label}</span>}
                <span className={cn("md:hidden ml-3", isCollapsed ? "" : "hidden")}>{item.label}</span>
              </button>
            );

            return isCollapsed ? (
              <div key={item.id} className="hidden md:block">
                <CustomTooltip content={item.label} placement="right">
                  {buttonContent}
                </CustomTooltip>
              </div>
            ) : buttonContent;
            
            // Also need to wrap mobile button correctly so we render it when collapsed (hidden md:block hides it on mobile otherwise, so we need a cleaner approach)
`
  );

  fs.writeFileSync('src/components/Sidebar.tsx', code);
}
