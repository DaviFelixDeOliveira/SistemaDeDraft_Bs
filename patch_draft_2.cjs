const fs = require('fs');
let code = fs.readFileSync('src/components/draft/DraftWizard.tsx', 'utf8');

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
  /return \(\s*<div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-0">/,
  `return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 md:px-0">
      ${confirmModalHtml}`
);

fs.writeFileSync('src/components/draft/DraftWizard.tsx', code);
