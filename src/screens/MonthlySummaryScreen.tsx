// src/screens/MonthlySummaryScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, Text, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth,
  eachWeekOfInterval,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO
} from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

export default function MonthlySummaryScreen() {
  const { jobs } = useJobs();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Filter jobs for current month
  const monthJobs = jobs.filter(job => {
    const jobDate = parseISO(job.date);
    return isWithinInterval(jobDate, { start: monthStart, end: monthEnd });
  });

  // Calculate totals
  const totals = {
    income: monthJobs.reduce((sum, job) => sum + (job.amount || 0), 0),
    commission: 0,
    cashPayments: monthJobs.filter(j => j.paymentMethod === 'Cash').reduce((sum, job) => sum + (job.amount || 0), 0),
    paidToMeAmount: monthJobs.filter(j => j.isPaidToMe).reduce((sum, job) => sum + (job.amount || 0), 0),
    yourPay: 0,
    totalUnpaid: monthJobs.filter(j => !j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0),
    finalTakeHome: 0,
    totalJobs: monthJobs.length,
    totalYards: monthJobs.reduce((sum, job) => sum + (job.yards || 0), 0),
    paidJobs: monthJobs.filter(j => j.isPaid).length,
    unpaidJobs: monthJobs.filter(j => !j.isPaid).length,
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

  // Get weekly breakdown
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });
  const weeklyData = weeks.map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart);
    const weekJobs = monthJobs.filter(job => {
      const jobDate = parseISO(job.date);
      return isWithinInterval(jobDate, { start: weekStart, end: weekEnd });
    });

    return {
      week: `W${index + 1}`,
      jobs: weekJobs.length,
      revenue: weekJobs.reduce((sum, job) => sum + (job.amount || 0), 0),
      yards: weekJobs.reduce((sum, job) => sum + (job.yards || 0), 0),
    };
  });

  const chartData = {
    labels: weeklyData.map(w => w.week),
    datasets: [{
      data: weeklyData.map(w => w.revenue),
    }],
  };

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: BorderRadius.large,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: Colors.success,
    },
  };

  const exportPDF = async () => {
    try {
      setIsExporting(true);

      const weeklyRows = weeklyData.map(week => `
        <tr>
          <td>${week.week}</td>
          <td>${week.jobs}</td>
          <td>${week.yards.toFixed(1)}</td>
          <td>$${week.revenue.toFixed(2)}</td>
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
          <h1>📊 Monthly Summary - ${format(currentDate, 'MMMM yyyy')}</h1>
          
          <div class="summary">
            <h2>Monthly Totals</h2>
            <p><strong>Total Jobs:</strong> ${totals.totalJobs}</p>
            <p><strong>Total Yards:</strong> ${totals.totalYards.toFixed(1)}</p>
            <p><strong>Total Income:</strong> $${totals.income.toFixed(2)}</p>
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
          
          <h2>Weekly Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Week</th>
                <th>Jobs</th>
                <th>Yards</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${weeklyRows}
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

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.secondary, Colors.secondaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>📅 Monthly Summary</Text>
        <Text style={styles.headerSubtitle}>{format(currentDate, 'MMMM yyyy')}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Key Metrics */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Key Metrics</Text>
            <Divider style={styles.divider} />

            <View style={styles.metricsGrid}>
              <View style={[styles.metricBox, styles.metricBoxPrimary]}>
                <Text style={styles.metricLabelInverse}>Total Income</Text>
                <Text style={styles.metricValueInverse}>${totals.income.toLocaleString()}</Text>
              </View>

              <View style={[styles.metricBox, styles.metricBoxSuccess]}>
                <Text style={styles.metricLabelInverse}>Take Home</Text>
                <Text style={styles.metricValueInverse}>${totals.finalTakeHome.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Total Jobs</Text>
                <Text style={styles.metricValue}>{totals.totalJobs}</Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Total Yards</Text>
                <Text style={styles.metricValue}>{totals.totalYards.toFixed(0)}</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={[styles.metricBox, styles.metricBoxSuccess]}>
                <Text style={styles.metricLabelInverse}>Paid</Text>
                <Text style={styles.metricValueInverse}>{totals.paidJobs}</Text>
              </View>

              <View style={[styles.metricBox, styles.metricBoxError]}>
                <Text style={styles.metricLabelInverse}>Unpaid</Text>
                <Text style={styles.metricValueInverse}>{totals.unpaidJobs}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Earnings Breakdown */}
        {!isOwner && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>💰 Earnings Breakdown</Text>
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

        {/* Weekly Revenue Chart */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📊 Weekly Revenue</Text>
            <Divider style={styles.divider} />

            {weeklyData.length > 0 ? (
              <BarChart
                data={chartData}
                width={screenWidth - 60}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
                yAxisLabel="$"
              />
            ) : (
              <Text style={styles.noDataText}>No data for this month</Text>
            )}
          </Card.Content>
        </Card>

        {/* Weekly Breakdown Table */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📋 Weekly Breakdown</Text>
            <Divider style={styles.divider} />

            {weeklyData.map((week) => (
              <View key={week.week} style={styles.weekRow}>
                <Text style={styles.weekLabel}>{week.week}</Text>
                <View style={styles.weekStats}>
                  <Text style={styles.weekStat}>{week.jobs} jobs</Text>
                  <Text style={styles.weekStat}>{week.yards.toFixed(0)} yds</Text>
                  <Text style={styles.weekRevenue}>${week.revenue.toFixed(0)}</Text>
                </View>
              </View>
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
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  weekStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  weekStat: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  weekRevenue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.success,
  },
  exportButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
});