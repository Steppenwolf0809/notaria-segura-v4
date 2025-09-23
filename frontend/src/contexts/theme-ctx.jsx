import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import useThemeStore from '../store/theme-store';
import { getTheme as storageGetTheme, setTheme as storageSetTheme } from '../utils/storage';

// Valores permitidos para el modo de tema
const MODES = ['system', 'light', 'dark'];

const ThemeCtx = createContext({
  mode: 'system',               // 'light' | 'dark' | 'system'
  resolvedMode: 'light',        // 'light' | 'dark' (resuelto considerando system)
  resolvedIsDark: false,        // boolean para MUI ThemeProvider
  setMode: (_m) => {},
  cycleMode: () => {},
});

export const ThemeCtxProvider = ({ children }) => {
  // 1) Estado de preferencia del usuario
  const [mode, setMode] = useState(() => {
    const initial = storageGetTheme();
    return MODES.includes(initial) ? initial : 'system';
  });

  // 2) Preferencia del sistema (OS)
  const [prefersDark, setPrefersDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  // 3) Escuchar cambios del sistema
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e) => setPrefersDark(e.matches);
    try {
      media.addEventListener('change', listener);
    } catch {
      // Safari
      media.addListener(listener);
    }
    return () => {
      try {
        media.removeEventListener('change', listener);
      } catch {
        media.removeListener(listener);
      }
    };
  }, []);

  // 4) Resolver tema efectivo
  const resolvedIsDark = useMemo(() => {
    if (mode === 'system') return prefersDark;
    return mode === 'dark';
  }, [mode, prefersDark]);

  const resolvedMode = resolvedIsDark ? 'dark' : 'light';

  // 5) Persistencia + atributo data-theme + sincronización con Zustand
  const { setTheme } = useThemeStore();
  useEffect(() => {
    storageSetTheme(mode);
    document.documentElement.setAttribute('data-theme', resolvedIsDark ? 'dark' : 'light');
    // Mantener compatibilidad hacia atrás con store existente (isDarkMode boolean)
    setTheme(resolvedIsDark);
  }, [mode, resolvedIsDark, setTheme]);

  // 6) Cambiar modo explícito
  const setModeSafe = useCallback((next) => {
    const safe = MODES.includes(next) ? next : 'system';
    // eslint-disable-next-line no-console
    console.info('[THEME]', { nextTheme: safe });
    setMode(safe);
  }, []);

  // 7) Ciclo de modo: system -> light -> dark -> system
  const cycleMode = useCallback(() => {
    const idx = MODES.indexOf(mode);
    const next = MODES[(idx + 1) % MODES.length];
    // eslint-disable-next-line no-console
    console.info('[THEME]', { nextTheme: next });
    setMode(next);
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    resolvedMode,
    resolvedIsDark,
    setMode: setModeSafe,
    cycleMode,
  }), [mode, resolvedMode, resolvedIsDark, setModeSafe, cycleMode]);

  return (
    <ThemeCtx.Provider value={value}>
      {children}
    </ThemeCtx.Provider>
  );
};

export const useThemeCtx = () => useContext(ThemeCtx);

export default ThemeCtx;