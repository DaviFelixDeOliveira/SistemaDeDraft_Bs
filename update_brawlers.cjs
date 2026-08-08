const fs = require('fs');

const brawlersText = fs.readFileSync('src/data/mockData.ts', 'utf8');

const replacement = `  { id: '16000052', name: 'Meg', rarity: 'Lendário', tier: 'S', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000053', name: 'Lola', rarity: 'Épico', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000054', name: 'Fang', rarity: 'Mítico', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000056', name: 'Eve', rarity: 'Mítico', tier: 'D', health: 'Média', healthValue: '5000 - 6500', type: ['Destruidores'], walksOnWater: true, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000057', name: 'Janet', rarity: 'Mítico', tier: 'C', health: 'Média', healthValue: '5000 - 6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000058', name: 'Bonnie', rarity: 'Épico', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000059', name: 'Otis', rarity: 'Mítico', tier: 'B', health: 'Média', healthValue: '5000 - 6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000060', name: 'Sam', rarity: 'Épico', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000061', name: 'Gus', rarity: 'Super-Raro', tier: 'C', health: 'Média', healthValue: '5000 - 6500', type: ['Suporte'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000062', name: 'Buster', rarity: 'Mítico', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000063', name: 'Chester', rarity: 'Lendário', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000064', name: 'Gray', rarity: 'Mítico', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Suporte'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000065', name: 'Mandy', rarity: 'Épico', tier: 'D', health: 'Média', healthValue: '5000 - 6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000066', name: 'R-T', rarity: 'Mítico', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000067', name: 'Willow', rarity: 'Mítico', tier: 'C', health: 'Média', healthValue: '5000 - 6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000068', name: 'Maisie', rarity: 'Épico', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000069', name: 'Hank', rarity: 'Épico', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000070', name: 'Cordelius', rarity: 'Lendário', tier: 'B', health: 'Média', healthValue: '5000 - 6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000071', name: 'Doug', rarity: 'Mítico', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Suporte'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000072', name: 'Pearl', rarity: 'Épico', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000073', name: 'Chuck', rarity: 'Mítico', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000096', name: 'Trunk', rarity: 'Épico', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000097', name: 'Mina', rarity: 'Mítico', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000098', name: 'Ziggy', rarity: 'Mítico', tier: 'D', health: 'Média', healthValue: '5000 - 6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000099', name: 'Pierce', rarity: 'Lendário', tier: 'A', health: 'Média', healthValue: '5000 - 6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000100', name: 'Gigi', rarity: 'Mítico', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000101', name: 'Glowy', rarity: 'Mítico', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Suporte'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000102', name: 'Sirius', rarity: 'Ultralendário', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000103', name: 'Najia', rarity: 'Mítico', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000104', name: 'Damian', rarity: 'Mítico', tier: 'S', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000105', name: 'Starr Nova', rarity: 'Mítico', tier: 'S', health: 'Alta', healthValue: '+6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000106', name: 'Bolt', rarity: 'Épico', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' }
].map(b => ({`;

const newText = brawlersText.replace(
  "  { id: '16000052', name: 'Meg', rarity: 'Lendário', tier: 'S', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' }\n].map(b => ({",
  replacement
);

fs.writeFileSync('src/data/mockData.ts', newText);
