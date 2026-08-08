const fs = require('fs');
let content = fs.readFileSync('src/components/maps/MapModals.tsx', 'utf8');

// Replace the URL input with an ID input
const inputRegex = /<label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">URL da Imagem do Mapa \*/;
const fullInputBlockRegex = /<label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">URL da Imagem do Mapa \*[\s\S]*?<\/div>\s*<\/div>/;

const newFormBlock = `<label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Código do Mapa *</label>
            <input 
              type="text" 
              value={formData.imageUrl ? (formData.imageUrl.match(/\\d+/) ? formData.imageUrl.match(/\\d+/)[0] : '') : ''}
              onChange={e => {
                const val = e.target.value.replace(/\\D/g, '');
                if (val) {
                  setFormData({ ...formData, imageUrl: \`https://raw.githubusercontent.com/Brawlify/CDN/master/maps/regular/\${val}.png\` });
                } else {
                  setFormData({ ...formData, imageUrl: '' });
                }
              }}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
              placeholder="Ex: 15000703"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">Apenas os números (ex: 15000703)</p>
            {formData.imageUrl && (
              <div className="mt-3 aspect-video bg-zinc-100 dark:bg-[#0A0A0A] rounded-lg border border-zinc-200 dark:border-[#2A2A2A] overflow-hidden flex items-center justify-center">
                 <img 
                   src={formData.imageUrl} 
                   alt="Preview do Mapa" 
                   className="w-full h-full object-contain"
                   onError={(e) => {
                     e.target.style.display = 'none';
                     e.target.parentElement.innerHTML = '<span class="text-zinc-500 text-sm">Imagem não encontrada</span>';
                   }}
                 />
              </div>
            )}
          </div>`;

content = content.replace(fullInputBlockRegex, newFormBlock);
fs.writeFileSync('src/components/maps/MapModals.tsx', content);
