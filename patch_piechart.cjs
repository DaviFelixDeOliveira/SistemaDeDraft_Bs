const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/Dashboard.tsx', 'utf8');

content = content.replace(
  '<ResponsiveContainer width="100%" height="100%">\\n              <Pie',
  '<ResponsiveContainer width="100%" height="100%">\\n              <PieChart>\\n                <Pie'
);

fs.writeFileSync('src/components/dashboard/Dashboard.tsx', content);
