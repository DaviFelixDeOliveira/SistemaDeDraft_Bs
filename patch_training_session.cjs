const fs = require('fs');
let code = fs.readFileSync('src/components/draft/TrainingSessionManager.tsx', 'utf8');

code = code.replace(
  /const \[isConfirmingEnd, setIsConfirmingEnd\] = useState\(false\);/,
  `const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [progress, setProgress] = useState(0);`
);

code = code.replace(
  /const handleStart = \(\) => \{\s*try \{\s*const session = sessionService\.startSession\(\);\s*setActiveSession\(session\);\s*\} catch \(e: any\) \{\s*alert\(e\.message\);\s*\}\s*\};/,
  `const handleStart = () => {
    setIsStarting(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            try {
              const session = sessionService.startSession();
              setActiveSession(session);
            } catch (e: any) {
              alert(e.message);
            }
            setIsStarting(false);
          }, 100);
          return 100;
        }
        return p + 5;
      });
    }, 50);
  };`
);

code = code.replace(
  /const handleEnd = async \(\) => \{\s*if \(\!activeSession\) return;\s*\/\/ Check if there are matches in this session\s*const matches = await analyticsService\.getAllMatches\(\);\s*const start = new Date\(activeSession\.start_date\)\.getTime\(\);\s*const now = new Date\(\)\.getTime\(\);\s*const sessionMatches = matches\.filter\(m => \{\s*const matchTime = new Date\(m\.match_date\)\.getTime\(\);\s*return matchTime >= start && matchTime <= now;\s*\}\);\s*if \(sessionMatches\.length === 0\) \{\s*\/\/ Don't save empty sessions\s*sessionService\.deleteSession\(activeSession\.id\);\s*\} else \{\s*sessionService\.endSession\(\);\s*\}\s*setActiveSession\(null\);\s*setIsConfirmingEnd\(false\);\s*\};/,
  `const handleEnd = () => {
    if (!activeSession) return;
    setIsEnding(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            const matches = await analyticsService.getAllMatches();
            const start = new Date(activeSession.start_date).getTime();
            const now = new Date().getTime();
            
            const sessionMatches = matches.filter(m => {
              const matchTime = new Date(m.match_date).getTime();
              return matchTime >= start && matchTime <= now;
            });
            
            if (sessionMatches.length === 0) {
              sessionService.deleteSession(activeSession.id);
            } else {
              sessionService.endSession();
            }
            
            setActiveSession(null);
            setIsConfirmingEnd(false);
            setIsEnding(false);
          }, 100);
          return 100;
        }
        return p + 5;
      });
    }, 50);
  };`
);

code = code.replace(
  /if \(\!activeSession\) \{\s*return \(\s*<div className="bg-white dark:bg-\[#121212\] border border-slate-200 dark:border-\[#2A2A2A\] rounded-xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-4">\s*<div>\s*<h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">\s*<CalendarDays className="w-5 h-5 text-indigo-500" \/>\s*Sessão de Treino \(Scrims\)\s*<\/h3>\s*<p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Inicie um treino para agrupar partidas no histórico\.<\/p>\s*<\/div>\s*<button\s*onClick=\{handleStart\}\s*className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2\.5 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"\s*>\s*<Play className="w-4 h-4 fill-current" \/>\s*Iniciar Treino\s*<\/button>\s*<\/div>\s*\);\s*\}/,
  `if (!activeSession) {
    return (
      <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#2A2A2A] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            Sessão de Treino (Scrims)
          </h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Inicie um treino para agrupar partidas no histórico.</p>
        </div>
        
        {isStarting ? (
          <div className="w-full sm:w-48 bg-zinc-100 dark:bg-[#1A1A1A] h-10 rounded-lg relative overflow-hidden flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-indigo-500 transition-all duration-75 ease-linear" 
              style={{ width: \`\${progress}%\` }}
            />
            <span className="relative z-10 text-xs font-bold text-zinc-900 dark:text-white mix-blend-difference">
              Iniciando...
            </span>
          </div>
        ) : (
          <button
            onClick={handleStart}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current" />
            Iniciar Treino
          </button>
        )}
      </div>
    );
  }`
);

code = code.replace(
  /<div className="relative z-10 flex items-center gap-3 w-full sm:w-auto">\s*\{isConfirmingEnd \? \([\s\S]*?Encerrar Agora\s*<\/button>\s*<\/>\s*\) : \(\s*<button\s*onClick=\{\(\) => setIsConfirmingEnd\(true\)\}\s*className="flex-1 sm:flex-none bg-white dark:bg-zinc-800 text-red-500 hover:text-white hover:bg-red-500 border border-red-200 dark:border-red-900\/50 px-6 py-2\.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-sm group"\s*>\s*<Square className="w-4 h-4 fill-current transition-colors" \/>\s*Encerrar Treino\s*<\/button>\s*\)\}\s*<\/div>/,
  `<div className="relative z-10 flex items-center gap-3 w-full sm:w-auto">
        {isEnding ? (
          <div className="w-full sm:w-48 bg-red-500/10 h-10 rounded-lg relative overflow-hidden flex items-center justify-center border border-red-500/20">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-red-500 transition-all duration-75 ease-linear" 
              style={{ width: \`\${progress}%\` }}
            />
            <span className="relative z-10 text-xs font-bold text-zinc-900 dark:text-white mix-blend-difference">
              Encerrando...
            </span>
          </div>
        ) : isConfirmingEnd ? (
          <>
            <button
              onClick={() => setIsConfirmingEnd(false)}
              className="flex-1 sm:flex-none bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEnd}
              className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm"
            >
              Encerrar Agora
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsConfirmingEnd(true)}
            className="flex-1 sm:flex-none bg-white dark:bg-zinc-800 text-red-500 hover:text-white hover:bg-red-500 border border-red-200 dark:border-red-900/50 px-6 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-sm group"
          >
            <Square className="w-4 h-4 fill-current transition-colors" />
            Encerrar Treino
          </button>
        )}
      </div>`
);

fs.writeFileSync('src/components/draft/TrainingSessionManager.tsx', code);
