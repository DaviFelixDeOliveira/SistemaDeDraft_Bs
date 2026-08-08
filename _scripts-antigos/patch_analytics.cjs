const fs = require('fs');
let content = fs.readFileSync('src/services/analyticsService.ts', 'utf8');

const getMapPerfRegex = /getMapPerformance: async \(\) => \{[\s\S]*?\},/;

const newMapPerf = `getMapPerformance: async () => {
    const { mockMaps } = await import("../data/mockData");
    return mockMaps.map((map) => {
      const total = Math.floor(Math.random() * 20) + 5;
      const wins = Math.floor(Math.random() * total);
      return {
        wins,
        total,
        map,
        winrate: Math.round((wins / total) * 100)
      };
    }).sort((a, b) => b.winrate - a.winrate);
  },`;

content = content.replace(getMapPerfRegex, newMapPerf);

fs.writeFileSync('src/services/analyticsService.ts', content);
