// src/theme/palettes.ts
// All app themes. Each theme has a light and a dark version.
// Screens read colors through useAppTheme(), so editing a value here changes it everywhere.
//
// Color rule that keeps text readable: every "fill" color (primary, secondary, accent,
// success, error, warning, info, and the gradients) must read well with `onPrimary`
// (which is the same as `textInverse`). Light modes use deep fills + white text;
// dark modes use bright fills + near-black text. Run the contrast check before changing.

export type ThemeMode = 'light' | 'dark';

export type ThemeId =
  | 'summerCamp'
  | 'vhsSlasher'
  | 'neonNightmare'
  | 'zombieOutbreak'
  | 'comicCrypt'
  | 'lateNightStatic'
  | 'cleanConcrete';

export interface Palette {
  // Brand
  primary: string;        // Main buttons, highlights, links
  primaryDark: string;
  primaryLight: string;
  onPrimary: string;      // Text/icons drawn on any colored fill
  primaryBg: string;      // Soft tint for selected/highlighted areas
  secondary: string;      // Secondary buttons and fills
  secondaryDark: string;
  secondaryLight: string;
  accent: string;
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
  header: string;         // Top bar background (dark in every theme)
  onHeader: string;       // Text/icons on the top bar

  // Text
  text: string;
  textSecondary: string;
  textLight: string;
  textInverse: string;    // Same as onPrimary — text on colored fills/banners

  // Borders
  border: string;
  borderLight: string;
  borderDark: string;

  // Misc
  overlay: string;
  shadow: string;

  concrete: { mixer: string; wet: string; pump: string; truck: string };
  payment: { cash: string; check: string; charge: string; zelle: string; square: string };
}

export interface GradientSet {
  primary: [string, string];
  primaryAccent: [string, string];
  secondary: [string, string];
  accent: [string, string];
  success: [string, string];
  info: [string, string];
  header: [string, string];
  card: [string, string];
  background: [string, string];
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  headerFont?: string;      // undefined = normal system font (bold)
  headerFontSize: number;   // Fancy fonts differ a lot in width
  light: Palette;
  dark: Palette;
  lightGradients: GradientSet;
  darkGradients: GradientSet;
}

// ---------- color helpers ----------
function mix(hex: string, target: string, amount: number): string {
  const a = hex.replace('#', '');
  const b = target.replace('#', '');
  const ch = (s: string, i: number) => parseInt(s.substring(i, i + 2), 16);
  const out = [0, 2, 4].map(i => {
    const v = Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * amount);
    return v.toString(16).padStart(2, '0');
  });
  return `#${out.join('').toUpperCase()}`;
}
const darken = (hex: string, amt: number) => mix(hex, '#000000', amt);
const lighten = (hex: string, amt: number) => mix(hex, '#FFFFFF', amt);

/** Turn a palette hex (#RRGGBB) into rgba() with the given opacity — used by charts. */
export function withOpacity(hex: string, opacity = 1): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

// ---------- shared status colors ----------
const lightStatus = {
  success: '#2A7130', successLight: '#4CAF50', successBg: '#E3F1E1',
  error: '#B3261E', errorLight: '#D9534F', errorBg: '#FBE3E1',
  warning: '#946000', warningLight: '#E0A33A', warningBg: '#FBEFD5',
  info: '#2F6690', infoLight: '#5B8DB8', infoBg: '#E1ECF5',
};
const darkStatus = {
  success: '#6CC46F', successLight: '#8FD992', successBg: '#1E3A22',
  error: '#FF7A6E', errorLight: '#FF9A90', errorBg: '#4A1E1A',
  warning: '#F0B43C', warningLight: '#F7CB6B', warningBg: '#4A3510',
  info: '#7DB4E0', infoLight: '#A3CBEB', infoBg: '#18324A',
};

// The handful of colors that define a theme mode; everything else is derived.
interface ModeSpec {
  background: string; surface: string; surfaceDark: string;
  header: string; onHeader: string;
  text: string; textSecondary: string; textLight: string;
  border: string; borderLight: string; borderDark: string;
  primary: string; primaryDark: string; primaryLight: string; primaryBg: string;
  secondary: string; accent: string;
}

