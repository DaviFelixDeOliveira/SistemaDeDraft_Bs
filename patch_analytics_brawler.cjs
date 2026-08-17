const fs = require('fs');
let code = fs.readFileSync('src/services/analyticsService.ts', 'utf8');

code = code.replace(
  /const tbkPicks = bPicks\.filter\(p => p\.team === 'tbk'\);/,
  `const tbkPicks = bPicks.filter(p => p.team === 'tbk');\n      const enemyPicksCount = bPicks.filter(p => p.team === 'enemy').length;`
);

code = code.replace(
  /tbkPickCount: tbkPicks\.length,\s*winrate/,
  `tbkPickCount: tbkPicks.length,
        enemyPickCount: enemyPicksCount,
        tbkWins: wins,
        tbkLosses: tbkPicks.length - wins,
        winrate`
);

fs.writeFileSync('src/services/analyticsService.ts', code);
