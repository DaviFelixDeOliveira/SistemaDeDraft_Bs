const fs = require('fs');
let code = fs.readFileSync('src/services/analyticsService.ts', 'utf8');

code = code.replace(
  /let daysSince = Infinity;\s*if \(lastPlayed\) \{\s*const diffTime = Math\.abs\(now\.getTime\(\) - lastPlayed\.getTime\(\)\);\s*daysSince = Math\.ceil\(diffTime \/ \(1000 \* 60 \* 60 \* 24\)\);\s*\}\s*if \(daysSince >= daysThreshold\) \{\s*alerts\.push\(\{ map, daysSince, lastPlayed \}\);\s*\}/,
  `if (lastPlayed) {
        const diffTime = Math.abs(now.getTime() - lastPlayed.getTime());
        const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (daysSince >= daysThreshold) {
          alerts.push({ map, daysSince, lastPlayed });
        }
      }`
);

fs.writeFileSync('src/services/analyticsService.ts', code);
