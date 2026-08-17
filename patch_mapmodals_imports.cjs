const fs = require('fs');
let code = fs.readFileSync('src/components/maps/MapModals.tsx', 'utf8');

code = code.replace(
  /import \{ X, Award, Shield, Target, Plus, Flame \} from 'lucide-react';/,
  `import { X, Award, Shield, Target, Plus, Flame, Info } from 'lucide-react';`
);

fs.writeFileSync('src/components/maps/MapModals.tsx', code);
