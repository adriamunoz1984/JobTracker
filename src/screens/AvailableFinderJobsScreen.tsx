import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import {
  getMyFinderRequestStatuses,
  requestFinderJob,
  subscribeAvailableFinderJobs,
} from '../services/pumpFinderMarketplace';
import {
  FinderPublicJob,
  FinderRequestStatus,
} from '../types/pumpFinder';
import { makeStyles, useAppTheme } from '../theme';
import ThemedHero from '../components/ThemedHero';

const pricingLabels = {
  standard: 'Standard',
  hourly: 'Hourly / standby',
  'prevailing-wage': 'Prevailing wage',
};

export default function AvailableFinderJobsScreen() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const [jobs, setJobs] = useState<FinderPublicJob[]>([]);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, FinderRequestStatus>>({});
  const [requestingJobId, setRequestingJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeAvailableFinderJobs(
        async nextJobs => {
          if (!active) return;

          setJobs(nextJobs);
          setLoadError('');
          setLoading(false);

          try {
            const statuses = await getMyFinderRequestStatuses(nextJobs.map(job => job.id));
            if (active) {
              setRequestStatuses(statuses);
            }
          } catch (error) {
            console.warn('Could not load Finder request statuses:', error);
          }
        },
        error => {
          if (!active) return;
          console.error('Available Finder jobs listener failed:', error);
          setLoadError(error.message || 'Could not load available Pump Finder jobs.');
          setLoading(false);
        }
      );
    } catch (error: any) {
      setLoadError(error?.message || 'Could not load available Pump Finder jobs.');
      setLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const hasJobs = jobs.length > 0;

  const handleRequestJob = async (job: FinderPublicJob) => {
    if (requestingJobId) return;

    try {
      setRequestingJobId(job.id);
      await requestFinderJob(job.id);

      setRequestStatuses(current => ({
        ...current,
        [job.id]: 'pending',
      }));

      Alert.alert(
        "You're available",
        'The poster can now see that you are interested in this job. They still choose which pumper receives it.'
      );
    } catch (error: any) {
      Alert.alert(
        'Could not request job',
        error?.message || 'Your availability request could not be sent.'
      );
    } finally {
      setRequestingJobId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedHero
        icon="search-outline"
        title="Available Jobs"
        subtitle="Browse open pumping jobs. Exact addresses stay private until the poster awards you the job and you confirm."
      />

      <View style={styles.noticeCard}>
        <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
        <Text style={styles.noticeText}>
          Tapping I’m Available does not claim the job. It tells the poster you are interested, and the poster chooses the pumper.
        </Text>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Loading available jobs…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.stateCard}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.error} />
          <Text style={styles.stateTitle}>Couldn’t load jobs</Text>
          <Text style={styles.stateText}>{loadError}</Text>
        </View>
      ) : !hasJobs ? (
        <View style={styles.stateCard}>
          <Ionicons name="checkmark-circle-outline" size={44} color={Colors.primary} />
          <Text style={styles.stateTitle}>No open jobs right now</Text>
          <Text style={styles.stateText}>
            New unassigned jobs will appear here automatically.
          </Text>
        </View>
      ) : (
        jobs.map(job => (
          <AvailableJobCard
            key={job.id}
            job={job}
            requestStatus={requestStatuses[job.id]}
            requesting={requestingJobId === job.id}
            onRequest={() => handleRequestJob(job)}
          />
        ))
      )}
    </ScrollView>
  );
}

function AvailableJobCard({
  job,
  requestStatus,
  requesting,
  onRequest,
}: {
  job: FinderPublicJob;
  requestStatus?: FinderRequestStatus;
  requesting: boolean;
  onRequest: () => void;
}) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();

  const dateLabel = useMemo(() => {
    try {
      return format(parseISO(job.jobDate), 'EEE, MMM d');
    } catch {
      return job.jobDate;
    }
  }, [job.jobDate]);

  const alreadyRequested = requestStatus === 'pending';
  const requestLabel = requesting
    ? 'Sending…'
    : alreadyRequested
      ? 'Requested'
      : 'I’m Available';

  return (
    <View style={styles.jobCard}>
      <View style={styles.cardHeader}>
        <View style={styles.areaWrap}>
          <Ionicons name="location-outline" size={20} color={Colors.primary} />
          <Text style={styles.areaText}>{job.generalArea}</Text>
        </View>
        <View style={styles.openBadge}>
          <Text style={styles.openBadgeText}>OPEN</Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <View style={styles.detailPill}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.detailPillText}>{dateLabel}</Text>
        </View>
        <View style={styles.detailPill}>
          <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.detailPillText}>{job.startTime}</Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <Detail label="Yards" value={job.yards ? String(job.yards) : 'Not listed'} />
        <Detail label="Pump" value={job.pumpType || 'Any'} />
        <Detail label="PSI" value={job.concretePsi ? String(job.concretePsi) : 'Not listed'} />
        <Detail label="Pricing" value={pricingLabels[job.pricingMode]} />
      </View>

      {job.extraHoseRequired ? (
        <InfoLine
          icon="git-branch-outline"
          text={job.totalHoseFeet ? `About ${job.totalHoseFeet} ft total hose needed` : 'Extra hose required'}
        />
      ) : null}

      {job.ppeRequired ? (
        <InfoLine
          icon="shield-outline"
          text={job.requiredPpe?.length ? `PPE: ${job.requiredPpe.join(', ')}` : 'Special PPE required'}
        />
      ) : null}

      {job.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Jobsite details</Text>
          <Text style={styles.notesText}>{job.notes}</Text>
        </View>
      ) : null}

      <View style={styles.privateReminder}>
        <Ionicons name="lock-closed-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.privateReminderText}>
          Exact address is hidden until award + confirmation.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.requestButton,
          alreadyRequested && styles.requestButtonRequested,
        ]}
        onPress={onRequest}
        disabled={requesting || alreadyRequested}
        activeOpacity={0.8}
      >
        <Ionicons
          name={alreadyRequested ? 'checkmark-circle' : 'hand-right-outline'}
          size={20}
          color={alreadyRequested ? Colors.primary : Colors.onPrimary}
        />
        <Text
          style={[
            styles.requestButtonText,
            alreadyRequested && styles.requestButtonRequestedText,
          ]}
        >
          {requestLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function InfoLine({ icon, text }: { icon: any; text: string }) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  return (
    <View style={styles.infoLine}>
      <Ionicons name={icon} size={17} color={Colors.primary} />
      <Text style={styles.infoLineText}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles(Colors => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 36 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    padding: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noticeText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  stateCard: {
    minHeight: 180,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 8,
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
  jobCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  areaWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  areaText: {
    flex: 1,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  openBadge: {
    backgroundColor: Colors.primaryBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  openBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailPillText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 6,
  },
  detailCell: {
    width: '50%',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  detailLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  detailValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 8,
  },
  infoLineText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
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
  privateReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  privateReminderText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  requestButton: {
    minHeight: 50,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  requestButtonRequested: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  requestButtonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  requestButtonRequestedText: {
    color: Colors.primary,
  },
}));
