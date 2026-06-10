// src/screens/YearlySummaryScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Divider, Chip } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { 
  format, 
  startOfYear, 
  endOfYear,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  addYears
} from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

export default function YearlySummaryScreen() {
  const { jobs } = useJobs();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [yearOffset, setYearOffset] = useState(0);

  const currentDate = new Date();
  const adjustedDate = addYears(currentDate, yearOffset);
  const yearStart = startOfYear(adjustedDate);
  const yearEnd = endOfYear(adjustedDate);

  // Filter jobs for current year
  const yearJobs = jobs.filter(job => {
    const jobDate = parseISO(job.date);
    return isWithinInterval(jobDate, { start: yearStart, end: yearEnd });
  });

  // Calculate totals
  const totals = {
    income: yearJobs.reduce((sum, job) => sum + (job.amount || 0), 0),
    commission: 0,
    cashPayments: yearJobs.filter(j => j.paymentMethod === 'Cash').reduce((sum, job) => sum + (job.amount || 0), 0),
    paidToMeAmount: yearJobs.filter(j => j.isPaidToMe).reduce((sum, job) => sum + (job.amount || 0), 0),
    yourPay: 0,
    totalUnpaid: yearJobs.filter(j => !j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0),
    finalTakeHome: 0,
    totalJobs: yearJobs.length,
    totalYards: yearJobs.reduce((sum, job) => sum + (job.yards || 0), 0),
    paidJobs: yearJobs.filter(j => j.isPaid).length,
    unpaidJobs: yearJobs.filter(j => !j.isPaid).length,
    avgJobSize: yearJobs.length > 0 ? yearJobs.reduce((sum, job) => sum + (job.amount || 0), 0) / yearJobs.length : 0,
    avgYardsPerJob: yearJobs.length > 0 ? yearJobs.reduce((sum, job) => sum + (job.yards || 0), 0) / yearJobs.length : 0,
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

  // Get monthly breakdown
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
  const monthlyData = months.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);
    const monthJobs = yearJobs.filter(job => {
      const jobDate = parseISO(job.date);
      return isWithinInterval(jobDate, { start: monthStart, end: monthEnd });
    });

    return {
      month: format(monthStart, 'MMM'),
      fullMonth: format(monthStart, 'MMMM'),
      jobs: monthJobs.length,
      revenue: monthJobs.reduce((sum, job) => sum + (job.amount || 0), 0),
      yards: monthJobs.reduce((sum, job) => sum + (job.yards || 0), 0),
    };
  });

  const chartData = {
    labels: monthlyData.map(m => m.month),
    datasets: [{
      data: monthlyData.map(m => m.revenue > 0 ? m.revenue : 0),
    }],
  };

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: BorderRadius.large,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.info,
    },
  };

  // Find best and worst months
  const bestMonth = monthlyData.reduce((max, month) => 
    month.revenue > max.revenue ? month : max
  , { month: '', revenue: 0, fullMonth: '' });

  const worstMonth = monthlyData
    .filter(m => m.revenue > 0)
    .reduce((min, month) => 
      month.revenue < min.revenue ? month : min
    , { month: '', revenue: Infinity, fullMonth: '' });

  const goToPreviousYear = () => {
    setYearOffset(yearOffset - 1);
  };

  const goToNextYear = () => {
    setYearOffset(yearOffset + 1);
  };

  const goToCurrentYear = () => {
    setYearOffset(0);
  };

  const exportPDF = async () => {
    try {
      setIsExporting(true);

      const monthlyRows = monthlyData.map(month => `
        <tr>
          <td>${month.fullMonth}</td>
          <td>${month.jobs}</td>
          <td>${month.yards.toFixed(1)}</td>
          <td>$${month.revenue.toFixed(2)}</td>
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
            .highlight { 
              background-color: ${Colors.infoBg};
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <h1>📊 Yearly Summary - ${format(adjustedDate, 'yyyy')}</h1>
          
          <div class="summary">
            <h2>Year Totals</h2>
            <p><strong>Total Jobs:</strong> ${totals.totalJobs}</p>
            <p><strong>Total Yards:</strong> ${totals.totalYards.toFixed(1)}</p>
            <p><strong>Total Income:</strong> $${totals.income.toFixed(2)}</p>
            <p><strong>Average Job Size:</strong> $${totals.avgJobSize.toFixed(2)}</p>
            <p><strong>Average Yards per Job:</strong> ${totals.avgYardsPerJob.toFixed(1)}</p>
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

          <div class="highlight">
            <h2>Year Highlights</h2>
            <p><strong>Best Month:</strong> ${bestMonth.fullMonth} - $${bestMonth.revenue.toFixed(2)}</p>
            ${worstMonth.revenue !== Infinity ? `
              <p><strong>Slowest Month:</strong> ${worstMonth.fullMonth} - $${worstMonth.revenue.toFixed(2)}</p>
            ` : ''}
          </div>
          
          <h2>Monthly Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Jobs</th>
                <th>Yards</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyRows}
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
        colors={[Colors.info, Colors.infoLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={goToPreviousYear} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            {/* <Text style={styles.headerTitle}>📈 Yearly Summary</Text> */}
            <Text style={styles.headerTitle}>{format(adjustedDate, 'yyyy')}</Text>
            {yearOffset !== 0 && (
              <TouchableOpacity onPress={goToCurrentYear} style={styles.currentYearButton}>
                <Text style={styles.currentYearButtonText}>Back to Current Year</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={goToNextYear} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Annual Overview */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Annual Overview</Text>
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
                <Text style={styles.metricValue}>{totals.totalYards.toLocaleString()}</Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Avg Job</Text>
                <Text style={styles.metricValue}>${totals.avgJobSize.toFixed(0)}</Text>
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

        {/* Year Highlights */}
        <Card style={styles.highlightCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.highlightTitle}>⭐ Year Highlights</Text>
            <Divider style={styles.divider} />

            <View style={styles.highlightRow}>
              <Chip icon="trophy" style={styles.bestChip} textStyle={styles.bestChipText}>
                Best Month
              </Chip>
              <View style={styles.highlightInfo}>
                <Text style={styles.highlightMonth}>{bestMonth.fullMonth}</Text>
                <Text style={styles.highlightRevenue}>${bestMonth.revenue.toLocaleString()}</Text>
              </View>
            </View>

            {worstMonth.revenue !== Infinity && (
              <View style={styles.highlightRow}>
                <Chip icon="trending-down" style={styles.worstChip} textStyle={styles.worstChipText}>
                  Slowest Month
                </Chip>
                <View style={styles.highlightInfo}>
                  <Text style={styles.highlightMonth}>{worstMonth.fullMonth}</Text>
                  <Text style={styles.highlightRevenue}>${worstMonth.revenue.toLocaleString()}</Text>
                </View>
              </View>
            )}

            <View style={styles.highlightRow}>
              <Chip icon="chart-line" style={styles.avgChip} textStyle={styles.avgChipText}>
                Avg per Month
              </Chip>
              <View style={styles.highlightInfo}>
                <Text style={styles.highlightRevenue}>
                  ${(totals.income / 12).toFixed(0)}
                </Text>
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

        {/* Monthly Revenue Chart */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📊 Monthly Revenue Trend</Text>
            <Divider style={styles.divider} />

            {monthlyData.some(m => m.revenue > 0) ? (
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
              <Text style={styles.noDataText}>No revenue data for this year</Text>
            )}
          </Card.Content>
        </Card>

        {/* Monthly Breakdown Table */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>📋 Monthly Breakdown</Text>
            <Divider style={styles.divider} />

            {monthlyData.map((month, index) => (
              <View key={index} style={styles.monthRow}>
                <View style={styles.monthInfo}>
                  <Text style={styles.monthName}>{month.fullMonth}</Text>
                  {month.jobs > 0 && (
                    <View style={styles.monthChips}>
                      <Chip compact style={styles.jobsChip}>{month.jobs} jobs</Chip>
                      <Chip compact style={styles.yardsChip}>{month.yards.toFixed(0)} yds</Chip>
                    </View>
                  )}
                </View>
                <View style={styles.monthRevenue}>
                  {month.revenue > 0 ? (
                    <Text style={styles.revenueValue}>${month.revenue.toLocaleString()}</Text>
                  ) : (
                    <Text style={styles.noRevenueText}>-</Text>
                  )}
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
  currentYearButton: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: BorderRadius.small,
  },
  currentYearButtonText: {
    fontSize: 13,
    color: Colors.textInverse,
    fontWeight: '800',
    padding:10
  },
  content: {
    padding: Spacing.md,
  },
  card: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.large,
    ...Shadows.medium,
  },
  highlightCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.large,
    backgroundColor: Colors.infoBg,
    ...Shadows.medium,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    fontWeight: 'bold',
    color: Colors.text,
  },
  highlightTitle: {
    marginBottom: Spacing.sm,
    fontWeight: 'bold',
    color: Colors.info,
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
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  highlightInfo: {
    alignItems: 'flex-end',
  },
  highlightMonth: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  highlightRevenue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
  },
  bestChip: {
    backgroundColor: Colors.success,
  },
  bestChipText: {
    color: Colors.textInverse,
    fontWeight: '600',
  },
  worstChip: {
    backgroundColor: Colors.warningBg,
  },
  worstChipText: {
    color: Colors.warning,
    fontWeight: '600',
  },
  avgChip: {
    backgroundColor: Colors.infoBg,
  },
  avgChipText: {
    color: Colors.info,
    fontWeight: '600',
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
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
  },
  monthInfo: {
    flex: 1,
  },
  monthName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  monthChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  jobsChip: {
    backgroundColor: Colors.infoBg,
    height: 24,
  },
  yardsChip: {
    backgroundColor: Colors.warningBg,
    height: 24,
  },
  monthRevenue: {
    minWidth: 100,
    alignItems: 'flex-end',
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.success,
  },
  noRevenueText: {
    fontSize: 18,
    color: Colors.textLight,
  },
  exportButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
});