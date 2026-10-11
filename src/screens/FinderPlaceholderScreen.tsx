import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, makeStyles } from '../theme';
import ThemedHero from '../components/ThemedHero';

export default function FinderPlaceholderScreen({ route }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const title = route?.params?.title || route?.name || 'Pump Finder';
  const description = route?.params?.description || 'This Pump Finder V1 screen is ready for implementation.';

  return (
    <View style={styles.container}>
      <ThemedHero icon="construct-outline" title={title} subtitle={description} style={{ alignSelf: 'stretch' }} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>V1 PLACEHOLDER</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, marginTop: 14, textAlign: 'center' },
  description: { fontSize: 15, color: Colors.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  badge: { marginTop: 20, backgroundColor: Colors.primaryBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  badgeText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
}));