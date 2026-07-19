import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// THEME CONTEXT — Dark/Light Theme Manager
// ============================================

const ThemeContext = createContext();

const STORAGE_KEY = 'kodomarket_theme';

const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  
  return 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [mounted, setMounted] = useState(false);
  const transitioningRef = useRef(null);

  // Appliquer le thème au DOM et sauvegarder
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
    setMounted(true);
  }, [theme]);

  // Écouter les changements de préférence système
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    // Activer la classe de transition sur <html>
    document.documentElement.classList.add('theme-transitioning');
    
    if (transitioningRef.current) {
      clearTimeout(transitioningRef.current);
    }
    
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    
    // Retirer la classe après la transition
    transitioningRef.current = setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 400);
  }, []);

  const setTheme = useCallback((newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      document.documentElement.classList.add('theme-transitioning');
      
      if (transitioningRef.current) {
        clearTimeout(transitioningRef.current);
      }
      
      setThemeState(newTheme);
      
      transitioningRef.current = setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 400);
    }
  }, []);

  const isDark = theme === 'dark';
  const isLight = theme === 'light';

  const value = {
    theme,
    isDark,
    isLight,
    toggleTheme,
    setTheme,
    mounted,
  };

  return React.createElement(
    ThemeContext.Provider,
    { value },
    children
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
