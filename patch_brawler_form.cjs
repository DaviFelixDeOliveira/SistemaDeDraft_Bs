const fs = require('fs');
let content = fs.readFileSync('src/components/brawlers/BrawlerModal.tsx', 'utf8');

const imageRegex1 = /<label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">URL da Imagem de Corpo \(Card\)<\/label>[\s\S]*?<\/div>/;
const imageRegex2 = /<label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">URL do Ícone \(Avatar\)<\/label>[\s\S]*?<\/div>/;

const newImage1 = `<label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Código do Brawler (Imagem Corpo)</label>
             <input 
                 type="text" 
                 value={formData.imageUrl ? (formData.imageUrl.match(/\\d+/) ? formData.imageUrl.match(/\\d+/)[0] : '') : ''}
                 onChange={e => {
                   const val = e.target.value.replace(/\\D/g, '');
                   if (val) {
                     setFormData({ ...formData, imageUrl: \`https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/portraits/\${val}.png\` });
                   } else {
                     setFormData({ ...formData, imageUrl: '' });
                   }
                 }}
                 className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
                 placeholder="Ex: 16000000"
             />
             {formData.imageUrl && <p className="text-xs text-zinc-500 mt-1 text-right">URL gerada com sucesso.</p>}
          </div>`;
          
const newImage2 = `<label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Código do Brawler (Ícone)</label>
             <input 
                 type="text" 
                 value={formData.iconUrl ? (formData.iconUrl.match(/\\d+/) ? formData.iconUrl.match(/\\d+/)[0] : '') : ''}
                 onChange={e => {
                   const val = e.target.value.replace(/\\D/g, '');
                   if (val) {
                     setFormData({ ...formData, iconUrl: \`https://raw.githubusercontent.com/Brawlify/CDN/master/brawlers/emoji/\${val}.png\` });
                   } else {
                     setFormData({ ...formData, iconUrl: '' });
                   }
                 }}
                 className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
                 placeholder="Ex: 16000000"
             />
             {formData.iconUrl && <p className="text-xs text-zinc-500 mt-1 text-right">URL gerada com sucesso.</p>}
          </div>`;

content = content.replace(imageRegex1, newImage1);
content = content.replace(imageRegex2, newImage2);

fs.writeFileSync('src/components/brawlers/BrawlerModal.tsx', content);
