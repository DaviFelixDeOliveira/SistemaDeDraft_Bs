const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /const buttonContent = \([\s\S]*?\/\/ Also need to wrap mobile button correctly so we render it when collapsed \(hidden md:block hides it on mobile otherwise, so we need a cleaner approach\)/m,
  `return (
              <CustomTooltip key={item.id} content={item.label} placement="right" disabled={!isCollapsed}>
                <button
                  onClick={() => onChangeView(item.id)}
                  className={cn("cursor-pointer touch-manipulation", 
                    "w-full flex items-center rounded-lg text-sm font-medium transition-all",
                    isCollapsed ? "md:justify-center md:px-0 md:py-3 px-4 py-3 md:gap-0 gap-3" : "gap-3 px-4 py-3",
                    isActive 
                      ? "bg-[#FF3366]/10 text-[#FF3366] shadow-[inset_2px_0_0_0_#FF3366]" 
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className={cn(isCollapsed ? "md:hidden" : "")}>{item.label}</span>
                </button>
              </CustomTooltip>
            );`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
