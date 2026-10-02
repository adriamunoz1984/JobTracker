// src/theme/palettes.ts
// "Summer Camp Massacre" theme — light (sunny cabin canvas) and dark (pine forest at midnight).
// Every screen reads colors from here through useAppTheme(), so changing a value here
// changes it everywhere in the app.

export type ThemeMode = 'light' | 'dark';

export interface Palette {
  // Brand
  primary: string;        // Campfire orange — main buttons, highlights
  primaryDark: string;
  primaryLight: string;
  onPrimary: string;      // Text/icons drawn on top of primary
  primaryBg: string;      // Soft campfire tint for selected/highlighted areas
  secondary: string;      // Pine green — headers, dark accents
  secondaryDark: string;
  secondaryLight: string;
  accent: string;         // Lantern amber
  accentDark: string;
  accentLight: string;

  // Status
  success: string;
  successLight: string;
  successBg: string;
  error: string;
  errorLight: string;
  errorBg: string;
  warning: string;
  warningLight: string;
  warningBg: string;
  info: string;
  infoLight: string;
  infoBg: string;

  // Surfaces
  background: string;     // Screen background
  surface: string;        // Cards
  surfaceDark: string;    // Subtle raised/sunken areas
  header: string;         // Navigation header background
  onHeader: string;       // Text/icons on the header

  // Text
  text: string;
  textSecondary: string;
  textLight: string;
  textInverse: string;    // Text on secondary/pine backgrounds

  // Borders
  border: string;
  borderLight: string;
  borderDark: string;

  // Misc
  overlay: string;        // Dimmed backdrop behind modals
  shadow: string;

  concrete: { mixer: string; wet: string; pump: string; truck: string };
  payment: { cash: string; check: string; charge: string; zelle: string; square: string };
}

export interface GradientSet {
  primary: [string, string];
  secondary: [string, string];
  success: [string, string];
  header: [string, string];
  card: [string, string];
  background: [string, string];
}

// ---------- Light: sunny cabin canvas ----------
export const lightPalette: Palette = {
  primary: '#B8461A',
  primaryDark: '#8A3412',
  primaryLight: '#E8692A',
  onPrimary: '#FFFFFF',
  primaryBg: '#FDEEE6',
  secondary: '#1F3324',
  secondaryDark: '#142218',
  secondaryLight: '#33452F',
  accent: '#946000',
  accentDark: '#7A4D00',
  accentLight: '#E0A33A',

  success: '#2A7130',
  successLight: '#4CAF50',
  successBg: '#E3F1E1',
  error: '#B3261E',
  errorLight: '#D9534F',
  errorBg: '#FBE3E1',
  warning: '#946000',
  warningLight: '#E0A33A',
  warningBg: '#FBEFD5',
  info: '#2F6690',
  infoLight: '#5B8DB8',
  infoBg: '#E1ECF5',

  background: '#F2EBDD',
  surface: '#FFFFFF',
  surfaceDark: '#E8DFCC',
  header: '#1F3324',
  onHeader: '#F1E6D2',

  text: '#1F3324',
  textSecondary: '#556453',
  textLight: '#6E786B',
  textInverse: '#FFFFFF',

  border: '#D9CDB8',
  borderLight: '#E8DFCC',
  borderDark: '#A89C85',

  overlay: 'rgba(20, 34, 24, 0.55)',
  shadow: '#000000',

  concrete: { mixer: '#B8B2A6', wet: '#8B8680', pump: '#B8461A', truck: '#1F3324' },
  payment: { cash: '#2A7130', check: '#2F6690', charge: '#946000', zelle: '#6B46C1', square: '#1F1F1F' },
};

// ---------- Dark: pine forest at midnight ----------
export const darkPalette: Palette = {
  primary: '#E8692A',
  primaryDark: '#B8461A',
  primaryLight: '#FF8F57',
  onPrimary: '#101A12',
  primaryBg: '#3A1C0E',
  secondary: '#24372A',
  secondaryDark: '#142218',
  secondaryLight: '#33452F',
  accent: '#F0B43C',
  accentDark: '#C98A12',
  accentLight: '#F7CB6B',

  success: '#6CC46F',
  successLight: '#8FD992',
  successBg: '#1E3A22',
  error: '#FF7A6E',
  errorLight: '#FF9A90',
  errorBg: '#4A1E1A',
  warning: '#F0B43C',
  warningLight: '#F7CB6B',
  warningBg: '#4A3510',
  info: '#7DB4E0',
  infoLight: '#A3CBEB',
  infoBg: '#18324A',

  background: '#101A12',
  surface: '#1B2A1E',
  surfaceDark: '#223426',
  header: '#0B130D',
  onHeader: '#F1E6D2',

  text: '#F1E6D2',
  textSecondary: '#AFB8A3',
  textLight: '#8F9989',
  textInverse: '#FFFFFF',

  border: '#33452F',
  borderLight: '#2A3B2D',
  borderDark: '#4A5E45',

  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',

  concrete: { mixer: '#8B8680', wet: '#6E6A64', pump: '#E8692A', truck: '#AFB8A3' },
  payment: { cash: '#6CC46F', check: '#7DB4E0', charge: '#F0B43C', zelle: '#A98BF0', square: '#E3E5E8' },
};

export const lightGradients: GradientSet = {
  primary: ['#B8461A', '#E8692A'],
  secondary: ['#1F3324', '#33452F'],
  success: ['#2E7D32', '#4CAF50'],
  header: ['#1F3324', '#33452F'],
  card: ['#FFFFFF', '#F7F2E8'],
  background: ['#F2EBDD', '#E8DFCC'],
};

export const darkGradients: GradientSet = {
  primary: ['#B8461A', '#E8692A'],
  secondary: ['#142218', '#24372A'],
  success: ['#2E7D32', '#4CAF50'],
  header: ['#0B130D', '#1B2A1E'],
  card: ['#1B2A1E', '#223426'],
  background: ['#101A12', '#142218'],
};

export const palettes: Record<ThemeMode, Palette> = { light: lightPalette, dark: darkPalette };
export const gradientSets: Record<ThemeMode, GradientSet> = { light: lightGradients, dark: darkGradients };

// Header font (Nosifer, the drippy campfire-story font). Use for big titles only —
// job details, numbers, and buttons stay in the normal readable font.
export const HeaderFont = 'Nosifer_400Regular';

/** Turn a palette hex (#RRGGBB) into rgba() with the given opacity — used by charts. */
export function withOpacity(hex: string, opacity = 1): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
