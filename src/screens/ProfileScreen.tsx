// src/screens/ProfileScreen.tsx
// "My Pumper Profile" — the PUBLIC profile. This is the same information Pump Finder
// posters will see when you request a job. Contact info (phone/email) and pay settings
// are NOT shown here; those stay private in Settings.
import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Spacing, BorderRadius } from '../theme/colors';
import { useAppTheme, makeStyles, withOpacity } from '../theme';

export default function ProfileScreen() {
  const { colors: Colors, gradients, headerTitleStyle, theme } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const p = user?.pumpFinderProfile;

  const displayName = user?.displayName || 'Your name';
  const businessName = user?.businessName?.trim() || displayName;
  const initials = (user?.businessName || user?.displayName || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]!.toUpperCase())
    .join('');

  const hasPumpDetails = !!(p?.pumpType || p?.serviceArea);
  const money = (n?: number) => (n === undefined || n === null ? undefined : `$${n}`);

  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string }[] = [
    { icon: 'construct-outline', label: 'Pump', value: p?.pumpType },
    { icon: 'location-outline', label: 'Service area', value: p?.serviceArea },
    {
      icon: 'git-commit-outline',
      label: 'Hose',
      value:
        p?.hoseIncludedFt !== undefined
          ? `${p.hoseIncludedFt} ft included${p.extraHoseRatePerFt !== undefined ? ` · ${money(p.extraHoseRatePerFt)}/ft extra` : ''}`
          : undefined,
    },
    {
      icon: 'speedometer-outline',
      label: 'PSI',
      value:
        p?.standardPsiMax !== undefined
          ? `Up to ${p.standardPsiMax}${p.highPsiSurcharge ? ` · high-PSI +${money(p.highPsiSurcharge)}` : ''}`
          : undefined,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Identity card */}
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: withOpacity(Colors.onPrimary, 0.18) }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text
          style={[headerTitleStyle, { fontSize: theme.headerFont ? theme.headerFontSize + 4 : 22 }, styles.heroTitle]}
          accessibilityRole="header"
        >
          {businessName}
        </Text>
        {businessName !== displayName && <Text style={styles.heroLine}>{displayName}</Text>}
        <View style={[styles.pill, { backgroundColor: withOpacity(Colors.onPrimary, 0.18) }]}>
          <Ionicons name="sparkles-outline" size={14} color={Colors.onPrimary} />
          <Text style={styles.pillText}>New pumper · reviews start after your first Pump Finder job</Text>
        </View>
      </LinearGradient>

      {/* Business details (what posters see) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Pumping details</Text>
        {hasPumpDetails ? (
          rows.map(r => (
            <View key={r.label} style={styles.row}>
              <Ionicons name={r.icon} size={20} color={Colors.primary} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={[styles.rowValue, !r.value && styles.rowEmpty]}>{r.value || 'Not set'}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            Add your pump, service area, hose, and PSI so posters know what jobs you can handle.
          </Text>
        )}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>PPE on the truck</Text>
        {p?.ppeAvailable?.length ? (
          <View style={styles.chips}>
            {p.ppeAvailable.map(item => (
              <View key={item} style={styles.chip}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.chipText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>None listed yet.</Text>
        )}
      </View>

      <View style={styles.note}>
        <Ionicons name="eye-outline" size={18} color={Colors.textSecondary} />
        <Text style={styles.noteText}>
          This is what Pump Finder posters see. Your phone, email, and pay settings stay private.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('BusinessProfile')}
        accessibilityRole="button"
      >
        <Ionicons name="create-outline" size={20} color={Colors.onPrimary} />
        <Text style={styles.primaryButtonText}>{hasPumpDetails ? 'Edit profile' : 'Set up my profile'}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  hero: {
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: Colors.onPrimary, fontSize: 26, fontWeight: 'bold' },
  heroTitle: { color: Colors.onPrimary, textAlign: 'center' },
  heroLine: { color: Colors.onPrimary, fontSize: 15, marginTop: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.round,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  pillText: { color: Colors.onPrimary, fontSize: 12, marginLeft: 6, flexShrink: 1 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowIcon: { marginRight: 10 },
  rowLabel: { fontSize: 15, color: Colors.textSecondary, width: 104 },
  rowValue: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '600', textAlign: 'right' },
  rowEmpty: { color: Colors.textLight, fontWeight: 'normal' },
  emptyText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successBg,
    borderRadius: BorderRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: Colors.text, fontSize: 13, marginLeft: 5 },
  note: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, paddingHorizontal: 4 },
  noteText: { flex: 1, fontSize: 13, color: Colors.textSecondary, marginLeft: 8, lineHeight: 18 },
  primaryButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  primaryButtonText: { color: Colors.onPrimary, fontSize: 17, fontWeight: 'bold', marginLeft: 8 },
}));
