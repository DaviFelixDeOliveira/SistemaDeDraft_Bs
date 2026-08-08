const fs = require('fs');
let content = fs.readFileSync('src/components/players/PlayerModals.tsx', 'utf8');

content = content.replace(
  'const comfortBrawlers = player.comfortBrawlers.map',
  'const comfortBrawlers = (player.comfortBrawlers || []).map'
);

fs.writeFileSync('src/components/players/PlayerModals.tsx', content);
