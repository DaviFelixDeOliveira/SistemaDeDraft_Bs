const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /<LogOut className="w-4 h-4" \/>\s*Sair do Sistema/,
  '<LogOut className="w-5 h-5" />'
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
