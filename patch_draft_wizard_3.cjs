const fs = require('fs');
let code = fs.readFileSync('src/components/draft/DraftWizard.tsx', 'utf8');

code = code.replace(
  /const handleNextStep = \(\) => \{\s*if \(step < 3\) \{\s*setIsLoading\(true\);\s*setTimeout\(\(\) => \{\s*setStep\(\(s\) => \(s \+ 1\) as 1 \| 2 \| 3\);\s*setIsLoading\(false\);\s*\}, 800\);\s*\}\s*\};/,
  `const handleNextStep = () => {
    if (step < 3) {
      setIsLoading(true);
      setTimeout(() => {
        setDraftHistory(h => {
          const newHistory = [...h, { state: draftState, step }];
          localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
          return newHistory;
        });
        setStep((s) => (s + 1) as 1 | 2 | 3);
        setIsLoading(false);
      }, 800);
    }
  };`
);

code = code.replace(
  /const handlePrevStep = \(\) => \{\s*if \(step > 1\) setStep\(\(s\) => \(s - 1\) as 1 \| 2 \| 3\);\s*\};/,
  `const handlePrevStep = () => {
    if (step > 1) {
      setDraftHistory(h => {
        const newHistory = [...h, { state: draftState, step }];
        localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
        return newHistory;
      });
      setStep((s) => (s - 1) as 1 | 2 | 3);
    }
  };`
);

code = code.replace(
  /const resetDraft = \(\) => \{\s*setDraftState\(\{\s*mapId: '',\s*tbkStarts: true,\s*tbkBans: \[null, null, null\],\s*enemyBans: \[null, null, null\],\s*picks: \[\],\s*playerAssignments: \{\}\s*\}\);\s*setStep\(1\);\s*setConfirmResetOpen\(false\);/,
  `const resetDraft = () => {
    setDraftHistory(h => {
      const newHistory = [...h, { state: draftState, step }];
      localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
    setDraftState({
      mapId: '',
      tbkStarts: true,
      tbkBans: [null, null, null],
      enemyBans: [null, null, null],
      picks: [],
      playerAssignments: {}
    });
    setStep(1);
    setConfirmResetOpen(false);`
);

fs.writeFileSync('src/components/draft/DraftWizard.tsx', code);
