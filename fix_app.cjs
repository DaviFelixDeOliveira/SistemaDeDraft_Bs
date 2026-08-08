const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Remove logoutTimer from state
content = content.replace("  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);\n  const [logoutTimer, setLogoutTimer] = useState<number | null>(null);", "  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);");

// Remove useEffect for logoutTimer
content = content.replace(/  useEffect\(\(\) => \{\n    if \(logoutTimer !== null\) \{[\s\S]*?\}, \[logoutTimer\]\);\n\n/, "");

// Modify confirmLogout and cancelLogout
content = content.replace(/  const confirmLogout = \(\) => \{\n    setShowLogoutConfirm\(false\);\n    setLogoutTimer\(3\);\n  \};\n\n  const cancelLogout = \(\) => \{\n    setLogoutTimer\(null\);\n  \};\n/, "  const confirmLogout = () => {\n    setShowLogoutConfirm(false);\n    setIsAuthenticated(false);\n  };\n");

// Remove the full page render for logoutTimer
content = content.replace(/  if \(logoutTimer !== null\) \{[\s\S]*?  \}\n/, "");

// Add delayMs and processingText to ConfirmModal
content = content.replace(/      <ConfirmModal \n        isOpen=\{showLogoutConfirm\}\n        onCancel=\{\(\) => setShowLogoutConfirm\(false\)\}\n        onConfirm=\{confirmLogout\}\n        title="Sair do Sistema"\n        message="Tem certeza que deseja sair do TBK Hub\?"\n        confirmText="Sim, Sair"\n        cancelText="Cancelar"\n        variant="danger"\n      \/>/g, `      <ConfirmModal \n        isOpen={showLogoutConfirm}\n        onCancel={() => setShowLogoutConfirm(false)}\n        onConfirm={confirmLogout}\n        title="Sair do Sistema"\n        message="Tem certeza que deseja sair do TBK Hub?"\n        confirmText="Sim, Sair"\n        cancelText="Cancelar"\n        processingText="Aguarde..."\n        successText="Deslogado com sucesso!"\n        variant="danger"\n        delayMs={3000}\n      />`);

fs.writeFileSync('src/App.tsx', content);
