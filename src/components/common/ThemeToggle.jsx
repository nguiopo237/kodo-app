import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, toggleTheme, isDark, mounted } = useTheme();

  // Ne pas rendre avant le montage pour éviter le flash
  if (!mounted) return null;

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      type="button"
    >
      <div className="theme-toggle-track">
        <div className={`theme-toggle-thumb ${isDark ? 'dark' : 'light'}`}>
          <span className="theme-toggle-icon">
            {isDark ? '🌙' : '☀️'}
          </span>
        </div>
        <div className="theme-toggle-icons">
          <span className="theme-toggle-icon-light">☀️</span>
          <span className="theme-toggle-icon-dark">🌙</span>
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle;
