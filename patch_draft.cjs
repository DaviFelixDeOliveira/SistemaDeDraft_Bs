const fs = require('fs');
let code = fs.readFileSync('src/components/draft/DraftWizard.tsx', 'utf8');

code = code.replace(
  /const resetDraft = \(\) => \{\s*setDraftState\(initialDraftState\);\s*setStep\(1\);/,
  `const resetDraft = () => {
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

code = code.replace(
  /onClick=\{\(\) => \{\s*if \(\s*draftState\.mapId \|\|\s*draftState\.picks\.length > 0 \|\|\s*draftState\.tbkBans\.some\(Boolean\)\s*\) \{\s*if \(window\.confirm\('Tem certeza que deseja limpar todos os campos do draft\?'\)\) \{\s*resetDraft\(\);\s*\}\s*\} else \{\s*resetDraft\(\);\s*\}\s*\}\}/,
  `onClick={() => {
              if (
                draftState.mapId ||
                draftState.picks.length > 0 ||
                draftState.tbkBans.some(Boolean) ||
                draftState.enemyBans.some(Boolean)
              ) {
                setConfirmResetOpen(true);
              } else {
                resetDraft();
              }
            }}`
);

const confirmModalHtml = `
      {confirmResetOpen && (
        <ConfirmModal
          isOpen={confirmResetOpen}
          title="Limpar Draft"
          message="Tem certeza que deseja limpar todos os campos do draft? Esta ação não pode ser desfeita."
          confirmText="Limpar Draft"
          variant="danger"
          onConfirm={() => resetDraft()}
          onCancel={() => setConfirmResetOpen(false)}
        />
      )}
`;

code = code.replace(
  /return \(\s*<div className="flex flex-col min-h-screen bg-slate-50 dark:bg-black">/,
  `return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-black">
      ${confirmModalHtml}`
);

fs.writeFileSync('src/components/draft/DraftWizard.tsx', code);
