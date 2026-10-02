// src/components/ThemedHero.tsx
// Colored banner used at the top of screens (Pump Finder pages, etc.).
// Uses the current theme's gradient, title font, and text-on-fill color,
// so it restyles itself for every theme in light and dark mode.
import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, makeStyles, withOpacity } from '../theme';

interface ThemedHeroProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

export default function ThemedHero({ icon, title, subtitle, style }: ThemedHeroProps) {
  const { colors, gradients, headerTitleStyle, theme } = useAppTheme();
  const styles = useStyles();

  return (
    <LinearGradient
      colors={gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      <View style={[styles.iconWrap, { backgroundColor: withOpacity(colors.onPrimary, 0.16) }]}>
        <Ionicons name={icon} size={30} color={colors.onPrimary} />
      </View>
      <Text
        style={[
          headerTitleStyle,
          // Fancy fonts get a size bump; the plain theme stays bold system text
          { fontSize: theme.headerFont ? theme.headerFontSize + 6 : 24 },
          styles.title,
        ]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

const useStyles = makeStyles((Colors) => ({
  hero: {
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.onPrimary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 360,
  },
}));
