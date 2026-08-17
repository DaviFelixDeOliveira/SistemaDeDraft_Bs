const fs = require('fs');
let code = fs.readFileSync('src/components/draft/DraftWizard.tsx', 'utf8');

const historyKey = "\nconst DRAFT_HISTORY_KEY = 'tbk_hub_draft_history';";
if (!code.includes('DRAFT_HISTORY_KEY')) {
  code = code.replace(/const DRAFT_STEP_KEY = 'tbk_hub_draft_step';/, "const DRAFT_STEP_KEY = 'tbk_hub_draft_step';" + historyKey);
}

// Add useCallback import
if (!code.includes('useCallback')) {
  code = code.replace(/import \{ useState, useEffect \} from 'react';/, "import { useState, useEffect, useCallback } from 'react';");
}

fs.writeFileSync('src/components/draft/DraftWizard.tsx', code);
