// src/screens/DetailedReportScreen.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, Card, Divider, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Job } from '../types';
import { format, parseISO } from 'date-fns';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

type MetricType = 'income' | 'takeHome' | 'paid' | 'unpaid' | 'yards' | 'avgJob';

interface DetailedReportParams {
  metricType: MetricType;
  jobs: Job[];
  timeLabel: string;
  isOwner: boolean;
  commissionRate?: number;
}

export default function DetailedReportScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as DetailedReportParams;

  const { metricType, jobs, timeLabel, isOwner, commissionRate = 50 } = params;

  // Filter jobs based on metric type
  const filteredJobs = useMemo(() => {
    switch (metricType) {
      case 'paid':
        return jobs.filter(j => j.isPaid);
      case 'unpaid':
        return jobs.filter(j => !j.isPaid);
      default:
        return jobs;
    }
  }, [metricType, jobs]);

  // Calculate metrics
  const totalIncome = jobs.reduce((sum, job) => sum + (job.amount || 0), 0);
  const commission = (totalIncome * commissionRate) / 100;
  const cashPayments = jobs
    .filter(j => j.paymentMethod === 'Cash')
    .reduce((sum, job) => sum + (job.amount || 0), 0);
  const takeHome = commission - cashPayments;
  const paidAmount = jobs.filter(j => j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0);
  const unpaidAmount = jobs.filter(j => !j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0);
  const totalYards = jobs.reduce((sum, job) => sum + (job.yards || 0), 0);
  const avgJobSize = jobs.length > 0 ? totalIncome / jobs.length : 0;

  // Get breakdown based on metric type
  const getBreakdown = () => {
    switch (metricType) {
      case 'income': {
        const byMethod = {
          cash: jobs.filter(j => j.paymentMethod === 'Cash').reduce((sum, j) => sum + (j.amount || 0), 0),
          check: jobs.filter(j => j.paymentMethod === 'Check').reduce((sum, j) => sum + (j.amount || 0), 0),
          zelle: jobs.filter(j => j.paymentMethod === 'Zelle').reduce((sum, j) => sum + (j.amount || 0), 0),
          charge: jobs.filter(j => j.paymentMethod === 'Charge').reduce((sum, j) => sum + (j.amount || 0), 0),
          card: jobs.filter(j => j.paymentMethod === 'Card').reduce((sum, j) => sum + (j.amount || 0), 0),
        };
        return (
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>💵 Cash:</Text>
              <Text style={styles.breakdownValue}>${byMethod.cash.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>📝 Check:</Text>
              <Text style={styles.breakdownValue}>${byMethod.check.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>📱 Zelle:</Text>
              <Text style={styles.breakdownValue}>${byMethod.zelle.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>🔄 Charge:</Text>
              <Text style={styles.breakdownValue}>${byMethod.charge.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>💳 Card:</Text>
              <Text style={styles.breakdownValue}>${byMethod.card.toFixed(2)}</Text>
            </View>
          </View>
        );
      }

      case 'takeHome':
        return (
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Income:</Text>
              <Text style={styles.breakdownValue}>${totalIncome.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Commission ({commissionRate}%):</Text>
              <Text style={styles.breakdownValue}>${commission.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>- Cash Payments:</Text>
              <Text style={styles.breakdownValue}>-${cashPayments.toFixed(2)}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, styles.bold]}>Your Take Home:</Text>
              <Text style={[styles.breakdownValue, styles.bold, { color: Colors.success }]}>
                ${takeHome.toFixed(2)}
              </Text>
            </View>
          </View>
        );

      case 'paid':
        return (
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Paid Jobs:</Text>
              <Chip style={styles.chip}>{filteredJobs.length}</Chip>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Collected:</Text>
              <Text style={styles.breakdownValue}>${paidAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>% of Total:</Text>
              <Text style={styles.breakdownValue}>
                {totalIncome > 0 ? ((paidAmount / totalIncome) * 100).toFixed(1) : 0}%
              </Text>
            </View>
          </View>
        );

      case 'unpaid':
        return (
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Unpaid Jobs:</Text>
              <Chip style={[styles.chip, { backgroundColor: Colors.errorBg }]}>
                {filteredJobs.length}
              </Chip>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Amount Due:</Text>
              <Text style={[styles.breakdownValue, { color: Colors.error }]}>
                ${unpaidAmount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>% of Total:</Text>
              <Text style={styles.breakdownValue}>
                {totalIncome > 0 ? ((unpaidAmount / totalIncome) * 100).toFixed(1) : 0}%
              </Text>
            </View>
          </View>
        );

      case 'yards':
        return (
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Yards:</Text>
              <Text style={styles.breakdownValue}>{totalYards.toFixed(1)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Average per Job:</Text>
              <Text style={styles.breakdownValue}>
                {jobs.length > 0 ? (totalYards / jobs.length).toFixed(1) : 0}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Largest Job:</Text>
              <Text style={styles.breakdownValue}>
                {Math.max(...jobs.map(j => j.yards || 0)).toFixed(1)} yds
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Jobs Count:</Text>
              <Chip style={styles.chip}>{jobs.length}</Chip>
            </View>
          </View>
        );

      case 'avgJob':
        return (
          <View style={styles.breakdownContainer}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Average Job Size:</Text>
              <Text style={styles.breakdownValue}>${avgJobSize.toFixed(2)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Jobs:</Text>
              <Chip style={styles.chip}>{jobs.length}</Chip>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Smallest:</Text>
              <Text style={styles.breakdownValue}>
                ${Math.min(...jobs.map(j => j.amount || 0)).toFixed(2)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Largest:</Text>
              <Text style={styles.breakdownValue}>
                ${Math.max(...jobs.map(j => j.amount || 0)).toFixed(2)}
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (metricType) {
      case 'income':
        return `💰 Total Income`;
      case 'takeHome':
        return `🏦 Take Home`;
      case 'paid':
        return `✓ Paid Jobs`;
      case 'unpaid':
        return `⏳ Unpaid Jobs`;
      case 'yards':
        return `📏 Total Yards`;
      case 'avgJob':
        return `📊 Average Job`;
      default:
        return 'Report';
    }
  };

  const renderJobRow = ({ item }: { item: Job }) => (
    <View style={styles.jobRow}>
      <View style={styles.jobInfo}>
        <Text style={styles.clientName}>{item.clientName || item.companyName || 'N/A'}</Text>
        <Text style={styles.jobMeta}>
          {format(parseISO(item.date), 'MMM d')} • {item.city}
        </Text>
      </View>
      <Text style={styles.jobAmount}>${item.amount.toFixed(0)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{getTitle()}</Text>
        <Text style={styles.headerSubtitle}>{timeLabel}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Breakdown Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Breakdown</Text>
            <Divider style={styles.divider} />
            {getBreakdown()}
          </Card.Content>
        </Card>

        {/* Jobs List */}
        {filteredJobs.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Jobs ({filteredJobs.length})
              </Text>
              <Divider style={styles.divider} />

              <FlatList
                data={filteredJobs.sort((a, b) => 
                  parseISO(b.date).getTime() - parseISO(a.date).getTime()
                )}
                renderItem={renderJobRow}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </Card.Content>
          </Card>
        )}

        {filteredJobs.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No jobs for this period</Text>
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
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
    padding: Spacing.md,
  },
  card: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.large,
    ...Shadows.medium,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  divider: {
    marginVertical: Spacing.md,
  },
  breakdownContainer: {
    gap: Spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  bold: {
    fontWeight: '700',
  },
  chip: {
    height: 28,
    backgroundColor: Colors.infoBg,
  },
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  jobInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  jobMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  jobAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
    marginLeft: Spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
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