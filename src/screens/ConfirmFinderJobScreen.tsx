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
  advanceFinderJobStatus,
  confirmFinderAward,
  getFinderPrivateDetails,
  subscribeFinderJob,
} from '../services/pumpFinderMarketplace';
import {
  FinderPrivateJobDetails,
  FinderPublicJob,
} from '../types/pumpFinder';
import { makeStyles, useAppTheme } from '../theme';
import ThemedHero from '../components/ThemedHero';

export default function ConfirmFinderJobScreen({ navigation, route }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const jobId: string | undefined = route?.params?.jobId;

  const [job, setJob] = useState<FinderPublicJob | null>(null);
  const [privateDetails, setPrivateDetails] = useState<FinderPrivateJobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [progressing, setProgressing] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!jobId) {
      setLoadError('No Pump Finder job was selected.');
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeFinderJob(
      jobId,
      async nextJob => {
        setJob(nextJob);
        setLoadError('');
        setLoading(false);

        if (
          nextJob &&
          [
            'assigned',
            'on-the-way',
            'arrived',
            'pumping',
            'in-progress',
            'completed',
          ].includes(nextJob.status)
        ) {
          try {
            const details = await getFinderPrivateDetails(jobId);
            setPrivateDetails(details);
          } catch (error: any) {
            console.warn('Private Finder details are not available yet:', error);
          }
        } else {
          setPrivateDetails(null);
        }
      },
      error => {
        setLoadError(error.message || 'Could not load this Pump Finder job.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId]);

  const handleConfirm = async () => {
    if (!jobId || confirming) return;

    try {
      setConfirming(true);
      await confirmFinderAward(jobId);

      const details = await getFinderPrivateDetails(jobId);
      setPrivateDetails(details);

      Alert.alert(
        'Job confirmed',
        'You are confirmed for this Pump Finder job. The exact address is now unlocked.'
      );
    } catch (error: any) {
      Alert.alert(
        'Could not confirm job',
        error?.message || 'This Pump Finder award could not be confirmed.'
      );
    } finally {
      setConfirming(false);
    }
  };

  const progressAction = (() => {
    if (!job) return null;

    if (job.status === 'assigned') {
      return {
        nextStatus: 'on-the-way' as const,
        label: "I'm On My Way",
        icon: 'navigate-outline',
        confirmation: 'The poster will see that you are on the way to the job.',
      };
    }

    if (job.status === 'on-the-way') {
      return {
        nextStatus: 'arrived' as const,
        label: "I've Arrived",
        icon: 'location-outline',
        confirmation: 'The poster will see that you arrived at the jobsite.',
      };
    }

    if (job.status === 'arrived') {
      return {
        nextStatus: 'pumping' as const,
        label: 'Start Pumping',
        icon: 'construct-outline',
        confirmation: 'The poster will see that pumping has started.',
      };
    }

    return null;
  })();

  const handleProgress = async () => {
    if (!jobId || !progressAction || progressing) return;

    try {
      setProgressing(true);
      await advanceFinderJobStatus(jobId, progressAction.nextStatus);
      Alert.alert('Status updated', progressAction.confirmation);
    } catch (error: any) {
      Alert.alert(
        'Could not update job',
        error?.message || 'Pump Finder could not update this job status.'
      );
    } finally {
      setProgressing(false);
    }
  };

  const statusLabel = (() => {
    if (!job) return '';
    if (job.status === 'assigned') return 'Confirmed';
    if (job.status === 'on-the-way') return 'On My Way';
    if (job.status === 'arrived') return 'Arrived';
    if (job.status === 'pumping' || job.status === 'in-progress') return 'Pumping';
    if (job.status === 'completed') return 'Completed';
    if (job.status === 'award-pending') return 'Waiting for Confirmation';
    return job.status;
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedHero
        icon={
          job?.status === 'award-pending'
            ? 'trophy-outline'
            : job?.status === 'completed'
              ? 'checkmark-done-outline'
              : 'construct-outline'
        }
        title={
          job?.status === 'award-pending'
            ? 'You Got the Job'
            : statusLabel || 'Finder Job'
        }
        subtitle={
          job?.status === 'award-pending'
            ? 'Review the public job details and confirm before the exact address is revealed.'
            : job?.status === 'completed'
              ? 'This Pump Finder job is complete and its closeout was saved to JobTracker.'
              : 'Keep the poster updated as you travel, arrive, and start pumping.'
        }
      />

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Loading job…</Text>
        </View>
      ) : loadError || !job ? (
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
          <Text style={styles.stateTitle}>Couldn’t load job</Text>
          <Text style={styles.stateText}>{loadError || 'This job could not be found.'}</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Job details</Text>
            <Row label="Area" value={job.generalArea} />
            <Row label="Date" value={job.jobDate} />
            <Row label="Start" value={job.startTime} />
            <Row label="Yards" value={job.yards ? String(job.yards) : 'Not listed'} />
            <Row label="Pump type" value={job.pumpType || 'Any / not specified'} />
            <Row label="PSI" value={job.concretePsi ? String(job.concretePsi) : 'Not listed'} />
            {job.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Public jobsite details</Text>
                <Text style={styles.notesText}>{job.notes}</Text>
              </View>
            ) : null}
          </View>

          {job.status === 'award-pending' ? (
            <>
              <View style={styles.lockCard}>
                <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
                <View style={styles.lockTextWrap}>
                  <Text style={styles.lockTitle}>Exact address still locked</Text>
                  <Text style={styles.lockText}>
                    Confirm the award first. Then Pump Finder will reveal the customer name, exact address, and private access notes.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.confirmButton, confirming && styles.disabledButton]}
                onPress={handleConfirm}
                disabled={confirming}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle-outline" size={21} color={Colors.onPrimary} />
                <Text style={styles.confirmButtonText}>
                  {confirming ? 'Confirming…' : 'Confirm Job'}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          {privateDetails ? (
            <View style={styles.privateCard}>
              <View style={styles.privateHeader}>
                <Ionicons name="lock-open-outline" size={22} color={Colors.primary} />
                <Text style={styles.privateTitle}>Private job details unlocked</Text>
              </View>
              <Row label="Customer" value={privateDetails.customerName} />
              <Row label="Exact address" value={privateDetails.exactAddress} />
              {privateDetails.privateNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Private access notes</Text>
                  <Text style={styles.notesText}>{privateDetails.privateNotes}</Text>
                </View>
              ) : null}
            </View>
          ) : job.status !== 'award-pending' ? (
            <View style={styles.lockCard}>
              <Ionicons name="sync-outline" size={22} color={Colors.primary} />
              <View style={styles.lockTextWrap}>
                <Text style={styles.lockTitle}>Loading private details</Text>
                <Text style={styles.lockText}>
                  Your confirmation was recorded. Pump Finder is retrieving the protected address record.
                </Text>
              </View>
            </View>
          ) : null}

          {job.status !== 'award-pending' ? (
            <View style={styles.progressCard}>
              <Text style={styles.cardTitle}>Job progress</Text>
              <View style={styles.progressRow}>
                {[
                  ['Confirmed', ['assigned', 'on-the-way', 'arrived', 'pumping', 'in-progress', 'completed'].includes(job.status)],
                  ['On My Way', ['on-the-way', 'arrived', 'pumping', 'in-progress', 'completed'].includes(job.status)],
                  ['Arrived', ['arrived', 'pumping', 'in-progress', 'completed'].includes(job.status)],
                  ['Pumping', ['pumping', 'in-progress', 'completed'].includes(job.status)],
                  ['Completed', job.status === 'completed'],
                ].map(([label, done]) => (
                  <View key={String(label)} style={styles.progressStep}>
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={done ? Colors.primary : Colors.textLight}
                    />
                    <Text
                      style={[
                        styles.progressStepText,
                        done && styles.progressStepTextDone,
                      ]}
                    >
                      {String(label)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {progressAction ? (
            <TouchableOpacity
              style={[styles.confirmButton, progressing && styles.disabledButton]}
              onPress={handleProgress}
              disabled={progressing}
              activeOpacity={0.8}
            >
              <Ionicons
                name={progressAction.icon as any}
                size={21}
                color={Colors.onPrimary}
              />
              <Text style={styles.confirmButtonText}>
                {progressing ? 'Updating…' : progressAction.label}
              </Text>
            </TouchableOpacity>
          ) : null}

          {job.status === 'pumping' || job.status === 'in-progress' ? (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => navigation.navigate('CompleteFinderJob', { jobId })}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done-outline" size={21} color={Colors.onPrimary} />
              <Text style={styles.confirmButtonText}>Complete Job</Text>
            </TouchableOpacity>
          ) : null}

          {job.status === 'completed' ? (
            <View style={styles.completedCard}>
              <Ionicons name="checkmark-done-circle-outline" size={23} color={Colors.primary} />
              <View style={styles.lockTextWrap}>
                <Text style={styles.lockTitle}>Job completed</Text>
                <Text style={styles.lockText}>
                  The Finder closeout is finished and the matching JobTracker record has been created.
                </Text>
              </View>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles(Colors => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 36 },
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
    marginBottom: 14,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 7,
  },
  rowLabel: {
    width: 105,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  rowValue: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 10,
    padding: 11,
    marginTop: 10,
  },
  notesLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  notesText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  lockCard: {
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
  lockTextWrap: { flex: 1 },
  lockTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  lockText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  confirmButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  confirmButtonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: { opacity: 0.65 },
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
    marginBottom: 14,
  },
  progressRow: {
    gap: 9,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressStepText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  progressStepTextDone: {
    color: Colors.text,
  },
  completeButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: Colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 14,
    marginBottom: 14,
  },
  privateCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 15,
    marginBottom: 14,
  },
  privateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  privateTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
}));
