const fs = require('fs');
let code = fs.readFileSync('src/components/draft/StepMapAndBans.tsx', 'utf8');

const regex = /function BrawlerBanSelect.*?}\n/s;
// wait, if BrawlerBanSelect is at the end, I can just slice the file before it.
// Let's find where BrawlerBanSelect starts.
const idx1 = code.indexOf('interface BrawlerBanSelectProps');
if (idx1 !== -1) {
  code = code.substring(0, idx1);
  fs.writeFileSync('src/components/draft/StepMapAndBans.tsx', code);
}
