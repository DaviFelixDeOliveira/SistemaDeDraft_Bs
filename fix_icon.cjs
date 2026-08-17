const fs = require('fs');
let code = fs.readFileSync('src/components/draft/StepMapAndBans.tsx', 'utf8');
code = code.replace(/ icon={<Ban className="w-3 h-3 text-red-500\/70 ml-1" \/>} /g, ' ');
fs.writeFileSync('src/components/draft/StepMapAndBans.tsx', code);
