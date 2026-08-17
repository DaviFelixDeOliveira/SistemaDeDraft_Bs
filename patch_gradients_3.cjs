const fs = require('fs');

function replaceFile(path, search, replace) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(search, replace);
  fs.writeFileSync(path, content);
}

replaceFile('src/components/LockScreen.tsx', 'bg-gradient-to-br from-[#FF3366] to-[#cc0033]', 'bg-[#FF3366]');
replaceFile('src/components/draft/DraftWizard.tsx', 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-[#FF3366]', 'bg-[#FF3366]');
replaceFile('src/components/dashboard/Dashboard.tsx', 'bg-gradient-to-r from-[#FF3366] to-fuchsia-500', 'bg-[#FF3366]');
replaceFile('src/App.tsx', 'bg-gradient-to-br from-[#FF3366] to-[#cc0033]', 'bg-[#FF3366]');

