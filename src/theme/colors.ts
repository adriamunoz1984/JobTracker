// src/theme/colors.ts
export const Colors = {
  // Primary Brand Colors
  primary: '#FF6B35',        // Concrete Orange - energetic, construction
  primaryDark: '#D94E1F',    // Darker orange
  primaryLight: '#FF8A5C',   // Lighter orange
  
  // Secondary Colors
  secondary: '#2C3E50',      // Concrete Gray/Blue - professional, trustworthy
  secondaryDark: '#1A252F',  // Darker gray
  secondaryLight: '#34495E', // Lighter gray
  
  // Accent Colors
  accent: '#F39C12',         // Caution Yellow - stands out, action-oriented
  accentDark: '#E67E22',
  accentLight: '#F1C40F',
  
  // Status Colors
  success: '#27AE60',        // Paid/Complete
  successLight: '#2ECC71',
  successBg: '#D5F4E6',
  
  error: '#E74C3C',          // Unpaid/Error
  errorLight: '#EC7063',
  errorBg: '#FADBD8',
  
  warning: '#F39C12',        // Pending
  warningLight: '#F8C471',
  warningBg: '#FCF3CF',
  
  info: '#3498DB',           // Info
  infoLight: '#5DADE2',
  infoBg: '#D6EAF8',
  
  // Neutral Colors
  background: '#F5F6FA',     // Light background
  surface: '#FFFFFF',        // Card background
  surfaceDark: '#ECF0F1',    // Subtle dark surface
  
  // Text Colors
  text: '#2C3E50',           // Primary text
  textSecondary: '#7F8C8D',  // Secondary text
  textLight: '#95A5A6',      // Light text
  textInverse: '#FFFFFF',    // Text on dark backgrounds
  
  // Border Colors
  border: '#BDC3C7',         // Default border
  borderLight: '#E8EBED',    // Light border
  borderDark: '#95A5A6',     // Dark border
  
  // Concrete-specific Colors
  concrete: {
    mixer: '#C0C0C0',        // Concrete gray
    wet: '#8B8680',          // Wet concrete
    pump: '#FF6B35',         // Pump orange
    truck: '#2C3E50',        // Truck body
  },
  
  // Payment Method Colors
  payment: {
    cash: '#27AE60',         // Green for cash
    check: '#3498DB',        // Blue for check
    charge: '#F39C12',       // Orange for charge
    zelle: '#6B46C1',        // Purple for Zelle
    square: '#000000',       // Black for Square
  },
};

export const Gradients = {
  primary: ['#FF6B35', '#F39C12'],           // Orange to yellow
  secondary: ['#2C3E50', '#34495E'],         // Gray gradient
  success: ['#27AE60', '#2ECC71'],           // Green gradient
  header: ['#FF6B35', '#E67E22'],            // Header gradient
  card: ['#FFFFFF', '#F5F6FA'],              // Subtle card gradient
  background: ['#F5F6FA', '#ECF0F1'],        // Background gradient
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  small: 4,
  medium: 8,
  large: 12,
  xlarge: 16,
  round: 999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: 'normal' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: 'normal' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: 'normal' as const,
    lineHeight: 16,
  },
};