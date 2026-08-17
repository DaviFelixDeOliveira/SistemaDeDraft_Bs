const fs = require('fs');
let code = fs.readFileSync('src/services/analyticsService.ts', 'utf8');

code = code.replace(
  /const comfortStats = Object\.entries\(playerPicksCount\)\.map\(\(\[pId, data\]\) => \{[\s\S]*?\}\)\.sort\(\(a, b\) => b\.matches - a\.matches\);/,
  `// Players who marked as comfort pick
    const comfortStats = players
      .filter(p => p.comfortBrawlers && p.comfortBrawlers.includes(brawlerId))
      .map(p => {
        const data = playerPicksCount[p.id] || { total: 0, wins: 0 };
        const wr = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
        return {
          playerName: p.nickname || p.name || 'Atleta',
          matches: data.total,
          winrate: wr,
          isComfort: true
        };
      }).sort((a, b) => b.matches - a.matches);`
);

fs.writeFileSync('src/services/analyticsService.ts', code);
