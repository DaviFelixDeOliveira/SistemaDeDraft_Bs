const fs = require('fs');
let code = fs.readFileSync('src/contexts/ThemeContext.tsx', 'utf8');

code = code.replace(
  /const \[theme, setTheme\] = useState<Theme>\(\(\) => \{[\s\S]*?\}\);/,
  `const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light'; // Light as default fallback
  });

  // Sync automatically with system theme changes (Item 22)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    // Support modern API and fallback
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange); // Fallback for older browsers
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);`
);

fs.writeFileSync('src/contexts/ThemeContext.tsx', code);
