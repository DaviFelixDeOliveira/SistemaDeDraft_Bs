const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /<CustomTooltip key=\{item\.id\} content=\{item\.label\} placement="right" disabled=\{!isCollapsed\}>/g,
  ''
);

code = code.replace(
  /<\/CustomTooltip>/g,
  ''
);

code = code.replace(
  /<button\s*onClick=\{\(\) => onChangeView\(item\.id\)\}/,
  `<button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  title={isCollapsed ? item.label : undefined}`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
