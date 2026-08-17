const fs = require('fs');
let code = fs.readFileSync('src/components/draft/DraftWizard.tsx', 'utf8');

code = code.replace(
  /localStorage\.setItem\(DRAFT_HISTORY_KEY, JSON\.stringify\(newHistory\)\);\s*return newHistory;/g,
  `localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
          window.history.pushState({ isDraftUndo: true }, '');
          return newHistory;`
);

code = code.replace(
  /const handleUndo = useCallback\(\(\) => \{/,
  `// Sync with mobile back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.isDraftUndo) {
        // This is theoretically not possible because if they pop, the state is gone.
        // Actually, if they press back, the current state becomes the PREVIOUS state.
        // So we just pop our draft history.
      }
      handleUndo(true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleUndo = useCallback((fromPopState = false) => {`
);

// We need to also make handleUndo handle the browser history if it wasn't triggered by popstate
code = code.replace(
  /setStep\(last\.step\);\s*localStorage\.setItem\(DRAFT_HISTORY_KEY, JSON\.stringify\(newHistory\)\);\s*\}/,
  `setStep(last.step);
        localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
        if (!fromPopState) {
          // We need to go back in browser history so it matches our stack
          window.history.back();
        }
      }`
);

fs.writeFileSync('src/components/draft/DraftWizard.tsx', code);
