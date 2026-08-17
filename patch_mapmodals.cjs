const fs = require('fs');
let code = fs.readFileSync('src/components/maps/MapModals.tsx', 'utf8');

const dropdown = `          <div>
            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Modo de Jogo</label>
            <select 
              value={formData.mode || 'Pique-Gema'}
              onChange={e => setFormData({ ...formData, mode: e.target.value as any })}
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-[#FF3366]"
            >
              <option value="Pique-Gema">Pique-Gema</option>
              <option value="Fute-Brawl">Fute-Brawl</option>
              <option value="Caça-Estrelas">Caça-Estrelas</option>
              <option value="Roubo">Roubo</option>
              <option value="Zona Estratégica">Zona Estratégica</option>
              <option value="Nocaute">Nocaute</option>
            </select>
          </div>
`;

code = code.replace(
  /<div>\s*<label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Terreno do Mapa<\/label>/,
  dropdown + '\n          <div>\n            <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">Terreno do Mapa</label>'
);

fs.writeFileSync('src/components/maps/MapModals.tsx', code);
