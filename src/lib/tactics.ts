import { GameMode } from '../types';

export interface ModeObjective {
  icon: string;
  label: string;
  description: string;
  color: string;
}

export interface TacticalTip {
  title: string;
  description: string;
  icon: string;
  color: string;
}

export const MODE_OBJECTIVES: Record<GameMode, ModeObjective> = {
  'Roubo': {
    icon: '🎯',
    label: 'Objetivo: Roubo',
    description: 'Priorize DPS  no cofre e controle de área central. Brawlers com recarga rápida e área de efeito são muito bons   aqui.',
    color: 'bg-[#FF3366]/10 border-[#FF3366]/30 text-[#FF3366]',
  },
  'Pique-Gema': {
    icon: '💎',
    label: 'Objetivo: Pique-Gema',
    description: 'Controle o centro do mapa e segure 10 gemas. Balanceie: 1 Tanque/Iniciador, 1 Suporte/Controle, 1 DPS. Evite composições puramente agressivas.',
    color: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  },
  'Zona Estratégica': {
    icon: '📍',
    label: 'Objetivo: Zona Estratégica',
    description: 'Domine a zona por tempo. Controle de área (Destruidores, Controle) e Tanques resistentes são essenciais. Poke constante vence.',
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  },
  'Caça-Estrelas': {
    icon: '⭐',
    label: 'Objetivo: Caça-Estrelas',
    description: 'Mate para ganhar estrelas; não morra para não perdê-las. Priorize Brawlers com mobilidade e tiro a longa distância. Assassinos (Mortis, Edgar, Leon) também são uma ótima escolha.',
    color: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  },
  'Nocaute': {
    icon: '🥊',
    label: 'Objetivo: Nocaute',
    description: 'Elimine o time inimigo (3v3, sem respawn). Tanques, Curadores e Brawlers de alta sustentação vencem. Evite picks frágeis sem escape.',
    color: 'bg-red-500/10 border-red-500/30 text-red-400',
  },
  'Fute-Brawl': {
    icon: '⚽',
    label: 'Objetivo: Fute-Brawl',
    description: ' Controle do meio do mapa com brawlers de alto/médio DPS, suporte e controle. Quebra-paredes e dash também são muito bons para auxiliar no controle e defesa da bola.',
    color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
};

export function getFirstPickTip(tbkStarts: boolean): TacticalTip {
  if (tbkStarts) {
    return {
      title: 'First Pick (Nós Começamos)',
      description: 'Garanta brawlers quebrados (Tier S) ou snipers em mapas abertos. Bana os counters diretos do topo do meta.',
      icon: '👑',
      color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    };
  } else {
    return {
      title: 'Last Pick (Inimigo Começa)',
      description: 'Foque em banir os Tier S gerais do meta. Reserve o último pick para um counter-pick (Surpresa) que quebre a composição inimiga.',
      icon: '🎭',
      color: 'bg-[#FF3366]/10 border-[#FF3366]/30 text-[#FF3366]',
    };
  }
}

export function getModeIcon(mode: GameMode): string {
  switch (mode) {
    case 'Roubo': return '🎯';
    case 'Pique-Gema': return '💎';
    case 'Zona Estratégica': return '📍';
    case 'Caça-Estrelas': return '⭐';
    case 'Nocaute': return '🥊';
    case 'Fute-Brawl': return '⚽';
    default: return '🎮';
  }
}