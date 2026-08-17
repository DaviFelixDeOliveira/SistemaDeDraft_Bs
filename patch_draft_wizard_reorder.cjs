const fs = require('fs');
let code = fs.readFileSync('src/components/draft/DraftWizard.tsx', 'utf8');

const popstateEffect = `  // Sync with mobile back button
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
  }, [handleUndo]);`;

code = code.replace(/\s*\/\/ Sync with mobile back button[\s\S]*?}, \[\]\);/, '');

code = code.replace(
  /const handleUndo = useCallback[\s\S]*?\}, \[\]\);/,
  match => match + '\n\n' + popstateEffect
);

fs.writeFileSync('src/components/draft/DraftWizard.tsx', code);
