const fs = require('fs');

function replaceFile(path, replacer) {
  let content = fs.readFileSync(path, 'utf8');
  content = replacer(content);
  fs.writeFileSync(path, content);
}

replaceFile('src/components/LockScreen.tsx', c => c.replace(/bg-gradient-to-br from-\\[#FF3366\\] to-\\[#cc0033\\]/g, 'bg-[#FF3366]'));
replaceFile('src/components/draft/DraftWizard.tsx', c => c.replace(/bg-gradient-to-r from-violet-500 via-fuchsia-500 to-\\[#FF3366\\]/g, 'bg-[#FF3366]'));
replaceFile('src/components/maps/MapsHub.tsx', c => c.replace(/bg-gradient-to-r from-emerald-500 to-emerald-400/g, 'bg-emerald-500'));
replaceFile('src/components/dashboard/Dashboard.tsx', c => c.replace(/bg-gradient-to-r from-\\[#FF3366\\] to-fuchsia-500/g, 'bg-[#FF3366]'));
replaceFile('src/App.tsx', c => c.replace(/bg-gradient-to-br from-\\[#FF3366\\] to-\\[#cc0033\\]/g, 'bg-[#FF3366]'));

