const fs = require('fs');
let code = fs.readFileSync('src/components/draft/StepPicks.tsx', 'utf8');

if (!code.includes('onUndo')) {
  code = code.replace(
    /interface StepPicksProps \{/,
    `interface StepPicksProps {\n  onUndo?: () => void;`
  );
  
  code = code.replace(
    /export function StepPicks\(\{ draftState, setDraftState \}: StepPicksProps\) \{/,
    `export function StepPicks({ draftState, setDraftState, onUndo }: StepPicksProps) {`
  );
  
  code = code.replace(
    /const handleUndoPick = \(\) => \{\s*setDraftState\(prev => \(\{\s*\.\.\.prev,\s*picks: prev\.picks\.slice\(0, -1\)\s*\}\)\);\s*\};/,
    `const handleUndoPick = () => {
    if (onUndo) {
      onUndo();
    } else {
      setDraftState(prev => ({
        ...prev,
        picks: prev.picks.slice(0, -1)
      }));
    }
  };`
  );

  fs.writeFileSync('src/components/draft/StepPicks.tsx', code);
}
