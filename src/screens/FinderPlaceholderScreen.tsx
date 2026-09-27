import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FinderPlaceholderScreen({ route }: any) {
  const title = route?.params?.title || route?.name || 'Pump Finder';
  const description = route?.params?.description || 'This Pump Finder V1 screen is ready for implementation.';

  return (
    <View style={styles.container}>
      <Ionicons name="construct-outline" size={52} color="#2196F3" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>V1 PLACEHOLDER</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9', alignItems: 'center', justifyContent: 'center', padding: 28 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginTop: 14, textAlign: 'center' },
  description: { fontSize: 15, color: '#667085', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  badge: { marginTop: 20, backgroundColor: '#e8f2ff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  badgeText: { color: '#2196F3', fontSize: 12, fontWeight: '700' },
});