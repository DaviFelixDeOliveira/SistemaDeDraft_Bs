const fs = require('fs');
let code = fs.readFileSync('src/components/maps/MapsHub.tsx', 'utf8');

code = code.replace(
  /<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">/,
  `<div className="absolute top-2 left-2 z-10 flex gap-2 shadow-sm rounded-lg overflow-hidden bg-white/80 dark:bg-black/60 backdrop-blur-sm p-1">`
);

code = code.replace(
  /className="p-1\.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-400 hover:text-blue-500 transition-colors shadow-sm"/,
  `className="p-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-blue-500 hover:bg-white dark:hover:bg-zinc-800 transition-colors"`
);

code = code.replace(
  /className="p-1\.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-400 hover:text-\[#FF3366\] transition-colors shadow-sm"/,
  `className="p-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:text-[#FF3366] hover:bg-white dark:hover:bg-zinc-800 transition-colors"`
);


fs.writeFileSync('src/components/maps/MapsHub.tsx', code);
