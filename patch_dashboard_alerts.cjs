const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/Dashboard.tsx', 'utf8');

code = code.replace(
  /analyticsService\.getMapRotationAlerts\(12\)/,
  `analyticsService.getMapRotationAlerts(5)`
);

fs.writeFileSync('src/components/dashboard/Dashboard.tsx', code);
