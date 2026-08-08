const fs = require('fs');
let content = fs.readFileSync('src/components/brawlers/BrawlersHub.tsx', 'utf8');

content = content.replace(
  '<div className="grid grid-cols-1 md:grid-cols-3 gap-6">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">'
);

fs.writeFileSync('src/components/brawlers/BrawlersHub.tsx', content);
