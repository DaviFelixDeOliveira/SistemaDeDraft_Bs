const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const globalInputListener = `
  // Global listener for ESC and Ctrl+Z on search inputs
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && (active.type === 'text' || active.type === 'search')) {
        const isSearchField = active.placeholder.toLowerCase().includes('buscar') || active.placeholder.toLowerCase().includes('pesquisar') || active.type === 'search' || active.placeholder.toLowerCase().includes('ban');
        
        if (e.key === 'Escape' || (isSearchField && (e.ctrlKey || e.metaKey) && e.key === 'z')) {
          e.preventDefault();
          e.stopPropagation();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(active, '');
            const event = new Event('input', { bubbles: true });
            active.dispatchEvent(event);
          }
        }
      }
    };
    // Use capture phase to intercept before React synthetic events if needed
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, []);
`;

code = code.replace(
  /const handleViewChange = \(view: string\) => \{/,
  globalInputListener + '\n  const handleViewChange = (view: string) => {'
);

fs.writeFileSync('src/App.tsx', code);
