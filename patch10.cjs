const fs = require('fs');
let code = fs.readFileSync('src/components/brawlers/BrawlersHub.tsx', 'utf8');

code = code.replace(
  `className="h-full bg-gradient-to-r from-[#FF3366] to-fuchsia-500 rounded-full relative"`,
  `className="h-full bg-[#FF3366] rounded-full relative"`
);

code = code.replace(
  `className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full relative"`,
  `className="h-full bg-emerald-500 rounded-full relative"`
);

fs.writeFileSync('src/components/brawlers/BrawlersHub.tsx', code);
