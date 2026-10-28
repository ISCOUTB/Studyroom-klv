'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const CLAVE_TEMA = 'studyroom-theme';

type ThemeContextValue = {
  temaOscuro: boolean;
  listo: boolean;
  alternarTema: () => void;
  establecerTema: (oscuro: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function aplicarTema(oscuro: boolean) {
  if (typeof document === 'undefined') return;

  const raiz = document.documentElement;
  raiz.classList.toggle('dark', oscuro);
  raiz.style.colorScheme = oscuro ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [temaOscuro, setTemaOscuro] = useState(false);
  const [listo, setListo] = useState(false);

  // Lee la preferencia guardada (o la del sistema) al montar.
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(CLAVE_TEMA);
      const prefiereOscuro = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      setTemaOscuro(guardado ? guardado === 'dark' : prefiereOscuro);
    } catch {
      // Sin acceso a localStorage: se mantiene el tema claro.
    } finally {
      setListo(true);
    }
  }, []);

  // Aplica el tema al documento completo y guarda la preferencia.
  useEffect(() => {
    if (!listo) return;

    aplicarTema(temaOscuro);

    try {
      window.localStorage.setItem(CLAVE_TEMA, temaOscuro ? 'dark' : 'light');
    } catch {
      // Ignorado: el tema no se conservará entre visitas.
    }
  }, [temaOscuro, listo]);

  const alternarTema = useCallback(() => {
    setTemaOscuro((valor) => !valor);
  }, []);

  const establecerTema = useCallback((oscuro: boolean) => {
    setTemaOscuro(oscuro);
  }, []);

  const valor = useMemo(
    () => ({ temaOscuro, listo, alternarTema, establecerTema }),
    [temaOscuro, listo, alternarTema, establecerTema]
  );

  return (
    <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const contexto = useContext(ThemeContext);

  if (!contexto) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider.');
  }

  return contexto;
}