function buildPalette(spec: ModeSpec, mode: ThemeMode): Palette {
  const isDark = mode === 'dark';
  const status = isDark ? darkStatus : lightStatus;
  // Light: white text on deep fills. Dark: near-black text (the background) on bright fills.
  const onFill = isDark ? spec.background : '#FFFFFF';
  return {
    ...status,
    primary: spec.primary,
    primaryDark: spec.primaryDark,
    primaryLight: spec.primaryLight,
    primaryBg: spec.primaryBg,
    onPrimary: onFill,
    secondary: spec.secondary,
    secondaryDark: isDark ? darken(spec.secondary, 0.15) : darken(spec.secondary, 0.25),
    secondaryLight: isDark ? lighten(spec.secondary, 0.15) : lighten(spec.secondary, 0.15),
    accent: spec.accent,
    accentDark: darken(spec.accent, 0.2),
    accentLight: lighten(spec.accent, 0.25),
    background: spec.background,
    surface: spec.surface,
    surfaceDark: spec.surfaceDark,
    header: spec.header,
    onHeader: spec.onHeader,
    text: spec.text,
    textSecondary: spec.textSecondary,
    textLight: spec.textLight,
    textInverse: onFill,
    border: spec.border,
    borderLight: spec.borderLight,
    borderDark: spec.borderDark,
    overlay: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    shadow: '#000000',
    concrete: {
      mixer: isDark ? '#8B8680' : '#B8B2A6',
      wet: isDark ? '#6E6A64' : '#8B8680',
      pump: spec.primary,
      truck: spec.textSecondary,
    },
    payment: isDark
      ? { cash: '#6CC46F', check: '#7DB4E0', charge: '#F0B43C', zelle: '#A98BF0', square: '#E3E5E8' }
      : { cash: '#2A7130', check: '#2F6690', charge: '#946000', zelle: '#6B46C1', square: '#1F1F1F' },
  };
}

function buildGradients(p: Palette, mode: ThemeMode): GradientSet {
  // Shift each fill away from the text color so banner text stays readable end to end.
  const shift = mode === 'dark' ? (c: string) => lighten(c, 0.2) : (c: string) => darken(c, 0.2);
  return {
    primary: [p.primary, shift(p.primary)],
    primaryAccent: [p.primary, p.accent],
    secondary: [p.secondary, shift(p.secondary)],
    accent: [p.accent, shift(p.accent)],
    success: [p.success, shift(p.success)],
    info: [p.info, shift(p.info)],
    header: [p.header, lighten(p.header, 0.08)],
    card: [p.surface, p.surfaceDark],
    background: [p.background, p.surfaceDark],
  };
}

function defineTheme(meta: Omit<ThemeDefinition, 'light' | 'dark' | 'lightGradients' | 'darkGradients'>,
                     light: ModeSpec, dark: ModeSpec): ThemeDefinition {
  const l = buildPalette(light, 'light');
  const d = buildPalette(dark, 'dark');
  return { ...meta, light: l, dark: d, lightGradients: buildGradients(l, 'light'), darkGradients: buildGradients(d, 'dark') };
}

