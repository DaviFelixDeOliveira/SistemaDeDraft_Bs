const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/Dashboard.tsx', 'utf8');

const brokenPieRegex = /<Pie[\s\S]*?>\s*<Pie[\s\S]*?cy="50%"[\s\S]*?stroke="none"\s*>/;

const fixedPie = `<Pie
                  data={modeWinrate}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  onMouseEnter={(_, index) => setHoveredMode(modeWinrate[index])}
                  onMouseLeave={() => setHoveredMode(null)}
                  onClick={(_, index) => setHoveredMode(modeWinrate[index])}
                >`;

content = content.replace(brokenPieRegex, fixedPie);

fs.writeFileSync('src/components/dashboard/Dashboard.tsx', content);
