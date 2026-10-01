
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeMode = 'normal' | 'write' | 'color';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('app_theme');
        return (saved as ThemeMode) || 'normal';
      } catch { return 'normal'; }
    }
    return 'normal';
  });

  useEffect(() => {
    try { localStorage.setItem('app_theme', theme); } catch {}
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
