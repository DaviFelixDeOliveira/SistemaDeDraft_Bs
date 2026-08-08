import React from 'react';

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 text-white shadow-xl min-w-[120px]">
        <p className="font-bold mb-2 border-b border-[#2A2A2A] pb-2 text-sm">{label || payload[0]?.name || 'Dado'}</p>
        {payload.map((entry: any, index: number) => {
           const hasWinrate = entry.payload && entry.payload.winrate !== undefined;
           const isWrName = entry.name.toLowerCase().includes('winrate');
           const val = hasWinrate ? entry.payload.winrate : entry.value;
           
           return (
             <div key={`item-${index}`} className="flex items-center justify-between text-sm py-1">
               <span className="flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                 <span className="text-zinc-400">{hasWinrate ? 'Winrate' : entry.name}</span>
               </span>
               <span className="font-bold ml-4" style={{ color: entry.color }}>
                 {val}
                 {isWrName || hasWinrate ? '%' : ''}
               </span>
             </div>
           );
        })}
      </div>
    );
  }

  return null;
};
