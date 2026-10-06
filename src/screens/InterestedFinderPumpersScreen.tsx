import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  awardFinderPumper,
  subscribeFinderJob,
  subscribeFinderJobRequests,
} from '../services/pumpFinderMarketplace';
import { FinderJobRequest, FinderPublicJob } from '../types/pumpFinder';
import { makeStyles, useAppTheme } from '../theme';
import ThemedHero from '../components/ThemedHero';

const requestLabels: Record<string, string> = {
  pending: 'Interested',
  awarded: 'Awarded',
  confirmed: 'Confirmed',
  declined: 'Not selected',
  withdrawn: 'Withdrawn',
};

export default function InterestedFinderPumpersScreen({ navigation, route }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const jobId: string | undefined = route?.params?.jobId;

  const [job, setJob] = useState<FinderPublicJob | null>(null);
  const [requests, setRequests] = useState<FinderJobRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [awardingPumperId, setAwardingPumperId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!jobId) {
      setLoadError('No Pump Finder job was selected.');
      setLoading(false);
      return;
    }

    let gotJob = false;
    let gotRequests = false;

    const finishIfReady = () => {
      if (gotJob && gotRequests) setLoading(false);
    };

    const unsubscribeJob = subscribeFinderJob(
      jobId,
      nextJob => {
        gotJob = true;
        setJob(nextJob);
        finishIfReady();
      },
      error => {
        setLoadError(error.message || 'Could not load the Pump Finder job.');
        setLoading(false);
      }
    );

    const unsubscribeRequests = subscribeFinderJobRequests(
      jobId,
      nextRequests => {
        gotRequests = true;
        setRequests(nextRequests);
        finishIfReady();
      },
      error => {
        setLoadError(error.message || 'Could not load interested pumpers.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeJob();
      unsubscribeRequests();
    };
  }, [jobId]);

  const handleAward = (request: FinderJobRequest) => {
    if (!jobId || awardingPumperId || job?.status !== 'unassigned') return;

    const pumperLabel =
      request.businessName?.trim() ||
      request.pumperName?.trim() ||
      `Pumper ${request.pumperId.slice(0, 6)}`;

    Alert.alert(
      'Award this job?',
      `Award the job to ${pumperLabel}? They will still need to confirm before the exact address is unlocked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Award Job',
          onPress: async () => {
            try {
              setAwardingPumperId(request.pumperId);
              await awardFinderPumper(jobId, request.pumperId);
              Alert.alert(
                'Job awarded',
                `${pumperLabel} was selected. The job is now waiting for that pumper to confirm.`
              );
            } catch (error: any) {
              Alert.alert(
                'Could not award job',
                error?.message || 'The pumper could not be selected.'
              );
            } finally {
              setAwardingPumperId(null);
            }
          },
        },
      ]
    );
  };

  const sortedRequests = [...requests].sort((a, b) => {
    const rank: Record<string, number> = {
      awarded: 0,
      confirmed: 0,
      pending: 1,
      declined: 2,
      withdrawn: 3,
    };
    return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedHero
        icon="people-outline"
        title="Interested Pumpers"
        subtitle={
          job
            ? `${job.generalArea} • ${job.jobDate} at ${job.startTime}`
            : 'Review the pumpers who requested your job.'
        }
      />

      {job?.status === 'award-pending' ? (
        <View style={styles.awardPendingCard}>
          <Ionicons name="hourglass-outline" size={22} color={Colors.primary} />
          <Text style={styles.awardPendingText}>
            You selected a pumper. The exact address stays locked until that pumper confirms.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Loading requests…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
          <Text style={styles.stateTitle}>Couldn’t load requests</Text>
          <Text style={styles.stateText}>{loadError}</Text>
        </View>
      ) : sortedRequests.length === 0 ? (
        <View style={styles.stateCard}>
          <Ionicons name="people-outline" size={44} color={Colors.primary} />
          <Text style={styles.stateTitle}>No requests yet</Text>
          <Text style={styles.stateText}>
            When a pumper taps I’m Available, they will appear here automatically.
          </Text>
        </View>
      ) : (
        sortedRequests.map(request => {
          const displayName =
            request.pumperName?.trim() ||
            `Pumper ${request.pumperId.slice(0, 6)}`;
          const isPending = request.status === 'pending';
          const isSelected =
            request.status === 'awarded' || request.status === 'confirmed';
          const canAward = isPending && job?.status === 'unassigned';
          const awarding = awardingPumperId === request.pumperId;

          return (
            <View
              key={request.id}
              style={[styles.pumperCard, isSelected && styles.pumperCardSelected]}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate('PublicFinderProfile', { request })}
                activeOpacity={0.78}
              >
                <View style={styles.pumperHeader}>
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.pumperTitleWrap}>
                    <Text style={styles.pumperName}>{displayName}</Text>
                    {request.businessName?.trim() ? (
                      <Text style={styles.businessName}>{request.businessName}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusPill, isSelected && styles.statusPillSelected]}>
                    <Text style={styles.statusText}>
                      {requestLabels[request.status] || request.status}
                    </Text>
                  </View>
                </View>

                {request.pumpType?.trim() || request.serviceArea?.trim() ? (
                  <View style={styles.profileDetails}>
                    {request.pumpType?.trim() ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="construct-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{request.pumpType}</Text>
                      </View>
                    ) : null}
                    {request.serviceArea?.trim() ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="map-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{request.serviceArea}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.legacyText}>
                    Test request from account {request.pumperId.slice(0, 8)}…
                  </Text>
                )}

                <View style={styles.viewProfileRow}>
                  <Text style={styles.viewProfileText}>View Business Profile</Text>
                  <Ionicons name="chevron-forward" size={17} color={Colors.primary} />
                </View>
              </TouchableOpacity>

              {canAward ? (
                <TouchableOpacity
                  style={styles.awardButton}
                  onPress={() => handleAward(request)}
                  disabled={awarding || !!awardingPumperId}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={Colors.onPrimary} />
                  <Text style={styles.awardButtonText}>
                    {awarding ? 'Awarding…' : 'Award Job'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles(Colors => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 36 },
  awardPendingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 13,
    marginBottom: 14,
  },
  awardPendingText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  stateCard: {
    minHeight: 190,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  stateTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  stateText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  pumperCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
    marginBottom: 12,
  },
  pumperCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  pumperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pumperTitleWrap: { flex: 1 },
  pumperName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  businessName: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillSelected: {
    backgroundColor: Colors.primaryBg,
  },
  statusText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  profileDetails: {
    marginTop: 12,
    gap: 7,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  detailText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  legacyText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 12,
  },
  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewProfileText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  awardButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  awardButtonText: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
}));
