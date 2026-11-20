import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  hue: number;
  saturation: number;
  isDark: boolean;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setIsDark: (isDark: boolean) => void;
  resetTheme: () => void;
}

const DEFAULT_HUE = 221.2;
const DEFAULT_SATURATION = 83.2;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hue, setHueState] = useState<number>(() => {
    const saved = localStorage.getItem('hms-theme-hue');
    return saved ? parseFloat(saved) : DEFAULT_HUE;
  });

  const [saturation, setSaturationState] = useState<number>(() => {
    const saved = localStorage.getItem('hms-theme-saturation');
    return saved ? parseFloat(saved) : DEFAULT_SATURATION;
  });

  const [isDark, setIsDarkState] = useState<boolean>(() => {
    // Enforce master Midnight Navy theme as the standard default for all sessions
    const migrated = localStorage.getItem('hms-theme-midnight-v1');
    if (!migrated) {
      localStorage.setItem('hms-theme-midnight-v1', 'true');
      localStorage.setItem('hms-theme-dark', 'true');
      document.documentElement.classList.add('dark');
      return true;
    }
    const saved = localStorage.getItem('hms-theme-dark');
    return saved !== null ? saved === 'true' : true;
  });

  // Apply theme configurations to document element
  useEffect(() => {
    document.documentElement.style.setProperty('--theme-hue', String(hue));
    localStorage.setItem('hms-theme-hue', String(hue));
  }, [hue]);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-saturation', `${saturation}%`);
    localStorage.setItem('hms-theme-saturation', String(saturation));
  }, [saturation]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      document.documentElement.style.backgroundColor = '#070e1e';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      document.documentElement.style.backgroundColor = '';
    }
    localStorage.setItem('hms-theme-dark', String(isDark));
  }, [isDark]);

  const setHue = (h: number) => setHueState(h);
  const setSaturation = (s: number) => setSaturationState(s);
  const setIsDark = (d: boolean) => setIsDarkState(d);

  const resetTheme = () => {
    setHueState(DEFAULT_HUE);
    setSaturationState(DEFAULT_SATURATION);
    setIsDarkState(true);
    document.documentElement.classList.add('dark');
  };

  return (
    <ThemeContext.Provider value={{ hue, saturation, isDark, setHue, setSaturation, setIsDark, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
