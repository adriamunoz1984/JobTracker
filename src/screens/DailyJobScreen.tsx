// src/screens/DailyJobsScreen.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useJobs } from '../context/JobsContext';
import { Job } from '../types';
import { parseISO, format } from 'date-fns';
import JobCard from '../components/JobCard';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

interface DailyJobsParams {
  date: string;
  dayName: string;
  dayDate: string;
}

export default function DailyJobsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { jobs } = useJobs();
  const params = route.params as DailyJobsParams;

  const { date, dayName, dayDate } = params;

  // Filter jobs for this specific date
  const dailyJobs = useMemo(() => {
    return jobs.filter((job) => {
      const jobDate = format(parseISO(job.date), 'yyyy-MM-dd');
      return jobDate === date;
    });
  }, [jobs, date]);

  // Separate paid and unpaid
  const unpaidJobs = dailyJobs.filter((job) => !job.isPaid);
  const paidJobs = dailyJobs.filter((job) => job.isPaid);

  // Calculate totals
  const totalRevenue = dailyJobs.reduce((sum, job) => sum + (job.amount || 0), 0);
  const totalYards = dailyJobs.reduce((sum, job) => sum + (job.yards || 0), 0);

  const handleJobPress = (job: Job) => {
    (navigation as any).navigate('JobDetail', { job });
  };

  const renderJobSection = (title: string, data: Job[], isPaid: boolean) => {
    if (data.length === 0) return null;

    return (
      <View key={title} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View
            style={[
              styles.jobCountBadge,
              {
                backgroundColor: isPaid ? Colors.successBg : Colors.errorBg,
              },
            ]}
          >
            <Text
              style={[
                styles.jobCountText,
                { color: isPaid ? Colors.success : Colors.error },
              ]}
            >
              {data.length}
            </Text>
          </View>
        </View>

        {data.map((job) => (
          <TouchableOpacity
            key={job.id}
            onPress={() => handleJobPress(job)}
            activeOpacity={0.7}
          >
            <JobCard job={job} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>📅 {dayName}</Text>
        <Text style={styles.headerSubtitle}>{dayDate}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Jobs</Text>
            <Text style={styles.statValue}>{dailyJobs.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Yards</Text>
            <Text style={styles.statValue}>{totalYards.toFixed(0)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={styles.statValue}>${totalRevenue.toFixed(0)}</Text>
          </View>
        </View>

        {/* Jobs List */}
        {dailyJobs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No jobs for this day</Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            {unpaidJobs.length > 0 && renderJobSection('⏳ Unpaid', unpaidJobs, false)}
            {paidJobs.length > 0 && renderJobSection('✓ Paid', paidJobs, true)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    ...Shadows.medium,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    ...Shadows.small,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  jobCountBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
  },
  jobCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.large,
    ...Shadows.medium,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
    padding: Spacing.lg,
  },
});