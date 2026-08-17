const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/TrainingHistory.tsx', 'utf8');

if (!code.includes('ConfirmModal')) {
  code = code.replace(
    /import \{ cn \} from '\.\.\/\.\.\/lib\/utils';/,
    `import { cn } from '../../lib/utils';\nimport { ConfirmModal } from '../ui/ConfirmModal';`
  );
}

if (!code.includes('confirmConfig')) {
  code = code.replace(
    /const \[mapsMap, setMapsMap\] = useState<Record<string, any>>\(\{\}\);/,
    `const [mapsMap, setMapsMap] = useState<Record<string, any>>({});\n  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, action: (() => void) | null, title: string, message: string}>({ isOpen: false, action: null, title: '', message: '' });`
  );
}

code = code.replace(
  /const handleDelete = \(id: string, e: React\.MouseEvent\) => \{\s*e\.stopPropagation\(\);\s*if\(confirm\('Deseja excluir este registro de treino\? \(As partidas não serão excluídas\)'\)\) \{\s*sessionService\.deleteSession\(id\);\s*loadData\(\);\s*\}\s*\};/,
  `const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Treino',
      message: 'Deseja excluir este registro de treino? (As partidas não serão excluídas)',
      action: () => {
        sessionService.deleteSession(id);
        loadData();
      }
    });
  };`
);

// Add Generate Fake Data button if empty
const generateFakeDataFn = `
  const generateMockSession = async () => {
    // Generate a fake session 2 hours ago
    const session = sessionService.startSession();
    session.start_date = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    sessionService.endSession();
    
    const endedSession = sessionService.getSessions().find(s => s.id === session.id);
    if(endedSession) {
       endedSession.end_date = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
       sessionService.saveSessions(sessionService.getSessions().map(s => s.id === endedSession.id ? endedSession : s));
    }
    
    // Create 3 fake matches for this session
    const mapKeys = Object.keys(mapsMap);
    if(mapKeys.length > 0) {
      const match1 = { mapId: mapKeys[0], result: 'win', duration: 120, allyComps: [], enemyComps: [] };
      const match2 = { mapId: mapKeys[Math.min(1, mapKeys.length - 1)], result: 'loss', duration: 150, allyComps: [], enemyComps: [] };
      const match3 = { mapId: mapKeys[0], result: 'win', duration: 110, allyComps: [], enemyComps: [] };
      
      await analyticsService.saveMatch(match1 as any);
      // hack dates
      const all = await analyticsService.getAllMatches();
      const m1 = all[all.length - 1]; m1.match_date = new Date(Date.now() - 110 * 60 * 1000).toISOString();
      await analyticsService.saveMatch(match2 as any);
      const all2 = await analyticsService.getAllMatches();
      const m2 = all2[all2.length - 1]; m2.match_date = new Date(Date.now() - 90 * 60 * 1000).toISOString();
      await analyticsService.saveMatch(match3 as any);
      const all3 = await analyticsService.getAllMatches();
      const m3 = all3[all3.length - 1]; m3.match_date = new Date(Date.now() - 70 * 60 * 1000).toISOString();
      
      localStorage.setItem('tbk_matches', JSON.stringify(all3.map(m => m.id === m1.id ? m1 : m.id === m2.id ? m2 : m.id === m3.id ? m3 : m)));
    }
    loadData();
  };
`;

code = code.replace(
  /const loadData = async \(\) => \{/,
  generateFakeDataFn + '\n  const loadData = async () => {'
);

const emptyState = `          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-dashed border-slate-300 dark:border-[#2A2A2A]">
            <History className="w-12 h-12 text-slate-300 dark:text-zinc-600 mb-4" />
            <p className="text-slate-500 dark:text-zinc-400 font-medium">Nenhum treino registrado ainda.</p>
            <button onClick={generateMockSession} className="mt-4 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
              Gerar Treino de Exemplo
            </button>
          </div>`;

code = code.replace(
  /<div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-\[#1A1A1A\] rounded-2xl border border-dashed border-slate-300 dark:border-\[#2A2A2A\]">\s*<History className="w-12 h-12 text-slate-300 dark:text-zinc-600 mb-4" \/>\s*<p className="text-slate-500 dark:text-zinc-400 font-medium">Nenhum treino registrado ainda\.<\/p>\s*<\/div>/,
  emptyState
);

code = code.replace(
  /<\/div>\s*<\/div>\s*\)\;\s*\}\s*$/,
  `      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => {
          if (confirmConfig.action) {
            confirmConfig.action();
          }
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        variant="danger"
        confirmText="Excluir"
      />
    </div>
  );
}`
);

fs.writeFileSync('src/components/dashboard/TrainingHistory.tsx', code);
