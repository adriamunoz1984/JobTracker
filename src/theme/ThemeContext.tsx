// src/theme/ThemeContext.tsx
// Provides the current theme + palette (light or dark) to the whole app.
// - Theme: one of the horror themes (or Clean Concrete), picked in Profile.
// - Appearance: follow the phone ("system"), or lock to light / dark.
// Both choices are saved on the phone and restored on the next launch.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextStyle, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_THEME,
  GradientSet,
  Palette,
  ThemeDefinition,
  ThemeId,
  ThemeMode,
  themes,
} from './palettes';

export type AppearancePreference = 'system' | 'light' | 'dark';

const APPEARANCE_KEY = 'appearancePreference';
const THEME_KEY = 'themeId';

interface ThemeContextValue {
  mode: ThemeMode;                       // What is actually showing right now
  isDark: boolean;
  colors: Palette;
  gradients: GradientSet;
  theme: ThemeDefinition;                // Current theme (name, header font, ...)
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  headerTitleStyle: TextStyle;           // Font for the top bar / big titles
  preference: AppearancePreference;      // What the user picked for light/dark
  setPreference: (p: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function getHeaderTitleStyle(theme: ThemeDefinition): TextStyle {
  return theme.headerFont
    ? { fontFamily: theme.headerFont, fontSize: theme.headerFontSize, fontWeight: 'normal' }
    : { fontSize: theme.headerFontSize, fontWeight: 'bold' };
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME);

  // Load the saved choices once on startup.
  useEffect(() => {
    AsyncStorage.multiGet([APPEARANCE_KEY, THEME_KEY])
      .then(([[, savedAppearance], [, savedTheme]]) => {
        if (savedAppearance === 'light' || savedAppearance === 'dark' || savedAppearance === 'system') {
          setPreferenceState(savedAppearance);
        }
        if (savedTheme && savedTheme in themes) {
          setThemeIdState(savedTheme as ThemeId);
        }
      })
      .catch(() => {});
  }, []);

  const setPreference = (p: AppearancePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(APPEARANCE_KEY, p).catch(() => {});
  };

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_KEY, id).catch(() => {});
  };

  const mode: ThemeMode =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(() => {
    const theme = themes[themeId];
    return {
      mode,
      isDark: mode === 'dark',
      colors: mode === 'dark' ? theme.dark : theme.light,
      gradients: mode === 'dark' ? theme.darkGradients : theme.lightGradients,
      theme,
      themeId,
      setThemeId,
      headerTitleStyle: getHeaderTitleStyle(theme),
      preference,
      setPreference,
    };
  }, [mode, preference, themeId]);

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
 * each component calls the returned hook to get styles for the current theme + mode.
 *
 *   const useStyles = makeStyles((Colors) => ({ card: { backgroundColor: Colors.surface } }));
 *   function MyScreen() { const styles = useStyles(); ... }
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: Palette, gradients: GradientSet, theme: ThemeDefinition) => T
): () => T {
  const cache: Record<string, T> = {};
  return function useStyles(): T {
    const { mode, colors, gradients, theme } = useAppTheme();
    const key = `${theme.id}:${mode}`;
    if (!cache[key]) {
      cache[key] = StyleSheet.create(factory(colors, gradients, theme)) as T;
    }
    return cache[key];
  };
}
