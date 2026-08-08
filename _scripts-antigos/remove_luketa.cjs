const fs = require('fs');
let content = fs.readFileSync('src/data/mockData.ts', 'utf8');
content = content.replace("  { id: 'p5', name: 'Luketa', nickname: 'Luketa 🎯', status: 'Reserva', isActive: true, comfortBrawlers: ['16000006', '16000022'], tags: ['Thrower', 'Flex'] },\n", "");
fs.writeFileSync('src/data/mockData.ts', content);
