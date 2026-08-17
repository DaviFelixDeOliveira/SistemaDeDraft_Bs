const fs = require('fs');
let code = fs.readFileSync('src/components/draft/DraftWizard.tsx', 'utf8');

const historyState = `
  const [draftHistory, setDraftHistory] = useState<{state: DraftState, step: 1|2|3}[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track state changes to push to history
  const setDraftStateWithHistory = useCallback((value: React.SetStateAction<DraftState>) => {
    setDraftState(prev => {
      const nextState = typeof value === 'function' ? (value as Function)(prev) : value;
      if (JSON.stringify(prev) !== JSON.stringify(nextState)) {
        setDraftHistory(h => {
          const newHistory = [...h, { state: prev, step }];
          localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
          return newHistory;
        });
      }
      return nextState;
    });
  }, [step]);
  
  // Custom undo action
  const handleUndo = useCallback(() => {
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

  // Global Ctrl+Z listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        // Prevent default only if we have something to undo (and not typing in an input unless we want to override it)
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return; // Allow native undo in inputs
        }
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);
`;

code = code.replace(
  /const \[isLoading, setIsLoading\] = useState\(false\);\s*const \[confirmResetOpen, setConfirmResetOpen\] = useState\(false\);/,
  `const [isLoading, setIsLoading] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  ${historyState}`
);

// Replace setDraftState prop passed to children with setDraftStateWithHistory
code = code.replace(/setDraftState={setDraftState}/g, "setDraftState={setDraftStateWithHistory}");

// Add handleUndo to step picks as a prop, but wait, StepPicks takes draftState and setDraftState.
// If I pass onUndo to StepPicks, I need to update its props.

fs.writeFileSync('src/components/draft/DraftWizard.tsx', code);
