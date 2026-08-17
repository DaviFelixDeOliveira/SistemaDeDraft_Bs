const fs = require('fs');
let code = fs.readFileSync('src/components/maps/MapsHub.tsx', 'utf8');

code = code.replace(
  /onChange=\{e => setSearchQuery\(e\.target\.value\)\}/,
  `onChange={e => {
                  const query = e.target.value;
                  setSearchQuery(query);
                  if (query.length > 1) {
                    const foundMap = maps.find(m => m.name.toLowerCase().includes(query.toLowerCase()) && m.isActive === viewActive);
                    if (foundMap && foundMap.mode !== activeMode) {
                      setActiveMode(foundMap.mode);
                    }
                  }
                }}`
);

fs.writeFileSync('src/components/maps/MapsHub.tsx', code);
