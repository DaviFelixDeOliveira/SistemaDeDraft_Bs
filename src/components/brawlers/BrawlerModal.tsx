import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Brawler, Tier, BrawlerClass } from '../../types';
import { cn } from '../../lib/utils';

interface BrawlerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (brawler: Partial<Brawler>) => void;
  brawler?: Brawler | null;
}

const AVAILABLE_CLASSES = [
  'Destruidores',
  'Algoz',
  'Tiro preciso',
  'Lançadores',
  'Tanque',
  'Controle',
  'Suporte'
];

export function BrawlerModal({ isOpen, onClose, onSave, brawler }: BrawlerModalProps) {
  const [formData, setFormData] = useState<Partial<Brawler>>({
    name: '',
    tier: 'C',
    type: [],
    imageUrl: '',
    iconUrl: '',
    rarity: 'Comum',
    health: 'Média',
    walksOnWater: false,
    breaksWalls: false
  });

  useEffect(() => {
    if (brawler) {
      setFormData(brawler);
    } else {
      setFormData({
        name: '',
        tier: 'C',
        type: [],
        imageUrl: '',
        iconUrl: '',
        rarity: 'Comum',
        health: 'Média',
        walksOnWater: false,
        breaksWalls: false
      });
    }
  }, [brawler, isOpen]);

  if (!isOpen) return null;

  const toggleClass = (cls: string) => {
    setFormData(prev => {
      const types = prev.type || [];
      if (types.includes(cls)) {
        return { ...prev, type: types.filter(t => t !== cls) };
      } else {
        return { ...prev, type: [...types, cls] };
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-[#2A2A2A] rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md p-6 border-b border-zinc-100 dark:border-[#2A2A2A] flex justify-between items-center z-10">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
            {brawler ? 'Editar Brawler' : 'Novo Brawler'}
          </h3>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Nome do Brawler *</label>
            <input 
              type="text" 
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              placeholder="Ex: Shelly"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Código do Brawler (Ícone)</label>
             <input 
                 type="text" 
                 value={formData.iconUrl ? (formData.iconUrl.match(/\d+/) ? formData.iconUrl.match(/\d+/)[0] : '') : ''}
                 onChange={e => {
                   const val = e.target.value.replace(/\D/g, '');
                   if (val) {
                     setFormData({ ...formData, iconUrl: `https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/emoji/${val}.png` });
                   } else {
                     setFormData({ ...formData, iconUrl: '' });
                   }
                 }}
                 className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
                 placeholder="Ex: 16000000"
             />
             {formData.iconUrl && <p className="text-xs text-zinc-500 mt-1 text-right">URL gerada com sucesso.</p>}
          </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Tier Meta *</label>
              <select 
                value={formData.tier || 'C'}
                onChange={e => setFormData({ ...formData, tier: e.target.value as Tier })}
                className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              >
                <option value="S">S - God Tier</option>
                <option value="A">A - Muito Forte</option>
                <option value="B">B - Balanceado</option>
                <option value="C">C - Situacional</option>
                <option value="D">D - Fraco</option>
              </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Código do Brawler (Imagem Corpo)</label>
             <input 
                 type="text" 
                 value={formData.imageUrl ? (formData.imageUrl.match(/\d+/) ? formData.imageUrl.match(/\d+/)[0] : '') : ''}
                 onChange={e => {
                   const val = e.target.value.replace(/\D/g, '');
                   if (val) {
                     setFormData({ ...formData, imageUrl: `https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/portraits/${val}.png` });
                   } else {
                     setFormData({ ...formData, imageUrl: '' });
                   }
                 }}
                 className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
                 placeholder="Ex: 16000000"
             />
             {formData.imageUrl && <p className="text-xs text-zinc-500 mt-1 text-right">URL gerada com sucesso.</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Raridade *</label>
              <select 
                value={formData.rarity || 'Comum'}
                onChange={e => setFormData({ ...formData, rarity: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              >
                <option value="Comum">Comum</option>
                <option value="Raro">Raro</option>
                <option value="Super Raro">Super Raro</option>
                <option value="Épico">Épico</option>
                <option value="Mítico">Mítico</option>
                <option value="Lendário">Lendário</option>
                <option value="Ultralendário">Ultralendário</option>
                <option value="Cromático">Cromático</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Vida *</label>
              <select 
                value={formData.health || 'Média'}
                onChange={e => setFormData({ ...formData, health: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              >
                <option value="Baixa">Baixa (Menos de 5000)</option>
                <option value="Média">Média (5000 - 6500)</option>
                <option value="Alta">Alta (+6500)</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.breaksWalls || false}
                  onChange={e => setFormData({ ...formData, breaksWalls: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-300 text-[#FF3366] focus:ring-[#FF3366]"
                />
                Quebra Muros?
             </label>
             <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.walksOnWater || false}
                  onChange={e => setFormData({ ...formData, walksOnWater: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-300 text-[#FF3366] focus:ring-[#FF3366]"
                />
                Anda sobre a água?
             </label>
          </div>

          <div>
             <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Classes / Tags</label>
             <div className="flex flex-wrap gap-2">
                {AVAILABLE_CLASSES.map(cls => {
                   const isSelected = formData.type?.includes(cls);
                   return (
                      <button
                         key={cls}
                         type="button"
                         onClick={() => toggleClass(cls)}
                         className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold transition-colors border",
                            isSelected 
                               ? "bg-[#FF3366]/10 text-[#FF3366] border-[#FF3366]/30" 
                               : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                         )}
                      >
                         {cls}
                      </button>
                   );
                })}
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 dark:border-[#2A2A2A]">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                if (!formData.name) return;
                onSave(formData);
              }}
              className="bg-[#FF3366] hover:bg-[#E62E5C] text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              disabled={!formData.name}
            >
              Salvar Brawler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
