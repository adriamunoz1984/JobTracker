// src/screens/AppearanceSettingsScreen.tsx
// Theme picker + light/dark appearance (moved out of the old Profile screen).
import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { Spacing, BorderRadius } from '../theme/colors';
import { useAppTheme, makeStyles, themes, themeOrder, getHeaderTitleStyle } from '../theme';

export default function AppearanceSettingsScreen() {
  const { colors: Colors, preference, setPreference, themeId, setThemeId, mode } = useAppTheme();
  const styles = useStyles();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Light or dark</Text>
      <View style={styles.card}>
        <Text style={styles.helper}>Auto follows your phone's light or dark setting.</Text>
        <SegmentedButtons
          value={preference}
          onValueChange={(v) => setPreference(v as 'system' | 'light' | 'dark')}
          buttons={[
            { value: 'system', label: 'Auto', icon: 'theme-light-dark' },
            { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
            { value: 'dark', label: 'Dark', icon: 'weather-night' },
          ]}
        />
      </View>

      <Text style={styles.sectionTitle}>Theme</Text>
      <View style={styles.card}>
        {themeOrder.map((id) => {
          const t = themes[id];
          const p = mode === 'dark' ? t.dark : t.light;
          const selected = id === themeId;
          return (
            <TouchableOpacity
              key={id}
              onPress={() => setThemeId(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${t.name} theme`}
              style={[
                styles.themeRow,
                { backgroundColor: p.header, borderColor: selected ? Colors.primary : 'transparent' },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={[getHeaderTitleStyle(t), { color: p.onHeader, fontSize: Math.min(t.headerFontSize, 22) }]}
                >
                  {t.name}
                </Text>
                <View style={styles.swatchRow}>
                  {[p.background, p.surface, p.primary, p.accent, p.success].map((c, i) => (
                    <View key={i} style={[styles.swatch, { backgroundColor: c }]} />
                  ))}
                </View>
              </View>
              {selected && (
                <View style={[styles.themeCheck, { backgroundColor: Colors.primary }]}>
                  <Text style={{ color: Colors.onPrimary, fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.helper, { marginTop: Spacing.xs, marginBottom: 0 }]}>{themes[themeId].description}</Text>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  helper: { fontSize: 14, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 20 },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 3,
    marginBottom: Spacing.sm,
    minHeight: 64,
  },
  swatchRow: { flexDirection: 'row', marginTop: Spacing.xs },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  themeCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
}));
