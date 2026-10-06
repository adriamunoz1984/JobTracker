import React from 'react';
import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinderJobRequest } from '../types/pumpFinder';
import { makeStyles, useAppTheme } from '../theme';
import ThemedHero from '../components/ThemedHero';

export default function PublicFinderBusinessProfileScreen({ route }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const request: FinderJobRequest | undefined = route?.params?.request;

  if (!request) {
    return (
      <View style={styles.empty}>
        <Ionicons name="person-circle-outline" size={50} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>Pumper profile unavailable</Text>
        <Text style={styles.emptyText}>
          Pump Finder could not load the public profile attached to this request.
        </Text>
      </View>
    );
  }

  const name =
    request.pumperName?.trim() ||
    `Pumper ${request.pumperId.slice(0, 6)}`;

  const businessName = request.businessName?.trim();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedHero
        icon="business-outline"
        title={businessName || name}
        subtitle={businessName ? name : 'Pump Finder pumper profile'}
      />

      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
        <View style={styles.privacyTextWrap}>
          <Text style={styles.privacyTitle}>Public marketplace profile</Text>
          <Text style={styles.privacyText}>
            Only information the pumper chose to share publicly is shown here. Private phone, email, and contact details are not exposed before the job handoff.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pumping business</Text>

        <ProfileRow
          icon="person-outline"
          label="Pumper"
          value={name}
        />

        {businessName ? (
          <ProfileRow
            icon="business-outline"
            label="Business"
            value={businessName}
          />
        ) : null}

        <ProfileRow
          icon="construct-outline"
          label="Pump type"
          value={request.pumpType?.trim() || 'Not listed yet'}
        />

        <ProfileRow
          icon="map-outline"
          label="Service area"
          value={request.serviceArea?.trim() || 'Not listed yet'}
        />
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
        <View style={styles.privacyTextWrap}>
          <Text style={styles.privacyTitle}>Profile details are expanding</Text>
          <Text style={styles.privacyText}>
            Hose capability, PSI details, PPE, pricing, photos, and reviews can be added to this public profile as the Finder profile snapshot is expanded.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles(Colors => ({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 14,
  },
  privacyTextWrap: {
    flex: 1,
  },
  privacyTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  privacyText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
    marginBottom: 14,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  rowValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  empty: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 7,
  },
}));
