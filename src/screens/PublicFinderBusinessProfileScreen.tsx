import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  FinderJobRequest,
  FinderPublicPumperProfile,
} from '../types/pumpFinder';
import { makeStyles, useAppTheme } from '../theme';
import ThemedHero from '../components/ThemedHero';
import { subscribePublicFinderProfile } from '../services/pumpFinderProfiles';

export default function PublicFinderBusinessProfileScreen({ route }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const request: FinderJobRequest | undefined = route?.params?.request;

  const [publicProfile, setPublicProfile] =
    useState<FinderPublicPumperProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (!request?.pumperId) {
      setProfileLoaded(true);
      return;
    }

    const unsubscribe = subscribePublicFinderProfile(
      request.pumperId,
      profile => {
        setPublicProfile(profile);
        setProfileError('');
        setProfileLoaded(true);
      },
      error => {
        console.warn('Could not load public Pump Finder profile:', error);
        setProfileError(error.message || 'Could not load the live public profile.');
        setProfileLoaded(true);
      }
    );

    return () => unsubscribe();
  }, [request?.pumperId]);

  const profile = useMemo(() => {
    if (!request) return null;

    return {
      pumperId: request.pumperId,
      displayName:
        publicProfile?.displayName?.trim() ||
        request.pumperName?.trim() ||
        `Pumper ${request.pumperId.slice(0, 6)}`,
      businessName:
        publicProfile?.businessName?.trim() ||
        request.businessName?.trim() ||
        '',
      pumpType:
        publicProfile?.pumpType?.trim() ||
        request.pumpType?.trim() ||
        '',
      serviceArea:
        publicProfile?.serviceArea?.trim() ||
        request.serviceArea?.trim() ||
        '',
      hoseIncludedFt:
        publicProfile?.hoseIncludedFt ??
        request.hoseIncludedFt ??
        0,
      extraHoseRatePerFt:
        publicProfile?.extraHoseRatePerFt ??
        request.extraHoseRatePerFt ??
        0,
      standardPsiMax:
        publicProfile?.standardPsiMax ??
        request.standardPsiMax ??
        0,
      highPsiSurcharge:
        publicProfile?.highPsiSurcharge ??
        request.highPsiSurcharge ??
        null,
      ppeAvailable:
        publicProfile?.ppeAvailable ||
        request.ppeAvailable ||
        [],
    };
  }, [publicProfile, request]);

  if (!request || !profile) {
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

  const businessTitle = profile.businessName || profile.displayName;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedHero
        icon="business-outline"
        title={businessTitle}
        subtitle={
          profile.businessName
            ? profile.displayName
            : 'Pump Finder pumper profile'
        }
      />

      {!profileLoaded ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading current public profile…</Text>
        </View>
      ) : null}

      <View style={styles.privacyCard}>
        <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoTitle}>Public marketplace profile</Text>
          <Text style={styles.infoText}>
            This profile is stored separately from the pumper’s private JobTracker account.
            Phone, email, private account data, and customer information are not shown here.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pumping business</Text>
        <ProfileRow icon="person-outline" label="Pumper" value={profile.displayName} />
        {profile.businessName ? (
          <ProfileRow icon="business-outline" label="Business" value={profile.businessName} />
        ) : null}
        <ProfileRow
          icon="construct-outline"
          label="Pump type"
          value={profile.pumpType || 'Not listed yet'}
        />
        <ProfileRow
          icon="map-outline"
          label="Service area"
          value={profile.serviceArea || 'Not listed yet'}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hose & setup</Text>
        <ProfileRow
          icon="git-branch-outline"
          label="Hose included"
          value={
            profile.hoseIncludedFt > 0
              ? `${profile.hoseIncludedFt} ft`
              : 'Not listed yet'
          }
        />
        <ProfileRow
          icon="cash-outline"
          label="Extra hose"
          value={
            profile.extraHoseRatePerFt > 0
              ? `$${profile.extraHoseRatePerFt.toFixed(2)} / ft`
              : 'No extra-hose rate listed'
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Concrete PSI</Text>
        <ProfileRow
          icon="speedometer-outline"
          label="Standard PSI"
          value={
            profile.standardPsiMax > 0
              ? `Up to ${profile.standardPsiMax.toLocaleString()} PSI`
              : 'Not listed yet'
          }
        />
        <ProfileRow
          icon="trending-up-outline"
          label="High-PSI surcharge"
          value={
            profile.highPsiSurcharge !== null &&
            profile.highPsiSurcharge !== undefined
              ? `$${profile.highPsiSurcharge.toFixed(2)}`
              : 'No surcharge listed'
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PPE available</Text>
        {profile.ppeAvailable.length > 0 ? (
          <View style={styles.chipWrap}>
            {profile.ppeAvailable.map(item => (
              <View key={item} style={styles.ppeChip}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Colors.primary}
                />
                <Text style={styles.ppeChipText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.mutedText}>No PPE has been listed yet.</Text>
        )}
      </View>

      <View style={styles.quoteCard}>
        <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoTitle}>Profile pricing is a capability guide</Text>
          <Text style={styles.infoText}>
            Hose and PSI figures help the poster compare pumpers. The actual price for a specific
            job can still depend on hours, hose, PSI, prevailing wage, travel, and other job details.
          </Text>
        </View>
      </View>

      {profileError ? (
        <Text style={styles.syncNote}>
          Live profile refresh was unavailable, so Pump Finder is showing the public snapshot
          saved with this job request.
        </Text>
      ) : null}
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
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 12,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 12,
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
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  infoText: {
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
  },
  ppeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primaryBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  ppeChipText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  mutedText: {
    color: Colors.textSecondary,
    fontSize: 13,
    paddingVertical: 8,
  },
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  syncNote: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
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