// ---------- the themes ----------
export const themes: Record<ThemeId, ThemeDefinition> = {
  summerCamp: defineTheme(
    { id: 'summerCamp', name: 'Summer Camp Massacre', description: 'Campfire orange and pine green. Cabin canvas by day, midnight forest by night.',
      headerFont: 'Nosifer_400Regular', headerFontSize: 15 },
    { background: '#F2EBDD', surface: '#FFFFFF', surfaceDark: '#E8DFCC', header: '#1F3324', onHeader: '#F1E6D2',
      text: '#1F3324', textSecondary: '#556453', textLight: '#5F6A5C',
      border: '#D9CDB8', borderLight: '#E8DFCC', borderDark: '#A89C85',
      primary: '#B8461A', primaryDark: '#8A3412', primaryLight: '#E8692A', primaryBg: '#FDEEE6',
      secondary: '#1F3324', accent: '#946000' },
    { background: '#101A12', surface: '#1B2A1E', surfaceDark: '#223426', header: '#0B130D', onHeader: '#F1E6D2',
      text: '#F1E6D2', textSecondary: '#AFB8A3', textLight: '#8F9989',
      border: '#33452F', borderLight: '#2A3B2D', borderDark: '#4A5E45',
      primary: '#E8692A', primaryDark: '#B8461A', primaryLight: '#FF8F57', primaryBg: '#3A1C0E',
      secondary: '#D9CFBC', accent: '#F0B43C' },
  ),

  vhsSlasher: defineTheme(
    { id: 'vhsSlasher', name: 'VHS Slasher', description: 'Blood red on bone paper by day, pitch black by night.',
      headerFont: 'Creepster_400Regular', headerFontSize: 22 },
    { background: '#F4EFE8', surface: '#FFFFFF', surfaceDark: '#E9E1D6', header: '#1A1414', onHeader: '#F4EDE4',
      text: '#1A1414', textSecondary: '#5A4E48', textLight: '#6E625C',
      border: '#E2D6CC', borderLight: '#EEE6DD', borderDark: '#B0A296',
      primary: '#B3122A', primaryDark: '#8A0F22', primaryLight: '#D7263D', primaryBg: '#FBE8EA',
      secondary: '#1A1414', accent: '#946000' },
    { background: '#0A0A0A', surface: '#161616', surfaceDark: '#1F1F1F', header: '#000000', onHeader: '#F2EDE4',
      text: '#F2EDE4', textSecondary: '#B8B0A6', textLight: '#978F86',
      border: '#2E2A28', borderLight: '#222020', borderDark: '#4A4440',
      primary: '#FF4D5E', primaryDark: '#D7263D', primaryLight: '#FF7A87', primaryBg: '#3A1418',
      secondary: '#E8DED2', accent: '#F0B43C' },
  ),

  neonNightmare: defineTheme(
    { id: 'neonNightmare', name: 'Neon Nightmare', description: 'Hot pink and cyan. Pale lavender by day, synth purple by night.',
      headerFont: 'RubikGlitch_400Regular', headerFontSize: 20 },
    { background: '#F6F1FF', surface: '#FFFFFF', surfaceDark: '#EAE1FA', header: '#1E1433', onHeader: '#F4EEFF',
      text: '#1E1433', textSecondary: '#5B4E78', textLight: '#6F6390',
      border: '#DCD0F2', borderLight: '#EAE2F8', borderDark: '#A898C8',
      primary: '#C8125F', primaryDark: '#A30E55', primaryLight: '#FF2E88', primaryBg: '#FDE8F1',
      secondary: '#1E1433', accent: '#00687B' },
    { background: '#120B1F', surface: '#1E1433', surfaceDark: '#2A1D45', header: '#0B0614', onHeader: '#F4EEFF',
      text: '#F4EEFF', textSecondary: '#B9AEDB', textLight: '#9A8FBF',
      border: '#3B2766', borderLight: '#2C1E4D', borderDark: '#55408A',
      primary: '#FF4F9A', primaryDark: '#D6146F', primaryLight: '#FF85B8', primaryBg: '#3D1029',
      secondary: '#E2DAF5', accent: '#00E5FF' },
  ),

  zombieOutbreak: defineTheme(
    { id: 'zombieOutbreak', name: 'Zombie Outbreak', description: 'Hazmat yellow and black. Warning sign by day, quarantine zone by night.',
      headerFont: 'Butcherman_400Regular', headerFontSize: 18 },
    { background: '#FFF8DC', surface: '#FFFFFF', surfaceDark: '#F3EACB', header: '#1A1A1A', onHeader: '#F5C400',
      text: '#1A1A1A', textSecondary: '#4A4535', textLight: '#625C48',
      border: '#E3D9B5', borderLight: '#EFE7CB', borderDark: '#A89E7C',
      primary: '#1A1A1A', primaryDark: '#000000', primaryLight: '#3A3A3A', primaryBg: '#FFF0B3',
      secondary: '#4A4535', accent: '#7A5800' },
    { background: '#121212', surface: '#1E1E1E', surfaceDark: '#2A2A2A', header: '#000000', onHeader: '#F5C400',
      text: '#F2F2F2', textSecondary: '#B5B5B5', textLight: '#949494',
      border: '#333333', borderLight: '#262626', borderDark: '#555555',
      primary: '#F5C400', primaryDark: '#C99F00', primaryLight: '#FFD94D', primaryBg: '#3A3000',
      secondary: '#E0E0E0', accent: '#FF8C3A' },
  ),

  comicCrypt: defineTheme(
    { id: 'comicCrypt', name: 'Comic Crypt', description: 'Pulp horror comic. Cream paper by day, black ink by night.',
      headerFont: 'Bangers_400Regular', headerFontSize: 24 },
    { background: '#F3E9D2', surface: '#FFFFFF', surfaceDark: '#E8DCC0', header: '#1A1A1A', onHeader: '#FFD23F',
      text: '#1A1A1A', textSecondary: '#4A4438', textLight: '#625B4C',
      border: '#CFC3A6', borderLight: '#E2D7BD', borderDark: '#1A1A1A',
      primary: '#C8102E', primaryDark: '#9E0C24', primaryLight: '#E5304C', primaryBg: '#FFE4E8',
      secondary: '#1A1A1A', accent: '#2457A6' },
    { background: '#14110C', surface: '#221E17', surfaceDark: '#2D2820', header: '#000000', onHeader: '#FFD23F',
      text: '#F3E9D2', textSecondary: '#C2B8A3', textLight: '#A0977F',
      border: '#3A3428', borderLight: '#2C271E', borderDark: '#5A5140',
      primary: '#FF5A6E', primaryDark: '#C8102E', primaryLight: '#FF8B99', primaryBg: '#4A1620',
      secondary: '#F3E9D2', accent: '#FFD23F' },
  ),

  lateNightStatic: defineTheme(
    { id: 'lateNightStatic', name: 'Late-Night Static', description: 'Old TV static. Test-pattern gray by day, 3 AM ghost glow by night.',
      headerFont: 'VT323_400Regular', headerFontSize: 26 },
    { background: '#EEF0F2', surface: '#FFFFFF', surfaceDark: '#E1E5E9', header: '#151719', onHeader: '#9EE6FF',
      text: '#151719', textSecondary: '#4E555C', textLight: '#636A72',
      border: '#D3D7DB', borderLight: '#E4E7EA', borderDark: '#9AA1A8',
      primary: '#1E6F93', primaryDark: '#155470', primaryLight: '#2A8DB8', primaryBg: '#E2F1F8',
      secondary: '#151719', accent: '#5B3FA0' },
    { background: '#151719', surface: '#202326', surfaceDark: '#2A2E32', header: '#0B0C0D', onHeader: '#9EE6FF',
      text: '#F5F7F8', textSecondary: '#A9AFB5', textLight: '#8B9299',
      border: '#3A3F44', borderLight: '#2C3034', borderDark: '#555B61',
      primary: '#9EE6FF', primaryDark: '#5FC4EA', primaryLight: '#C9F2FF', primaryBg: '#183846',
      secondary: '#E3E7EA', accent: '#CDB6FF' },
  ),

  cleanConcrete: defineTheme(
    { id: 'cleanConcrete', name: 'Clean Concrete', description: 'No horror. Plain and professional: concrete gray, navy, burnt orange.',
      headerFont: undefined, headerFontSize: 18 },
    { background: '#EEECE7', surface: '#FFFFFF', surfaceDark: '#E2DFD7', header: '#1E2A38', onHeader: '#F4F2EE',
      text: '#1E2A38', textSecondary: '#4E5966', textLight: '#5C6672',
      border: '#D6D3CB', borderLight: '#E6E3DC', borderDark: '#A8A49A',
      primary: '#B53D0B', primaryDark: '#9A3412', primaryLight: '#EA580C', primaryBg: '#FDEEE6',
      secondary: '#1E2A38', accent: '#946000' },
    { background: '#121820', surface: '#1C2430', surfaceDark: '#243042', header: '#0B1016', onHeader: '#F4F2EE',
      text: '#EEF1F4', textSecondary: '#A9B3BE', textLight: '#8C97A3',
      border: '#2E3A4A', borderLight: '#253142', borderDark: '#44536A',
      primary: '#FF8A4C', primaryDark: '#C2410C', primaryLight: '#FFAB7E', primaryBg: '#3A1F12',
      secondary: '#D6DCE3', accent: '#F0B43C' },
  ),
};

/** Order shown in the theme picker. */
export const themeOrder: ThemeId[] = [
  'summerCamp', 'vhsSlasher', 'neonNightmare', 'zombieOutbreak', 'comicCrypt', 'lateNightStatic', 'cleanConcrete',
];

export const DEFAULT_THEME: ThemeId = 'summerCamp';

// Back-compat exports (default theme) for code outside React components.
export const lightPalette = themes[DEFAULT_THEME].light;
export const darkPalette = themes[DEFAULT_THEME].dark;
export const lightGradients = themes[DEFAULT_THEME].lightGradients;
export const darkGradients = themes[DEFAULT_THEME].darkGradients;
