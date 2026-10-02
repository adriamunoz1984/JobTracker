// src/theme/index.ts
export { AppThemeProvider, useAppTheme, makeStyles, getHeaderTitleStyle } from './ThemeContext';
export type { AppearancePreference } from './ThemeContext';
export {
  themes,
  themeOrder,
  DEFAULT_THEME,
  lightPalette,
  darkPalette,
  withOpacity,
} from './palettes';
export type { Palette, GradientSet, ThemeMode, ThemeId, ThemeDefinition } from './palettes';
export { Spacing, BorderRadius, Shadows, Typography } from './colors';
