// src/screens/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { 
  Card, 
  Text, 
  SegmentedButtons,
  Divider,
  Chip
} from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfYear,
  endOfYear,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isWithinInterval,
  parseISO,
  addDays
} from 'date-fns';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const { jobs } = useJobs();
  const { user } = useAuth();

  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now),
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      case 'year':
        return {
          start: startOfYear(now),
          end: endOfYear(now),
        };
    }
  };

  useEffect(() => {
    const { start, end } = getDateRange();
    
    const filtered = jobs.filter(job => {
      const jobDate = parseISO(job.date);
      return isWithinInterval(jobDate, { start, end });
    });

    setFilteredJobs(filtered);
  }, [jobs, timeRange]);

  // Calculate stats
  const stats = {
    totalJobs: filteredJobs.length,
    totalYards: filteredJobs.reduce((sum, job) => sum + (job.yards || 0), 0),
    totalRevenue: filteredJobs.reduce((sum, job) => sum + (job.amount || 0), 0),
    paidRevenue: filteredJobs.filter(j => j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0),
    unpaidRevenue: filteredJobs.filter(j => !j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0),
    avgJobSize: filteredJobs.length > 0 
      ? filteredJobs.reduce((sum, job) => sum + (job.amount || 0), 0) / filteredJobs.length 
      : 0,
    avgYardsPerJob: filteredJobs.length > 0
      ? filteredJobs.reduce((sum, job) => sum + (job.yards || 0), 0) / filteredJobs.length
      : 0,
    
    cashJobs: filteredJobs.filter(j => j.paymentMethod === 'Cash').length,
    checkJobs: filteredJobs.filter(j => j.paymentMethod === 'Check').length,
    chargeJobs: filteredJobs.filter(j => j.paymentMethod === 'Charge').length,
    
    employeeJobs: filteredJobs.filter(j => (j as any).isEmployeeJob).length,
    ownerJobs: filteredJobs.filter(j => !(j as any).isEmployeeJob).length,
  };

  // Generate chart data based on time range
  const generateChartData = () => {
    const { start, end } = getDateRange();
    
    if (timeRange === 'week') {
      // Daily data for the week
      const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      const labels = days.map(d => format(d, 'EEE'));
      const revenueData = days.map(day => {
        const dayJobs = filteredJobs.filter(job => 
          format(parseISO(job.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        );
        return dayJobs.reduce((sum, job) => sum + (job.amount || 0), 0);
      });
      const jobsData = days.map(day => {
        return filteredJobs.filter(job => 
          format(parseISO(job.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
        ).length;
      });
      
      return { labels, revenueData, jobsData };
    } 
    else if (timeRange === 'month') {
      // Weekly data for the month
      const weeks = eachWeekOfInterval({ start, end });
      const labels = weeks.map((_, i) => `W${i + 1}`);
      const revenueData = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart);
        const weekJobs = filteredJobs.filter(job => {
          const jobDate = parseISO(job.date);
          return isWithinInterval(jobDate, { start: weekStart, end: weekEnd });
        });
        return weekJobs.reduce((sum, job) => sum + (job.amount || 0), 0);
      });
      const jobsData = weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart);
        return filteredJobs.filter(job => {
          const jobDate = parseISO(job.date);
          return isWithinInterval(jobDate, { start: weekStart, end: weekEnd });
        }).length;
      });
      
      return { labels, revenueData, jobsData };
    } 
    else {
      // Monthly data for the year
      const months = eachMonthOfInterval({ start, end });
      const labels = months.map(m => format(m, 'MMM'));
      const revenueData = months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const monthJobs = filteredJobs.filter(job => {
          const jobDate = parseISO(job.date);
          return isWithinInterval(jobDate, { start: monthStart, end: monthEnd });
        });
        return monthJobs.reduce((sum, job) => sum + (job.amount || 0), 0);
      });
      const jobsData = months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        return filteredJobs.filter(job => {
          const jobDate = parseISO(job.date);
          return isWithinInterval(jobDate, { start: monthStart, end: monthEnd });
        }).length;
      });
      
      return { labels, revenueData, jobsData };
    }
  };

  const chartData = generateChartData();

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: BorderRadius.large,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.secondary, Colors.secondaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>📈 Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          {format(getDateRange().start, 'MMM d')} - {format(getDateRange().end, 'MMM d, yyyy')}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Time Range Selector */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Time Range</Text>
            <SegmentedButtons
              value={timeRange}
              onValueChange={(value) => setTimeRange(value as any)}
              buttons={[
                { value: 'week', label: 'Week', icon: 'calendar-week' },
                { value: 'month', label: 'Month', icon: 'calendar-month' },
                { value: 'year', label: 'Year', icon: 'calendar' },
              ]}
              style={styles.segmentedButtons}
            />
          </Card.Content>
        </Card>

        {/* Key Metrics */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Key Metrics</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.metricsGrid}>
              <View style={[styles.metricBox, styles.metricBoxPrimary]}>
                <Text style={styles.metricLabel}>Total Revenue</Text>
                <Text style={styles.metricValue}>${stats.totalRevenue.toLocaleString()}</Text>
              </View>
              
              <View style={[styles.metricBox, styles.metricBoxSuccess]}>
                <Text style={styles.metricLabelInverse}>Collected</Text>
                <Text style={styles.metricValueInverse}>${stats.paidRevenue.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={[styles.metricBox, styles.metricBoxSecondary]}>
                <Text style={styles.metricLabelInverse}>Total Jobs</Text>
                <Text style={styles.metricValueInverse}>{stats.totalJobs}</Text>
              </View>
              
              <View style={[styles.metricBox, styles.metricBoxAccent]}>
                <Text style={styles.metricLabel}>Total Yards</Text>
                <Text style={styles.metricValue}>{stats.totalYards.toFixed(0)}</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Avg Job</Text>
                <Text style={styles.metricValue}>${stats.avgJobSize.toFixed(0)}</Text>
              </View>
              
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Avg Yards</Text>
                <Text style={styles.metricValue}>{stats.avgYardsPerJob.toFixed(1)}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Revenue Trend */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>💰 Revenue Trend</Text>
            <Text style={styles.chartSubtitle}>
              {timeRange === 'week' ? 'Daily' : timeRange === 'month' ? 'Weekly' : 'Monthly'} breakdown
            </Text>
            {chartData.revenueData.length > 0 ? (
              <LineChart
                data={{
                  labels: chartData.labels,
                  datasets: [{ data: chartData.revenueData }],
                }}
                width={screenWidth - 60}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                formatYLabel={(value) => `$${parseFloat(value).toFixed(0)}`}
              />
            ) : (
              <Text style={styles.noDataText}>No data for this period</Text>
            )}
          </Card.Content>
        </Card>

        {/* Jobs Count Trend */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📊 Jobs Volume</Text>
            <Text style={styles.chartSubtitle}>
              Number of jobs {timeRange === 'week' ? 'per day' : timeRange === 'month' ? 'per week' : 'per month'}
            </Text>
            {chartData.jobsData.length > 0 ? (
              <BarChart
                data={{
                  labels: chartData.labels,
                  datasets: [{ data: chartData.jobsData.length > 0 ? chartData.jobsData : [0] }],
                }}
                width={screenWidth - 60}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
                }}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
              />
            ) : (
              <Text style={styles.noDataText}>No data for this period</Text>
            )}
          </Card.Content>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Payment Methods</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.paymentRow}>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>💵 Cash</Text>
                <Chip style={[styles.paymentChip, { backgroundColor: Colors.payment.cash }]}>
                  {stats.cashJobs} jobs
                </Chip>
              </View>
              
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>📝 Check</Text>
                <Chip style={[styles.paymentChip, { backgroundColor: Colors.payment.check }]}>
                  {stats.checkJobs} jobs
                </Chip>
              </View>
              
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>📋 Charge</Text>
                <Chip style={[styles.paymentChip, { backgroundColor: Colors.payment.charge }]}>
                  {stats.chargeJobs} jobs
                </Chip>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Owner: Team Performance */}
        {user?.role === 'owner' && stats.employeeJobs > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>👥 Team Performance</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.teamRow}>
                <View style={styles.teamItem}>
                  <Text style={styles.teamLabel}>Your Jobs</Text>
                  <Text style={styles.teamValue}>{stats.ownerJobs}</Text>
                  <Text style={styles.teamPercent}>
                    {((stats.ownerJobs / stats.totalJobs) * 100).toFixed(0)}%
                  </Text>
                </View>
                
                <View style={styles.teamItem}>
                  <Text style={styles.teamLabel}>Employee Jobs</Text>
                  <Text style={styles.teamValue}>{stats.employeeJobs}</Text>
                  <Text style={styles.teamPercent}>
                    {((stats.employeeJobs / stats.totalJobs) * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Collection Rate */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>💳 Collection Rate</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.collectionContainer}>
              <View style={styles.collectionBar}>
                <View 
                  style={[
                    styles.collectionFill, 
                    { 
                      width: `${stats.totalRevenue > 0 ? (stats.paidRevenue / stats.totalRevenue) * 100 : 0}%`,
                      backgroundColor: Colors.success
                    }
                  ]} 
                />
              </View>
              
              <Text style={styles.collectionText}>
                {stats.totalRevenue > 0 
                  ? ((stats.paidRevenue / stats.totalRevenue) * 100).toFixed(1)
                  : 0}% collected
              </Text>
              
              <View style={styles.collectionStats}>
                <View style={styles.collectionStat}>
                  <Text style={styles.collectionStatLabel}>Paid</Text>
                  <Text style={[styles.collectionStatValue, { color: Colors.success }]}>
                    ${stats.paidRevenue.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.collectionStat}>
                  <Text style={styles.collectionStatLabel}>Unpaid</Text>
                  <Text style={[styles.collectionStatValue, { color: Colors.error }]}>
                    ${stats.unpaidRevenue.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
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
    marginBottom: Spacing.sm,
    fontWeight: 'bold',
    color: Colors.text,
  },
  divider: {
    marginVertical: Spacing.md,
    backgroundColor: Colors.borderLight,
  },
  segmentedButtons: {
    marginTop: Spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metricBox: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
  },
  metricBoxPrimary: {
    backgroundColor: Colors.primary,
  },
  metricBoxSuccess: {
    backgroundColor: Colors.success,
  },
  metricBoxSecondary: {
    backgroundColor: Colors.secondary,
  },
  metricBoxAccent: {
    backgroundColor: Colors.accent,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  metricLabelInverse: {
    fontSize: 12,
    color: Colors.textInverse,
    opacity: 0.9,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  metricValueInverse: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textInverse,
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  chart: {
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  noDataText: {
    textAlign: 'center',
    color: Colors.textLight,
    fontStyle: 'italic',
    paddingVertical: Spacing.xl,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: Spacing.sm,
  },
  paymentItem: {
    alignItems: 'center',
    flex: 1,
  },
  paymentLabel: {
    fontSize: 14,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  paymentChip: {
    minWidth: 70,
  },
  teamRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  teamItem: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.infoBg,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
  },
  teamLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  teamValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.info,
  },
  teamPercent: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  collectionContainer: {
    paddingVertical: Spacing.sm,
  },
  collectionBar: {
    height: 24,
    backgroundColor: Colors.errorBg,
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  collectionFill: {
    height: '100%',
    borderRadius: BorderRadius.medium,
  },
  collectionText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  collectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  collectionStat: {
    alignItems: 'center',
  },
  collectionStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  collectionStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});