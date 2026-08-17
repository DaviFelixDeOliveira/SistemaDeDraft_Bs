const fs = require('fs');
let code = fs.readFileSync('src/components/draft/DraftWizard.tsx', 'utf8');

code = code.replace(
  /const handleUndo = useCallback\(\(fromPopState = false\) => \{[\s\S]*?\}, \[\]\);/m,
  `const performUndo = useCallback(() => {
    setDraftHistory(prevHistory => {
      if (prevHistory.length === 0) return prevHistory;
      
      const newHistory = [...prevHistory];
      const last = newHistory.pop();
      if (last) {
        setDraftState(last.state);
        setStep(last.step);
        localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
      }
      return newHistory;
    });
  }, []);

  // Custom undo action triggered by UI or Ctrl+Z
  const handleUndo = useCallback(() => {
    setDraftHistory(prevHistory => {
      if (prevHistory.length > 0) {
        // Trigger browser back, which will fire popstate and call performUndo
        window.history.back();
      }
      return prevHistory;
    });
  }, []);`
);

code = code.replace(
  /handleUndo\(true\);/g,
  `performUndo();`
);

fs.writeFileSync('src/components/draft/DraftWizard.tsx', code);
