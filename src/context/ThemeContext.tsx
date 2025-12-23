import React, { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme as Theme;
    }
    // Detect system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const body = document.body;
    
    // Normalize logic: Always remove both, then add the current one.
    root.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');
    
    root.classList.add(theme);
    body.classList.add(theme);

    // Color scheme property
    root.style.colorScheme = theme;
    
    // Debug
    console.log(`Theme updated to '${theme}'. HTML classes: ${root.classList.value}`);
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      console.log('Toggling theme to:', newTheme);
      toast.success(`Tema cambiado a ${newTheme === 'dark' ? 'Oscuro' : 'Claro'}`, {
        id: 'theme-toast', // Prevent duplicates
        duration: 2000,
        position: 'bottom-center',
      });
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
