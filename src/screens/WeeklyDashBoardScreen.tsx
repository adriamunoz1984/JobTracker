// src/screens/WeeklyDashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Divider, Chip } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { 
  format, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
  addDays
} from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

export default function WeeklyDashboardScreen() {
  const navigation = useNavigation();
  const { jobs } = useJobs();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const currentDate = new Date();
  const adjustedDate = addDays(currentDate, weekOffset * 7);
  const weekStart = startOfWeek(adjustedDate);
  const weekEnd = endOfWeek(adjustedDate);

  // Filter jobs for current week
  const weekJobs = jobs.filter(job => {
    const jobDate = parseISO(job.date);
    return isWithinInterval(jobDate, { start: weekStart, end: weekEnd });
  });

  // Calculate totals
  const totals = {
    income: weekJobs.reduce((sum, job) => sum + (job.amount || 0), 0),
    commission: 0,
    cashPayments: weekJobs.filter(j => j.paymentMethod === 'Cash').reduce((sum, job) => sum + (job.amount || 0), 0),
    paidToMeAmount: weekJobs.filter(j => j.isPaidToMe).reduce((sum, job) => sum + (job.amount || 0), 0),
    yourPay: 0,
    totalUnpaid: weekJobs.filter(j => !j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0),
    finalTakeHome: 0,
    totalJobs: weekJobs.length,
    totalYards: weekJobs.reduce((sum, job) => sum + (job.yards || 0), 0),
    paidJobs: weekJobs.filter(j => j.isPaid).length,
    unpaidJobs: weekJobs.filter(j => !j.isPaid).length,
    avgJobSize: weekJobs.length > 0 ? weekJobs.reduce((sum, job) => sum + (job.amount || 0), 0) / weekJobs.length : 0,
  };

  const isOwner = user?.role === 'owner';
  const commissionRate = user?.commissionRate || 50;

  if (!isOwner) {
    totals.commission = (totals.income * commissionRate) / 100;
    totals.yourPay = totals.commission - totals.cashPayments;
    totals.finalTakeHome = totals.yourPay;
  } else {
    totals.finalTakeHome = totals.income - totals.paidToMeAmount;
  }

  // Get daily breakdown
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const dailyData = days.map((day) => {
    const dayJobs = weekJobs.filter(job => {
      const jobDate = parseISO(job.date);
      return format(jobDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    });

    return {
      day: format(day, 'EEE'),
      date: format(day, 'MMM d'),
      jobs: dayJobs.length,
      revenue: dayJobs.reduce((sum, job) => sum + (job.amount || 0), 0),
      yards: dayJobs.reduce((sum, job) => sum + (job.yards || 0), 0),
    };
  });

  const chartData = {
    labels: dailyData.map(d => d.day),
    datasets: [{
      data: dailyData.map(d => d.revenue > 0 ? d.revenue : 0),
    }],
  };

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
      r: '5',
      strokeWidth: '2',
      stroke: Colors.primary,
    },
  };

  const goToPreviousWeek = () => {
    setWeekOffset(weekOffset - 1);
  };

  const goToNextWeek = () => {
    setWeekOffset(weekOffset + 1);
  };

  const goToCurrentWeek = () => {
    setWeekOffset(0);
  };

  const handleWeekPress = () => {
    // Navigate to Home with week filter params
    (navigation as any).navigate('Home', {
      filterWeekStart: format(weekStart, 'yyyy-MM-dd'),
      filterWeekEnd: format(weekEnd, 'yyyy-MM-dd'),
      filterWeekLabel: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
    });
  };

  const handleMetricPress = (metricType: any) => {
    (navigation as any).navigate('DetailedReport', {
      metricType,
      jobs: weekJobs,
      timeLabel: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
      isOwner: user?.role === 'owner',
      commissionRate: user?.commissionRate || 50,
    });
  };

  const exportPDF = async () => {
    try {
      setIsExporting(true);

      const dailyRows = dailyData.map(day => `
        <tr>
          <td>${day.day} ${day.date}</td>
          <td>${day.jobs}</td>
          <td>${day.yards.toFixed(1)}</td>
          <td>$${day.revenue.toFixed(2)}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              line-height: 1.6;
            }
            h1 { 
              color: ${Colors.primary}; 
              border-bottom: 3px solid ${Colors.primary}; 
              padding-bottom: 10px;
            }
            h2 { 
              color: ${Colors.secondary}; 
              margin-top: 30px;
              border-left: 4px solid ${Colors.primary};
              padding-left: 10px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left;
            }
            th { 
              background-color: ${Colors.primary}; 
              color: white;
            }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .summary { 
              background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0;
            }
            .summary p { margin: 10px 0; font-size: 16px; }
            .total { 
              font-size: 24px; 
              font-weight: bold; 
              color: ${Colors.success}; 
              margin-top: 20px;
              padding: 15px;
              background-color: ${Colors.successBg};
              border-radius: 5px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>📊 Weekly Dashboard</h1>
          <p style="color: #666; font-size: 14px;">
            ${format(weekStart, 'MMMM d')} - ${format(weekEnd, 'MMMM d, yyyy')}
          </p>
          
          <div class="summary">
            <h2>Week Totals</h2>
            <p><strong>Total Jobs:</strong> ${totals.totalJobs}</p>
            <p><strong>Total Yards:</strong> ${totals.totalYards.toFixed(1)}</p>
            <p><strong>Total Income:</strong> $${totals.income.toFixed(2)}</p>
            <p><strong>Average Job Size:</strong> $${totals.avgJobSize.toFixed(2)}</p>
            <p><strong>Paid Jobs:</strong> ${totals.paidJobs}</p>
            <p><strong>Unpaid Jobs:</strong> ${totals.unpaidJobs}</p>
            <p><strong>Total Unpaid:</strong> $${totals.totalUnpaid.toFixed(2)}</p>
            ${!isOwner ? `
              <p><strong>Commission (${commissionRate}%):</strong> $${totals.commission.toFixed(2)}</p>
              <p><strong>Cash Payments:</strong> $${totals.cashPayments.toFixed(2)}</p>
            ` : `
              <p><strong>Paid to Me:</strong> $${totals.paidToMeAmount.toFixed(2)}</p>
            `}
            <div class="total">Final Take Home: $${totals.finalTakeHome.toFixed(2)}</div>
          </div>
          
          <h2>Daily Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Jobs</th>
                <th>Yards</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${dailyRows}
            </tbody>
          </table>
          
          <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; text-align: center;">
            Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDayPress = (index: number, dayData: any) => {
    if (dayData.jobs > 0) {
      const dayDate = days[index];
      (navigation as any).navigate('DailyJobs', {
        date: format(dayDate, 'yyyy-MM-dd'),
        dayName: dayData.day,
        dayDate: dayData.date,
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleWeekPress} style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
            </Text>
            {weekOffset !== 0 && (
              <TouchableOpacity onPress={goToCurrentWeek} style={styles.currentWeekButton}>
                <Text style={styles.currentWeekButtonText}>Back to Current Week</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Stats */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>This Week at a Glance</Text>
            <Divider style={styles.divider} />

            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={[styles.metricBox, styles.metricBoxPrimary]}
                onPress={() => handleMetricPress('income')}
                activeOpacity={0.7}
              >
                <Text style={styles.metricLabelInverse}>Total Income</Text>
                <Text style={styles.metricValueInverse}>${totals.income.toLocaleString()}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.metricBox, styles.metricBoxSuccess]}
                onPress={() => handleMetricPress('takeHome')}
                activeOpacity={0.7}
              >
                <Text style={styles.metricLabelInverse}>Take Home</Text>
                <Text style={styles.metricValueInverse}>${totals.finalTakeHome.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={styles.metricBox}
                onPress={() => handleMetricPress('paid')}
                activeOpacity={0.7}
              >
                <Text style={styles.metricLabel}>Jobs</Text>
                <Text style={styles.metricValue}>{totals.totalJobs}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricBox}
                onPress={() => handleMetricPress('yards')}
                activeOpacity={0.7}
              >
                <Text style={styles.metricLabel}>Yards</Text>
                <Text style={styles.metricValue}>{totals.totalYards.toFixed(0)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricBox}
                onPress={() => handleMetricPress('avgJob')}
                activeOpacity={0.7}
              >
                <Text style={styles.metricLabel}>Avg Job</Text>
                <Text style={styles.metricValue}>${totals.avgJobSize.toFixed(0)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={[styles.metricBox, styles.metricBoxSuccess]}
                onPress={() => handleMetricPress('paid')}
                activeOpacity={0.7}
              >
                <Text style={styles.metricLabelInverse}>Paid</Text>
                <Text style={styles.metricValueInverse}>{totals.paidJobs}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.metricBox, styles.metricBoxError]}
                onPress={() => handleMetricPress('unpaid')}
                activeOpacity={0.7}
              >
                <Text style={styles.metricLabelInverse}>Unpaid</Text>
                <Text style={styles.metricValueInverse}>{totals.unpaidJobs}</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Earnings Breakdown */}
        {!isOwner && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>💰 Your Earnings</Text>
              <Divider style={styles.divider} />

              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Total Income:</Text>
                <Text style={styles.earningsValue}>${totals.income.toFixed(2)}</Text>
              </View>

              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Your Commission ({commissionRate}%):</Text>
                <Text style={styles.earningsValue}>${totals.commission.toFixed(2)}</Text>
              </View>

              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>- Cash Payments:</Text>
                <Text style={styles.earningsValue}>-${totals.cashPayments.toFixed(2)}</Text>
              </View>

              <Divider style={styles.divider} />

              <LinearGradient
                colors={[Colors.success, Colors.successLight]}
                style={styles.totalBox}
              >
                <Text style={styles.totalLabel}>Your Pay:</Text>
                <Text style={styles.totalValue}>${totals.yourPay.toFixed(2)}</Text>
              </LinearGradient>
            </Card.Content>
          </Card>
        )}

        {/* Owner Earnings */}
        {isOwner && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>💼 Owner Earnings</Text>
              <Divider style={styles.divider} />

              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Total Income:</Text>
                <Text style={styles.earningsValue}>${totals.income.toFixed(2)}</Text>
              </View>

              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>- Paid to Me:</Text>
                <Text style={styles.earningsValue}>-${totals.paidToMeAmount.toFixed(2)}</Text>
              </View>

              <Divider style={styles.divider} />

              <LinearGradient
                colors={[Colors.success, Colors.successLight]}
                style={styles.totalBox}
              >
                <Text style={styles.totalLabel}>Final Take Home:</Text>
                <Text style={styles.totalValue}>${totals.finalTakeHome.toFixed(2)}</Text>
              </LinearGradient>
            </Card.Content>
          </Card>
        )}

        {/* Daily Revenue Chart */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📊 Daily Revenue</Text>
            <Divider style={styles.divider} />

            {dailyData.some(d => d.revenue > 0) ? (
              <LineChart
                data={chartData}
                width={screenWidth - 60}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                yAxisLabel="$"
                formatYLabel={(value) => `$${parseFloat(value).toFixed(0)}`}
              />
            ) : (
              <Text style={styles.noDataText}>No revenue data for this week</Text>
            )}
          </Card.Content>
        </Card>

        {/* Daily Breakdown */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📋 Daily Breakdown</Text>
            <Divider style={styles.divider} />

            {dailyData.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dayRow}
                onPress={() => handleDayPress(index, day)}
                disabled={day.jobs === 0}
                activeOpacity={day.jobs > 0 ? 0.7 : 1}
              >
                <View style={styles.dayInfo}>
                  <Text style={styles.dayName}>{day.day}</Text>
                  <Text style={styles.dayDate}>{day.date}</Text>
                </View>
                <View style={styles.dayStats}>
                  {day.jobs > 0 ? (
                    <>
                      <Chip compact style={styles.jobsChip}>{day.jobs} jobs</Chip>
                      <Chip compact style={styles.yardsChip}>{day.yards.toFixed(0)} yds</Chip>
                      <Text style={styles.dayRevenue}>${day.revenue.toFixed(0)}</Text>
                    </>
                  ) : (
                    <Text style={styles.noJobsText}>No jobs</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </Card.Content>
        </Card>

        {/* Export Button */}
        <Button
          mode="contained"
          icon="file-pdf-box"
          onPress={exportPDF}
          loading={isExporting}
          disabled={isExporting}
          style={styles.exportButton}
          buttonColor={Colors.error}
        >
          Export as PDF
        </Button>
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
    paddingVertical: 0,
    paddingHorizontal: 0,
    ...Shadows.medium,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  navButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButtonText: {
    fontSize: 32,
    color: Colors.textInverse,
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textInverse,
    opacity: 0.9,
    textAlign: 'center',
  },
  currentWeekButton: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.small,
  },
  currentWeekButtonText: {
    fontSize: 13,
    color: Colors.textInverse,
    fontWeight: '800',
    padding: 10
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
  metricBoxError: {
    backgroundColor: Colors.error,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  metricLabelInverse: {
    fontSize: 11,
    color: Colors.textInverse,
    opacity: 0.9,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  metricValueInverse: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textInverse,
    textAlign: 'center',
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  earningsLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textInverse,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textInverse,
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
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
  },
  dayInfo: {
    minWidth: 80,
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  dayDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  jobsChip: {
    backgroundColor: Colors.infoBg,
  },
  yardsChip: {
    backgroundColor: Colors.warningBg,
  },
  dayRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.success,
    minWidth: 60,
    textAlign: 'right',
  },
  noJobsText: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  exportButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
});