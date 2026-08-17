const fs = require('fs');
let code = fs.readFileSync('src/components/draft/StepMapAndBans.tsx', 'utf8');

code = code.replace(
`import { MapDetailsView } from '../ui/MapDetailsView';`,
`import { MapDetailsView } from '../ui/MapDetailsView';\nimport { BrawlerSelectDropdown } from '../ui/BrawlerSelectDropdown';`
);

// We need to cut out the BrawlerBanSelect implementation from StepMapAndBans.tsx.
// BrawlerBanSelect starts at function BrawlerBanSelect and ends before export function StepMapAndBans ? No, it's defined at the end of StepMapAndBans.
// Wait, the file is long. I'll just use sed to delete it or replace all calls to `<BrawlerBanSelect` with `<BrawlerSelectDropdown`
code = code.replace(/<BrawlerBanSelect /g, '<BrawlerSelectDropdown icon={<Ban className="w-3 h-3 text-red-500\/70 ml-1" />} ');
code = code.replace(/<\/BrawlerBanSelect>/g, '</BrawlerSelectDropdown>');

fs.writeFileSync('src/components/draft/StepMapAndBans.tsx', code);
