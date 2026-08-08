const fs = require('fs');
let content = fs.readFileSync('src/components/draft/StepMapAndBans.tsx', 'utf8');

// Add import
content = content.replace(
  "import { GameMap, Brawler } from '../../types';",
  "import { GameMap, Brawler } from '../../types';\nimport { MapDetailsView } from '../ui/MapDetailsView';"
);

// Replace modal
const modalRegex = /<div className="fixed inset-0 z-50 bg-black\/80 backdrop-blur-sm flex items-center justify-center p-4">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newModal = `<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingMap(null)}>
          <MapDetailsView map={viewingMap} onClose={() => setViewingMap(null)} />
        </div>`;

content = content.replace(modalRegex, newModal);
fs.writeFileSync('src/components/draft/StepMapAndBans.tsx', content);
