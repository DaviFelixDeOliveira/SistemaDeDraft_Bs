import React, { useEffect, useState } from 'react';
import { GameMap } from '../../types';
import { mapService } from '../../services/mapService';
import { Lightbulb, Target } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DraftTacticsBannerProps {
  mapId: string;
  tbkStarts: boolean;
  step: number;
}

const MODE_TIPS: Record<string, string> = {
  'Roubo': 'Objetivo de dano no cofre. Priorize brawlers de DPS alto para dar dano no cofre, brawlers de controle ou destruidores para defesa e outro para chatear o inimigo (algozes/tanques), podendo pegar outro suporte/DPS.',
  'Pique-Gema': 'Um mid para pegar as gemas, um anti-tanque para counterar possíveis assassinos e tanques, e outro suporte/controle ou assassino dependendo dos picks inimigos.',
  'Fute-Brawl': 'Um brawler de avanço para fazer gols, um bom de controle e destruidor para dar dano, quebrar paredes e defender possíveis algozes/tanques, e mais um de controle.',
  'Nocaute': 'Um pra bagunçar o jogo (algoz/tanque), um suporte que cure ou dê velocidade e +1 tiro preciso para recuar inimigos. Composições sem longo alcance podem sofrer.',
  'Zona Estratégica': 'Brawler para bagunçar o jogo, um de bastante vida e controle para dominar a área da zona, e mais um suporte, destruidor ou anti-tanque.',
  'Caça-Estrelas': 'Um brawler de avanço, um suporte focado e outro bom contra assassinos e algozes.'
};

export function DraftTacticsBanner({ mapId, tbkStarts, step }: DraftTacticsBannerProps) {
  const [map, setMap] = useState<GameMap | null>(null);

  useEffect(() => {
    if (!mapId) {
      setMap(null);
      return;
    }
    mapService.getMaps().then(maps => {
      const found = maps.find(m => m.id === mapId);
      setMap(found || null);
    });
  }, [mapId]);

  if (!mapId || !map) return null;
  if (step > 2) return null; // Apenas nos steps de Bans (1) e Picks (2)

  const modeTip = MODE_TIPS[map.mode] || 'Priorize sinergia e controle de mapa baseados na rotação atual.';

  return (
    <div className="mb-6 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
      {/* Card do Objetivo do Modo */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 sm:p-4 flex gap-3 sm:items-center items-start">
        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500 shrink-0">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-0.5">
            🎯 Objetivo em {map.mode} ({map.name})
          </h4>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {modeTip}
          </p>
        </div>
      </div>

      {/* Card da Sugestão First/Last Pick */}
      <div className={cn(
        "border rounded-xl p-3 sm:p-4 flex gap-3 sm:items-center items-start",
        tbkStarts 
          ? "bg-[#FFCC00]/10 border-[#FFCC00]/20 text-amber-600 dark:text-amber-500" 
          : "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400"
      )}>
        <div className={cn(
          "p-2 rounded-lg shrink-0",
          tbkStarts ? "bg-[#FFCC00]/20" : "bg-fuchsia-500/20"
        )}>
          <Lightbulb className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold mb-0.5">
            {tbkStarts ? '💡 Dica de First Pick (Nossa Vez Primeiro)' : '💡 Dica de Last Pick (Inimigo Começa)'}
          </h4>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {tbkStarts 
              ? 'Garanta os brawlers Tier S, "quebrados" no meta, ou snipers fortes em mapas abertos. Foque em banir os counters diretos desses brawlers.' 
              : 'Foque em banir os Tier S gerais do meta. Tente reservar o último pick (6º pick) para um counter-pick surpresa que destrua a composição inimiga.'}
          </p>
        </div>
      </div>
    </div>
  );
}
