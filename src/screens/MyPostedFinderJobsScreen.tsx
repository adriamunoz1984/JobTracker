import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { subscribeMyPostedFinderJobs } from '../services/pumpFinderMarketplace';
import { FinderPublicJob } from '../types/pumpFinder';
import { makeStyles, useAppTheme } from '../theme';
import ThemedHero from '../components/ThemedHero';

const statusLabels: Record<string, string> = {
  unassigned: 'Open',
  'award-pending': 'Waiting for confirmation',
  assigned: 'Confirmed',
  'in-progress': 'In progress',
  completed: 'Completed',
  canceled: 'Canceled',
};

export default function MyPostedFinderJobsScreen({ navigation }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const [jobs, setJobs] = useState<FinderPublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribeMyPostedFinderJobs(
        nextJobs => {
          setJobs(nextJobs);
          setLoadError('');
          setLoading(false);
        },
        error => {
          setLoadError(error.message || 'Could not load your posted jobs.');
          setLoading(false);
        }
      );
    } catch (error: any) {
      setLoadError(error?.message || 'Could not load your posted jobs.');
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedHero
        icon="clipboard-outline"
        title="My Posted Jobs"
        subtitle="See your Pump Finder posts, review interested pumpers, and choose who receives the job."
      />

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Loading your posted jobs…</Text>
        </View>
      ) : loadError ? (
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
          <Text style={styles.stateTitle}>Couldn’t load jobs</Text>
          <Text style={styles.stateText}>{loadError}</Text>
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.stateCard}>
          <Ionicons name="document-text-outline" size={44} color={Colors.primary} />
          <Text style={styles.stateTitle}>No posted jobs yet</Text>
          <Text style={styles.stateText}>Post a pumping job and it will appear here.</Text>
        </View>
      ) : (
        jobs.map(job => {
          let dateLabel = job.jobDate;
          try {
            dateLabel = format(parseISO(job.jobDate), 'EEE, MMM d');
          } catch {}

          return (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.cardHeader}>
                <View style={styles.areaWrap}>
                  <Ionicons name="location-outline" size={20} color={Colors.primary} />
                  <Text style={styles.areaText}>{job.generalArea}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusText}>{statusLabels[job.status] || job.status}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{dateLabel}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{job.startTime}</Text>
                {job.yards ? (
                  <>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>{job.yards} yd</Text>
                  </>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.requestsButton}
                onPress={() => navigation.navigate('InterestedPumpers', { jobId: job.id })}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={20} color={Colors.onPrimary} />
                <Text style={styles.requestsButtonText}>View Interested Pumpers</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.onPrimary} />
              </TouchableOpacity>
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
  stateCard: {
    minHeight: 190,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  statusPill: {
    maxWidth: 150,
    backgroundColor: Colors.primaryBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 11,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  metaDot: {
    color: Colors.textLight,
    fontSize: 12,
  },
  requestsButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
  },
  requestsButtonText: {
    flex: 1,
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
}));
