// src/theme/ThemeContext.tsx
// Provides the current palette (light or dark) to the whole app.
// Appearance can follow the phone ("system") or be locked to light/dark from Profile.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradientSet, Palette, ThemeMode, gradientSets, palettes } from './palettes';

export type AppearancePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'appearancePreference';

interface ThemeContextValue {
  mode: ThemeMode;                       // What is actually showing right now
  isDark: boolean;
  colors: Palette;
  gradients: GradientSet;
  preference: AppearancePreference;      // What the user picked
  setPreference: (p: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');

  // Load the saved choice once on startup.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreferenceState(saved);
        }
      })
      .catch(() => {});
  }, []);

  const setPreference = (p: AppearancePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === 'dark',
      colors: palettes[mode],
      gradients: gradientSets[mode],
      preference,
      setPreference,
    }),
    [mode, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used inside <AppThemeProvider>');
  }
  return ctx;
}

/**
 * Build a themed stylesheet. Write styles once as a function of the palette;
 * each component calls the returned hook to get styles for the current mode.
 *
 *   const useStyles = makeStyles((Colors) => ({ card: { backgroundColor: Colors.surface } }));
 *   function MyScreen() { const styles = useStyles(); ... }
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: Palette, gradients: GradientSet) => T
): () => T {
  const cache: Partial<Record<ThemeMode, T>> = {};
  return function useStyles(): T {
    const { mode, colors, gradients } = useAppTheme();
    if (!cache[mode]) {
      cache[mode] = StyleSheet.create(factory(colors, gradients)) as T;
    }
    return cache[mode] as T;
  };
}
