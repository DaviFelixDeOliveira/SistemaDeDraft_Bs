const fs = require('fs');
let content = fs.readFileSync('src/components/maps/MapModals.tsx', 'utf8');

// Add import
content = content.replace(
  "import { cn } from '../../lib/utils';",
  "import { cn } from '../../lib/utils';\nimport { MapDetailsView } from '../ui/MapDetailsView';"
);

// Replace map image block
const imageBlockRegex = /\{map\.imageUrl && \([\s\S]*?<\/div>\s*\)\}/;

const newImageBlock = `<MapDetailsView map={map} />`;

content = content.replace(imageBlockRegex, newImageBlock);
fs.writeFileSync('src/components/maps/MapModals.tsx', content);
