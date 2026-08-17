const fs = require('fs');
let code = fs.readFileSync('src/services/analyticsService.ts', 'utf8');

const rotationAlertsCode = `
  getMapRotationAlerts: async (daysThreshold = 10) => {
    const matches = await analyticsService.getAllMatches();
    const maps = await mapService.getMaps();
    const alerts: { map: any, daysSince: number, lastPlayed: Date | null }[] = [];
    const now = new Date();

    const lastPlayedMap = new Map<string, Date>();
    matches.forEach(m => {
      const date = new Date(m.match_date);
      const current = lastPlayedMap.get(m.map_id);
      if (!current || date > current) {
        lastPlayedMap.set(m.map_id, date);
      }
    });

    maps.forEach(map => {
      // Ignore if map is not active (if map has an active flag, assuming all are active for now)
      const lastPlayed = lastPlayedMap.get(map.id);
      let daysSince = Infinity;
      if (lastPlayed) {
        const diffTime = Math.abs(now.getTime() - lastPlayed.getTime());
        daysSince = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      if (daysSince >= daysThreshold) {
        alerts.push({
          map,
          daysSince,
          lastPlayed: lastPlayed || null
        });
      }
    });

    return alerts.sort((a, b) => b.daysSince - a.daysSince);
  },
`;

if (!code.includes('getMapRotationAlerts')) {
  code = code.replace(/getMapPerformance: async \(\) => \{/, rotationAlertsCode + '\n  getMapPerformance: async () => {');
  fs.writeFileSync('src/services/analyticsService.ts', code);
}
