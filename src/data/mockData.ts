import { Brawler, GameMap, Player, Composition } from '../types';

export const mockBrawlers: Brawler[] = [
  { id: '16000000', name: 'Shelly', rarity: 'Raro', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Acessório, Ulti' },
  { id: '16000001', name: 'Colt', rarity: 'Raro', tier: 'A', health: 'Média', healthValue: '5000 - 6500', type: ['Destruidores', 'Tiro preciso'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Acessório, Ulti' },
  { id: '16000002', name: 'Bull', rarity: 'Raro', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Ulti' },
  { id: '16000003', name: 'Brock', rarity: 'Raro', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Acessório, Ulti' },
  { id: '16000004', name: 'Rico', rarity: 'Super-Raro', tier: 'A', health: 'Média', healthValue: '5000 - 6500', type: ['Destruidores', 'Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A', isHotPick: true },
  { id: '16000005', name: 'Spike', rarity: 'Lendário', tier: 'D', health: 'Média', healthValue: '5000 - 6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000006', name: 'Barley', rarity: 'Raro', tier: 'B', health: 'Média', healthValue: '5000 - 6500', type: ['Lancadores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000007', name: 'Jessie', rarity: 'Super-Raro', tier: 'B', health: 'Média', healthValue: '5000 - 6500', type: ['Controle', 'Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000008', name: 'Nita', rarity: 'Raro', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Controle', 'Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000009', name: 'Dinamike', rarity: 'Super-Raro', tier: 'D', health: 'Média', healthValue: '5000 - 6500', type: ['Lancadores'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Ulti' },
  { id: '16000010', name: 'El Primo', rarity: 'Raro', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Acessório, Ulti' },
  { id: '16000011', name: 'Mortis', rarity: 'Mítico', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000012', name: 'Corvo', rarity: 'Lendário', tier: 'S', health: 'Média', healthValue: '5000 - 6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A', isHotPick: true },
  { id: '16000013', name: 'Poco', rarity: 'Raro', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Suporte'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000014', name: 'Bo', rarity: 'Épico', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Acessório, Ulti' },
  { id: '16000015', name: 'Piper', rarity: 'Mítico', tier: 'B', health: 'Média', healthValue: '5000 - 6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Ulti' },
  { id: '16000016', name: 'Pam', rarity: 'Épico', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Suporte'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000017', name: 'Tara', rarity: 'Mítico', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Ulti' },
  { id: '16000018', name: 'Darryl', rarity: 'Super-Raro', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000019', name: 'Penny', rarity: 'Super-Raro', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Controle', 'Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000020', name: 'Frank', rarity: 'Épico', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Ulti' },
  { id: '16000021', name: 'Eugênio', rarity: 'Mítico', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000022', name: 'Tick', rarity: 'Super-Raro', tier: 'D', health: 'Baixa', healthValue: '-5000', type: ['Lancadores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000023', name: 'Leon', rarity: 'Lendário', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000024', name: 'Rosa', rarity: 'Raro', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000025', name: 'Carl', rarity: 'Super-Raro', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000026', name: 'Bibi', rarity: 'Épico', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000027', name: '8-Bit', rarity: 'Super-Raro', tier: 'S', health: 'Alta', healthValue: '+6500', type: ['Destruidores', 'Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A', isHotPick: true },
  { id: '16000028', name: 'Sandy', rarity: 'Lendário', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000029', name: 'Bea', rarity: 'Épico', tier: 'C', health: 'Média', healthValue: '5000 - 6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000030', name: 'Emz', rarity: 'Épico', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A', isHotPick: true },
  { id: '16000031', name: 'Mr. P', rarity: 'Mítico', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000032', name: 'Max', rarity: 'Mítico', tier: 'S', health: 'Alta', healthValue: '+6500', type: ['Suporte'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000034', name: 'Jacky', rarity: 'Super-Raro', tier: 'D', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000035', name: 'Gale', rarity: 'Épico', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000036', name: 'Nani', rarity: 'Épico', tier: 'C', health: 'Média', healthValue: '5000 - 6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Ulti' },
  { id: '16000037', name: 'Sprout', rarity: 'Mítico', tier: 'C', health: 'Média', healthValue: '5000 - 6500', type: ['Lancadores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000038', name: 'Surge', rarity: 'Lendário', tier: 'S', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000039', name: 'Collete', rarity: 'Épico', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Destruidores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000040', name: 'Amber', rarity: 'Lendário', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000041', name: 'Lou', rarity: 'Mítico', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000042', name: 'Byron', rarity: 'Mítico', tier: 'A', health: 'Média', healthValue: '5000 - 6500', type: ['Suporte'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000043', name: 'Edgar', rarity: 'Épico', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000044', name: 'Ruffs', rarity: 'Mítico', tier: 'A', health: 'Média', healthValue: '5000 - 6500', type: ['Suporte'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Acessório, Ulti' },
  { id: '16000045', name: 'Stu', rarity: 'Épico', tier: 'A', health: 'Alta', healthValue: '+6500', type: ['Algoz'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Acessório, Ulti' },
  { id: '16000046', name: 'Belle', rarity: 'Épico', tier: 'B', health: 'Média', healthValue: '5000 - 6500', type: ['Tiro preciso'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000047', name: 'Squeak', rarity: 'Mítico', tier: 'C', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000048', name: 'Grom', rarity: 'Épico', tier: 'D', health: 'Média', healthValue: '5000 - 6500', type: ['Lancadores'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000049', name: 'Buzz', rarity: 'Mítico', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Algoz'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000050', name: 'Griff', rarity: 'Épico', tier: 'S', health: 'Alta', healthValue: '+6500', type: ['Controle'], walksOnWater: false, breaksWalls: true, howBreaksWalls: 'Acessório' },
  { id: '16000051', name: 'Ash', rarity: 'Épico', tier: 'B', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
  { id: '16000052', name: 'Meg', rarity: 'Lendário', tier: 'S', health: 'Alta', healthValue: '+6500', type: ['Tanque'], walksOnWater: false, breaksWalls: false, howBreaksWalls: 'N/A' },
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
].map(b => ({
  ...b,
  imageUrl: `https://cdn.brawlify.com/brawlers/borders/${b.id}.png`,
  iconUrl: `https://cdn.brawlify.com/brawlers/emoji/${b.id}.png`
}));


export const mockMaps: GameMap[] = [
  // Zona Estratégica
  { id: 'm1', name: 'Aberto', mode: 'Zona Estratégica', terrain: 'Aberto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000292.png' },
  { id: 'm2', name: 'Anel de Fogo', mode: 'Zona Estratégica', terrain: 'Misto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000300.png' },
  { id: 'm3', name: 'Besouros Brigões', mode: 'Zona Estratégica', terrain: 'Fechado', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000306.png' },
  
  // Caça-Estrelas
  { id: 'm4', name: 'Bolo em Camadas', mode: 'Caça-Estrelas', terrain: 'Fechado', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000082.png' },
  { id: 'm5', name: 'Estação Seca', mode: 'Caça-Estrelas', terrain: 'Aberto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000083.png' },
  { id: 'm6', name: 'Tocaia', mode: 'Caça-Estrelas', terrain: 'Fechado', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000022.png' },
  
  // Nocaute
  { id: 'm7', name: 'Caverna do Braço Dourado', mode: 'Nocaute', terrain: 'Misto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000367.png' },
  { id: 'm8', name: 'Descampado', mode: 'Nocaute', terrain: 'Aberto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000548.png' },
  { id: 'm9', name: 'Novos Horizontes', mode: 'Nocaute', terrain: 'Aberto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000703.png' },
  
  // Fute-Brawl
  { id: 'm10', name: 'Drible Triplo', mode: 'Fute-Brawl', terrain: 'Misto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000025.png' },
  { id: 'm11', name: 'Pintando o Pinball', mode: 'Fute-Brawl', terrain: 'Fechado', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000118.png' },
  { id: 'm12', name: 'Tiro de Meta', mode: 'Fute-Brawl', terrain: 'Aberto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000026.png' },
  
  // Pique-Gema
  { id: 'm13', name: 'Fliperama de Cristal', mode: 'Pique-Gema', terrain: 'Aberto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000008.png' },
  { id: 'm14', name: 'Forte de Gemas', mode: 'Pique-Gema', terrain: 'Misto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000010.png' },
  { id: 'm15', name: 'Mina Rochosa', mode: 'Pique-Gema', terrain: 'Fechado', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000007.png' },
  
  // Roubo
  { id: 'm16', name: 'Pit Stop', mode: 'Roubo', terrain: 'Fechado', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000137.png' },
  { id: 'm17', name: 'Ravina Kabum', mode: 'Roubo', terrain: 'Aberto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000018.png' },
  { id: 'm18', name: 'Zona Segura', mode: 'Roubo', terrain: 'Aberto', isActive: true, imageUrl: 'https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/15000019.png' },
];

export const mockPlayers: Player[] = [
  { id: 'p1', name: 'Lincxz', nickname: 'TRY|Lincxz ❤️🔥', status: 'Titular', isActive: true, comfortBrawlers: ['16000027', '16000012', '16000015'], tags: ['Mid', 'Snipers'] },
  { id: 'p2', name: 'Bruxz', nickname: 'TRY|Bruxz ❤️🔥', status: 'Titular', isActive: true, comfortBrawlers: ['16000001', '16000004', '16000018'], tags: ['Lane', 'Aggro'] },
  { id: 'p3', name: 'Davi', nickname: 'yĐaviZaoBS あ', status: 'Titular', isActive: true, comfortBrawlers: ['16000002', '16000020', '16000024'], tags: ['Tank', 'Aggro'] },
  { id: 'p4', name: 'Kaio', nickname: '𝒦𝒶𝒾ℴ𝒵ℯ𝓇𝒶♛', status: 'Titular', isActive: true, comfortBrawlers: ['16000013', '16000016', '16000007'], tags: ['Suporte', 'Controle'] },
];

export const mockCompositions: Composition[] = [
  { id: 'c1', mapId: 'm1', brawlers: ['16000012', '16000027', '16000015'], description: 'Controle de Meio', winrate: 72, matchesPlayed: 15 },
  { id: 'c2', mapId: 'm1', brawlers: ['16000013', '16000020', '16000004'], description: 'Double Tank / Aggro', winrate: 65, matchesPlayed: 8 },
  { id: 'c3', mapId: 'm2', brawlers: ['16000002', '16000024', '16000013'], description: 'Triple Tank Rush', winrate: 80, matchesPlayed: 5 },
];
