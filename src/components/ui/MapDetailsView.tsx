import { getBrawlerBgColor } from "../../lib/utils";
import React from 'react';
import { GameMap } from '../../types';
import { X, Settings } from 'lucide-react';

interface MapDetailsViewProps {
  map: GameMap;
  onClose?: () => void;
}

export function MapDetailsView({ map, onClose }: MapDetailsViewProps) {
  return (
    <div className="w-full max-w-2xl bg-[#41a1f0] border-4 border-[#1e6199] rounded-2xl shadow-[0_8px_0_0_#1e6199] overflow-hidden flex flex-col font-['Lilita_One',sans-serif] relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="bg-[#2785db] px-4 py-2 flex justify-between items-center border-b-4 border-[#1e6199]">
        <h3 className="text-white text-xl sm:text-2xl uppercase tracking-wide font-black" style={{ textShadow: '2px 2px 0 #1e6199, -1px -1px 0 #1e6199, 1px -1px 0 #1e6199, -1px 1px 0 #1e6199, 1px 1px 0 #1e6199' }}>
          Detalhes do Evento
        </h3>
        {onClose && (
          <button onClick={onClose} className="bg-red-500 hover:bg-red-400 border-2 border-[#1e6199] rounded p-1 text-white shadow-[0_4px_0_0_#1e6199] active:translate-y-1 active:shadow-none transition-all">
            <X className="w-6 h-6" strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-6 relative">
        {/* Left Side: Map Image */}
        <div className="flex-1 bg-[#2785db] rounded-xl border-4 border-[#1e6199] p-2 flex items-center justify-center relative overflow-hidden aspect-square sm:aspect-auto">
          {map.imageUrl ? (
            <img src={map.imageUrl} alt={map.name} className="w-full h-full object-contain " />
          ) : (
            <div className="text-white/50 font-black text-xl">SEM IMAGEM</div>
          )}
        </div>

        {/* Right Side: Info */}
        <div className="flex-1 flex flex-col pt-2 text-white font-black uppercase">
          <div className="text-2xl sm:text-3xl text-yellow-300 drop-shadow-[0_2px_0_#1e6199]" style={{ WebkitTextStroke: '1px #1e6199' }}>
            {map.mode}
          </div>
          <div className="text-3xl sm:text-4xl mt-1 drop-shadow-[0_2px_0_#1e6199]" style={{ WebkitTextStroke: '1px #1e6199' }}>
            {map.name}
          </div>
          
          <div className="bg-[#1e6199] rounded-lg px-4 py-2 mt-4 inline-block w-fit text-sm">
            3 x 3
          </div>

          <p className="mt-4 text-sm normal-case font-bold text-white/90 font-sans">
            {map.terrain === 'Aberto' ? 'Um mapa aberto perfeito para atiradores e longo alcance.' : 
             map.terrain === 'Fechado' ? 'Muitas paredes e arbustos. Brawlers de curto alcance brilham aqui.' : 
             'Um mapa equilibrado com áreas abertas e zonas de cobertura.'}
          </p>
        </div>
      </div>
    </div>
  );
}
