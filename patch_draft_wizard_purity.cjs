const fs = require('fs');
let code = fs.readFileSync('src/components/draft/DraftWizard.tsx', 'utf8');

if (!code.includes('useRef')) {
  code = code.replace(/import \{ useState, useEffect, useCallback \} from 'react';/, "import { useState, useEffect, useCallback, useRef } from 'react';");
}

const replacement = `
  const latestDraftState = useRef(draftState);
  useEffect(() => {
    latestDraftState.current = draftState;
  }, [draftState]);

  // Track state changes to push to history
  const setDraftStateWithHistory = useCallback((value: React.SetStateAction<DraftState>) => {
    const prev = latestDraftState.current;
    const nextState = typeof value === 'function' ? (value as Function)(prev) : value;
    
    if (JSON.stringify(prev) !== JSON.stringify(nextState)) {
      setDraftHistory(h => {
        const newHistory = [...h, { state: prev, step }];
        localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(newHistory));
        return newHistory;
      });
      window.history.pushState({ isDraftUndo: true }, '');
      setDraftState(nextState);
    }
  }, [step]);
`;

code = code.replace(
  /\/\/ Track state changes to push to history[\s\S]*?\}, \[step\]\);/,
  replacement
);

fs.writeFileSync('src/components/draft/DraftWizard.tsx', code);
