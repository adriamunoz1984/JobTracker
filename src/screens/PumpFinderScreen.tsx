import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const finderActions = [
  { key: 'PostJob', title: 'Post a Job', subtitle: 'Find an available concrete pumping business', icon: 'add-circle-outline' },
  { key: 'AvailableJobs', title: 'Available Jobs', subtitle: 'Browse matching jobs in your service area', icon: 'search-outline' },
  { key: 'ActiveJobs', title: 'Active Jobs', subtitle: 'Track confirmed and in-progress Finder jobs', icon: 'construct-outline' },
  { key: 'Messages', title: 'Messages', subtitle: 'Keep job conversations and pumper recommendations in one place', icon: 'chatbubbles-outline' },
  { key: 'BusinessProfile', title: 'Business Profile', subtitle: 'Set pump, hose, PSI, PPE, service area, and pricing details', icon: 'business-outline' },
];

export default function PumpFinderScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Ionicons name="locate-outline" size={42} color="#2196F3" />
        <Text style={styles.title}>Pump Finder</Text>
        <Text style={styles.subtitle}>Connect concrete jobs with available pumping businesses.</Text>
      </View>

      <View style={styles.availabilityCard}>
        <View>
          <Text style={styles.cardTitle}>Availability</Text>
          <Text style={styles.cardText}>Availability controls will be connected in the next milestone.</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>V1</Text>
        </View>
      </View>

      {finderActions.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={styles.actionCard}
          onPress={() => navigation.navigate(action.key)}
          activeOpacity={0.75}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={action.icon as any} size={26} color="#2196F3" />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#777" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9' },
  content: { padding: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8, color: '#1f2937' },
  subtitle: { fontSize: 15, color: '#667085', textAlign: 'center', marginTop: 6, maxWidth: 320 },
  availabilityCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  cardText: { fontSize: 13, color: '#667085', marginTop: 4, maxWidth: 260 },
  statusPill: { backgroundColor: '#e8f2ff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { color: '#2196F3', fontWeight: '700' },
  actionCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e8f2ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  actionSubtitle: { fontSize: 13, color: '#667085', marginTop: 3 },
});