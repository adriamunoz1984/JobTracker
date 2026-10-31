// src/screens/YearlySummaryScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Divider, Chip, SegmentedButtons } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { Line as SvgLine } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { 
  format, 
  startOfYear, 
  endOfYear,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  addYears
} from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { nameExportedPdf } from '../utils/exportFileName';
import { Spacing, BorderRadius, Shadows } from '../theme/colors';
import { useAppTheme, makeStyles, withOpacity } from '../theme';
import { calculateEmployeeEarnings, calculateJobCommissions, calculateOwnerPay, calculateTaxEstimate, getEstimatedTaxForJob, getJobPumperName, getJobPumperGrossPay, isEmployeeJob, getTaxableShareForJob } from '../utils/jobMath';

const screenWidth = Dimensions.get('window').width;

export default function YearlySummaryScreen() {
  const { colors: Colors, gradients } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const { jobs } = useJobs();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [yearOffset, setYearOffset] = useState(0);
  const [ownerTakeHomeMode, setOwnerTakeHomeMode] = useState<'paid' | 'all'>('paid');
  const [employeeGraphMode, setEmployeeGraphMode] = useState<'earnings' | 'revenue'>('earnings');
  const [hiddenEmployeeIds, setHiddenEmployeeIds] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

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
    paidToMeAmount: yearJobs.filter(j => j.isPaidToMe && j.jobType !== 'personal').reduce((sum, job) => sum + (job.amount || 0), 0),
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
  const commissionRate = user?.commissionRate ?? 50;
  const ownerPay = calculateOwnerPay(yearJobs);
  const ownerPaidPay = calculateOwnerPay(yearJobs.filter(job => job.isPaid));
  const ownerTakeHomePay = ownerTakeHomeMode === 'paid' ? ownerPaidPay : ownerPay;
  const taxEstimate = calculateTaxEstimate(
    yearJobs,
    isOwner ? 'owner' : 'employee',
    user?.estimatedTaxRate,
    user?.includeCashInTaxEstimate !== false,
    commissionRate
  );
  const referenceJobs = yearJobs.filter(job => job.jobNumber || job.poNumber);

  if (!isOwner) {
    const earnings = calculateEmployeeEarnings(yearJobs, commissionRate);
    totals.commission = earnings.companyCommission;
    totals.paidToMeAmount = earnings.directPayments;
    // Take Home is the employee's earned commission across all jobs.
    // Direct payments only reduce what the employer still owes them.
    totals.yourPay = earnings.owed;
    totals.finalTakeHome = earnings.earned;
  } else {
    totals.finalTakeHome = ownerTakeHomePay.ownerAfterPumperPay;
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
    labels: monthlyData.map((m, index) => index % 2 === 0 ? m.month : ''),
    datasets: [{
      data: monthlyData.map(m => m.revenue > 0 ? m.revenue : 0),
    }],
  };

  const chartConfig = {
    backgroundColor: Colors.surface,
    backgroundGradientFrom: Colors.surface,
    backgroundGradientTo: Colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => withOpacity(Colors.primary, opacity),
    labelColor: (opacity = 1) => withOpacity(Colors.text, opacity),
    style: {
      borderRadius: BorderRadius.large,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: Colors.info,
    },
  };

  // Employee comparison is always based on all completed work, not payment status.
  // Direct payments do not reduce an employee's earned commission.
  const weeklyStarts = eachWeekOfInterval({ start: yearStart, end: yearEnd });
  const employeeJobs = yearJobs.filter(isEmployeeJob);
  const employeeLookup = new Map<string, { name: string; jobs: Job[] }>();
  employeeJobs.forEach(job => {
    const id = job.employeeId || job.assignedTo || job.employeeName || 'Unknown';
    const entry = employeeLookup.get(id) || { name: getJobPumperName(job), jobs: [] };
    entry.jobs.push(job);
    employeeLookup.set(id, entry);
  });
  const employeeSeries = Array.from(employeeLookup, ([id, data]) => ({
    id,
    name: data.name,
    amounts: weeklyStarts.map(start => {
      const end = endOfWeek(start);
      const weekJobs = data.jobs.filter(job =>
        isWithinInterval(parseISO(job.date), { start, end })
      );
      return weekJobs.reduce((sum, job) => sum + (
        employeeGraphMode === 'earnings' ? getJobPumperGrossPay(job) : Number(job.amount || 0)
      ), 0);
    }),
  }));
  const graphColors = ['#4F8EF7', '#E17750', '#42A88A', '#A56FD1', '#DAAD38', '#DB629A', '#34A2B9', '#8A9E45'];
  const visibleSeries = employeeSeries.filter(series => !hiddenEmployeeIds.includes(series.id));
  const employeeChartData = {
    labels: weeklyStarts.map(() => ''),
    datasets: visibleSeries.map((series, index) => ({
      data: series.amounts,
      color: (opacity = 1) => withOpacity(graphColors[employeeSeries.indexOf(series) % graphColors.length], opacity),
      strokeWidth: 2,
    })),
    legend: [],
  };
  const selectedWeekIndex = selectedWeek != null && selectedWeek < weeklyStarts.length ? selectedWeek : null;
  const weeklyChartWidth = Math.max(screenWidth - 60, weeklyStarts.length * 34);
  // Match the chart plot area so the weekly markers line up with the data points.
  const graphLeft = 64;
  const graphRight = 16;
  const graphPlotWidth = weeklyChartWidth - graphLeft - graphRight;
  const markerX = (index: number) =>
    graphLeft + index * graphPlotWidth / Math.max(1, weeklyStarts.length - 1);
  const monthMarkers = months.map((month, monthIndex) => {
    const index = weeklyStarts.findIndex((week, i) => {
      const nextWeek = weeklyStarts[i + 1];
      return (nextWeek == null || nextWeek > month) && week <= month;
    });
    return { index: Math.max(0, index), label: format(month, 'MMM'), monthIndex };
  });
  const monthBoundaryIndices = new Set(monthMarkers.map(marker => marker.index));


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

  const handleMetricPress = (metricType: any) => {
    const detailJobs =
      isOwner && metricType === 'takeHome' && ownerTakeHomeMode === 'paid'
        ? yearJobs.filter(job => job.isPaid)
        : yearJobs;

    (navigation as any).navigate('DetailedReport', {
      metricType,
      jobs: detailJobs,
      timeLabel: format(adjustedDate, 'yyyy'),
      isOwner: user?.role === 'owner',
      commissionRate: user?.commissionRate ?? 50,
      taxEstimateEnabled: user?.taxEstimateEnabled === true,
      estimatedTaxRate: user?.estimatedTaxRate || 0,
      includeCashInTaxEstimate: user?.includeCashInTaxEstimate !== false,
    });
  };

  const exportPDF = async () => {
    try {
      setIsExporting(true);
      const pdfJobs = yearJobs.filter(j => j.jobType !== 'personal');
      const pdfOwnerPay = calculateOwnerPay(pdfJobs);
      const pdfEmployeePay = calculateEmployeeEarnings(pdfJobs, commissionRate);
      const pdfTotals = {
        ...totals,
        income: pdfJobs.reduce((n,j) => n + Number(j.amount || 0), 0),
        commission: pdfEmployeePay.companyCommission,
        paidToMeAmount: pdfEmployeePay.directPayments,
        yourPay: pdfEmployeePay.owed,
        finalTakeHome: isOwner ? calculateOwnerPay(pdfJobs.filter(j => ownerTakeHomeMode === 'all' || j.isPaid)).ownerAfterPumperPay : pdfEmployeePay.companyCommission,
        totalJobs: pdfJobs.length,
        totalYards: pdfJobs.reduce((n,j) => n + Number(j.yards || 0), 0),
        paidJobs: pdfJobs.filter(j => j.isPaid).length,
        unpaidJobs: pdfJobs.filter(j => !j.isPaid).length,
        totalUnpaid: pdfJobs.filter(j => !j.isPaid).reduce((n,j) => n + Number(j.amount || 0), 0),
        avgJobSize: pdfJobs.length ? pdfJobs.reduce((n,j) => n + Number(j.amount || 0), 0) / pdfJobs.length : 0,
        avgYardsPerJob: pdfJobs.length ? pdfJobs.reduce((n,j) => n + Number(j.yards || 0), 0) / pdfJobs.length : 0,
      };
      const pdfTaxEstimate = calculateTaxEstimate(pdfJobs, isOwner ? 'owner' : 'employee', user?.estimatedTaxRate, user?.includeCashInTaxEstimate !== false, commissionRate);
      const pdfReferenceJobs = pdfJobs.filter(j => j.jobNumber || j.poNumber);
      const pdfRows = months.map(date => { const included = pdfJobs.filter(j => isWithinInterval(parseISO(j.date), { start: date, end: endOfMonth(date) })); return { fullMonth: format(date, 'MMMM'), jobs: included.length, yards: included.reduce((n,j) => n + Number(j.yards || 0), 0), revenue: included.reduce((n,j) => n + Number(j.amount || 0), 0) }; });


      const monthlyRows = pdfRows.map(month => `
        <tr>
          <td>${month.fullMonth}</td>
          <td>${month.jobs}</td>
          <td>${month.yards.toFixed(1)}</td>
          <td>$${month.revenue.toFixed(2)}</td>
        </tr>
      `).join('');

      const referenceRows = pdfReferenceJobs.map(job => `
        <tr>
          <td>${format(parseISO(job.date), 'MMM d, yyyy')}</td>
          <td>${job.companyName || job.clientName || 'Job'}</td>
          ${isOwner ? `<td>${getJobPumperName(job, user?.displayName || 'Owner')}</td>` : ''}
          <td>${job.jobNumber || ''}</td>
          <td>${job.poNumber || ''}</td>
        </tr>
      `).join('');

      const taxRows = pdfJobs.map(job => {
        const cashExcluded =
          job.paymentMethod === 'Cash' &&
          user?.includeCashInTaxEstimate === false;
        const taxableShare = getTaxableShareForJob(
          job,
          isOwner ? 'owner' : 'employee',
          user?.includeCashInTaxEstimate !== false,
          commissionRate
        );
        const jobTax = getEstimatedTaxForJob(
          job,
          isOwner ? 'owner' : 'employee',
          user?.estimatedTaxRate,
          user?.includeCashInTaxEstimate !== false,
          commissionRate
        );
        return `
          <tr>
            <td>${format(parseISO(job.date), 'MMM d')}</td>
            <td>${job.companyName || job.clientName || 'Job'}</td>
            ${isOwner ? `<td>${getJobPumperName(job, user?.displayName || 'Owner')}</td>` : ''}
            <td>$${Number(job.amount || 0).toFixed(2)}</td>
            <td>${cashExcluded ? 'Cash excluded' : '$' + taxableShare.toFixed(2)}</td>
            <td>${cashExcluded ? '—' : '$' + jobTax.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const pumperRows = pdfOwnerPay.byPumper.map(pumper => `
        <tr>
          <td>${pumper.name}</td>
          <td>${pumper.jobs}</td>
          <td>$${pumper.revenue.toFixed(2)}</td>
          <td>$${pumper.grossPay.toFixed(2)}</td>
          <td>$${pumper.directPayments.toFixed(2)}</td>
          <td>$${pumper.amountOwed.toFixed(2)}</td>
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
            <p><strong>Total Jobs:</strong> ${pdfTotals.totalJobs}</p>
            <p><strong>Total Yards:</strong> ${pdfTotals.totalYards.toFixed(1)}</p>
            <p><strong>Total Income:</strong> $${pdfTotals.income.toFixed(2)}</p>
            <p><strong>Average Job Size:</strong> $${pdfTotals.avgJobSize.toFixed(2)}</p>
            <p><strong>Average Yards per Job:</strong> ${pdfTotals.avgYardsPerJob.toFixed(1)}</p>
            <p><strong>Paid Jobs:</strong> ${pdfTotals.paidJobs}</p>
            <p><strong>Unpaid Jobs:</strong> ${pdfTotals.unpaidJobs}</p>
            <p><strong>Total Unpaid:</strong> $${pdfTotals.totalUnpaid.toFixed(2)}</p>
            ${!isOwner ? `
              <p><strong>Commission (per job):</strong> $${pdfTotals.commission.toFixed(2)}</p>
              <p><strong>Direct Payments:</strong> $${pdfTotals.paidToMeAmount.toFixed(2)}</p>
              <p><strong>Owed:</strong> ${pdfTotals.yourPay.toFixed(2)}</p>
            ` : `
              <p><strong>Pumper Gross Pay:</strong> $${pdfOwnerPay.grossPumperPay.toFixed(2)}</p>
              <p><strong>Direct Payments to Pumpers:</strong> $${pdfOwnerPay.directPaymentsToPumpers.toFixed(2)}</p>
              <p><strong>Amount Owed to Pumpers:</strong> $${pdfOwnerPay.amountOwedToPumpers.toFixed(2)}</p>
            `}
            <div class="total">${isOwner ? `Take Home (${ownerTakeHomeMode === 'paid' ? 'Paid Jobs' : 'All Jobs'})` : 'Take Home'}: $${pdfTotals.finalTakeHome.toFixed(2)}</div>
            ${user?.taxEstimateEnabled === true && (user?.estimatedTaxRate || 0) > 0 ? `
              <p><strong>Taxable Share:</strong> $${pdfTaxEstimate.taxableBase.toFixed(2)}</p>
              <p><strong>Estimated Tax Reserve (${user?.estimatedTaxRate}%):</strong> $${pdfTaxEstimate.estimatedTax.toFixed(2)}</p>
              <p><strong>After Tax Reserve:</strong> $${pdfTaxEstimate.afterTax.toFixed(2)}</p>
              ${pdfTaxEstimate.excludedCashBase > 0 ? `
                <p><strong>Cash Excluded From Estimate:</strong> $${pdfTaxEstimate.excludedCashBase.toFixed(2)}</p>
              ` : ''}
            ` : ''}
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

          ${isOwner && pumperRows ? `
            <h2>Pumper Breakdown</h2>
            <table>
              <thead>
                <tr>
                  <th>Pumper</th><th>Jobs</th><th>Revenue</th><th>Gross Pay</th><th>Direct Payments</th><th>Still Owed</th>
                </tr>
              </thead>
              <tbody>${pumperRows}</tbody>
            </table>
          ` : ''}

          ${user?.taxEstimateEnabled === true && (user?.estimatedTaxRate || 0) > 0 && taxRows ? `
            <h2>Tax by Job</h2>
            <table>
              <thead>
                <tr><th>Date</th><th>Client</th>${isOwner ? '<th>Pumper</th>' : ''}<th>Job Total</th><th>Taxable Share</th><th>Est. Tax</th></tr>
              </thead>
              <tbody>${taxRows}</tbody>
            </table>
          ` : ''}

          ${referenceRows ? `
            <h2>Job / PO References</h2>
            <table>
              <thead>
                <tr><th>Date</th><th>Client</th>${isOwner ? '<th>Pumper</th>' : ''}<th>Job #</th><th>PO #</th></tr>
              </thead>
              <tbody>${referenceRows}</tbody>
            </table>
          ` : ''}
          
          <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; text-align: center;">
            Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(await nameExportedPdf(uri, `JT-Yearly-${format(adjustedDate, 'yyyy')}`));
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
        colors={gradients.info}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={goToPreviousYear} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
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
                <Text style={styles.metricLabelInverse}>
                  {isOwner
                    ? `Take Home (${ownerTakeHomeMode === 'paid' ? 'Paid' : 'All'})`
                    : 'Take Home'}
                </Text>
                <Text style={styles.metricValueInverse}>${totals.finalTakeHome.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={styles.metricBox}
                onPress={() => handleMetricPress('paid')}
                activeOpacity={0.7}
              >
                <Text style={styles.metricLabel}>Total Jobs</Text>
                <Text style={styles.metricValue}>{totals.totalJobs}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.metricBox}
                onPress={() => handleMetricPress('yards')}
                activeOpacity={0.7}
              >
                <Text style={styles.metricLabel}>Total Yards</Text>
                <Text style={styles.metricValue}>{totals.totalYards.toLocaleString()}</Text>
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
                <Text style={styles.earningsLabel}>Company Commission:</Text>
                <Text style={styles.earningsValue}>${totals.commission.toFixed(2)}</Text>
              </View>

              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Direct Payments Received:</Text>
                <Text style={styles.earningsValue}>${totals.paidToMeAmount.toFixed(2)}</Text>
              </View>

              <Divider style={styles.divider} />

              <TouchableOpacity activeOpacity={0.8} onPress={() => (navigation as any).navigate('EarningsDetails', { startDate: format(yearStart, 'yyyy-MM-dd'), endDate: format(yearEnd, 'yyyy-MM-dd'), periodLabel: format(adjustedDate, 'yyyy'), paidOnly: isOwner && ownerTakeHomeMode === 'paid' })} accessibilityRole="button" accessibilityLabel="View earnings breakdown">
              <LinearGradient
                colors={gradients.success}
                style={styles.totalBox}
              >
                <Text style={styles.totalLabel}>Owed:</Text>
                <Text style={styles.totalValue}>${totals.yourPay.toFixed(2)}</Text>
                <Text style={styles.totalLabel}>Earned:</Text>
                <Text style={styles.totalValue}>${totals.finalTakeHome.toFixed(2)}</Text>
              </LinearGradient>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        {/* Owner Earnings */}
        {isOwner && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>💼 Earnings Breakdown</Text>
              <Divider style={styles.divider} />
              <Text style={styles.earningsLabel}>Take Home Basis</Text>
              <SegmentedButtons
                value={ownerTakeHomeMode}
                onValueChange={(value) => setOwnerTakeHomeMode(value as 'paid' | 'all')}
                buttons={[{ value: 'paid', label: 'Paid jobs' }, { value: 'all', label: 'All jobs' }]}
                style={{ marginBottom: 12 }}
              />
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Your Jobs:</Text>
                <Text style={styles.earningsValue}>${ownerTakeHomePay.ownerJobRevenue.toFixed(2)}</Text>
              </View>

              <Divider style={styles.divider} />
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Employee Job Revenue:</Text>
                <Text style={styles.earningsValue}>${ownerTakeHomePay.employeeRevenue.toFixed(2)}</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Your Share of Employee Jobs:</Text>
                <Text style={styles.earningsValue}>${ownerTakeHomePay.ownerShareOfEmployeeJobs.toFixed(2)}</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Employees Earned:</Text>
                <Text style={styles.earningsValue}>${ownerTakeHomePay.grossPumperPay.toFixed(2)}</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Direct Payments:</Text>
                <Text style={styles.earningsValue}>${ownerTakeHomePay.directPaymentsToPumpers.toFixed(2)}</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Owed to Employees:</Text>
                <Text style={styles.earningsValue}>${ownerTakeHomePay.amountOwedToPumpers.toFixed(2)}</Text>
              </View>

              {ownerTakeHomePay.byPumper.map(pumper => (
                <View key={pumper.key} style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>{pumper.name.slice(0, 6)} ({pumper.jobs} jobs):</Text>
                  <Text style={styles.earningsValue}>${pumper.grossPay.toFixed(2)}</Text>
                </View>
              ))}
              <Divider style={styles.divider} />
              <TouchableOpacity activeOpacity={0.8} onPress={() => (navigation as any).navigate('EarningsDetails', { startDate: format(yearStart, 'yyyy-MM-dd'), endDate: format(yearEnd, 'yyyy-MM-dd'), periodLabel: format(adjustedDate, 'yyyy'), paidOnly: isOwner && ownerTakeHomeMode === 'paid' })} accessibilityRole="button" accessibilityLabel="View earnings breakdown">
              <LinearGradient colors={gradients.success} style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total Earned ({ownerTakeHomeMode === 'paid' ? 'Paid Jobs' : 'All Jobs'}):</Text>
                <Text style={styles.totalValue}>${ownerTakeHomePay.ownerAfterPumperPay.toFixed(2)}</Text>
              </LinearGradient>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        {user?.taxEstimateEnabled === true && (user?.estimatedTaxRate || 0) > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Tax Estimate</Text>
              <Divider style={styles.divider} />
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Taxable Share:</Text>
                <Text style={styles.earningsValue}>${taxEstimate.taxableBase.toFixed(2)}</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Estimated Tax Reserve ({user?.estimatedTaxRate}%):</Text>
                <Text style={styles.earningsValue}>-${taxEstimate.estimatedTax.toFixed(2)}</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>After Tax Reserve:</Text>
                <Text style={styles.earningsValue}>${taxEstimate.afterTax.toFixed(2)}</Text>
              </View>
              {taxEstimate.excludedCashBase > 0 && (
                <View style={styles.earningsRow}>
                  <Text style={styles.earningsLabel}>Cash Excluded:</Text>
                  <Text style={styles.earningsValue}>${taxEstimate.excludedCashBase.toFixed(2)}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {referenceJobs.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Job / PO References</Text>
              <Divider style={styles.divider} />
              {referenceJobs.map(job => (
                <View key={job.id} style={styles.referenceRow}>
                  <Text style={styles.referenceClient}>
                    {job.companyName || job.clientName || 'Job'} · {format(parseISO(job.date), 'MMM d')}
                  </Text>
                  {isOwner && (
                    <Text style={styles.referenceMeta}>
                      Pumper: {getJobPumperName(job, user?.displayName || 'Owner')}
                    </Text>
                  )}
                  <Text style={styles.referenceMeta}>
                    {[
                      job.jobNumber ? 'Job #: ' + job.jobNumber : '',
                      job.poNumber ? 'PO #: ' + job.poNumber : '',
                    ].filter(Boolean).join('   ')}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Owner-only weekly employee comparison */}
        {isOwner && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>📈 Employee Earnings Comparison</Text>
              <Text style={{ color: Colors.textSecondary, marginBottom: Spacing.sm }}>
                Swipe sideways through Jan–Dec to compare weekly employee earnings. Tap a name to show or hide its line.
              </Text>
              <SegmentedButtons
                value={employeeGraphMode}
                onValueChange={value => { setEmployeeGraphMode(value as 'earnings' | 'revenue'); setSelectedWeek(null); }}
                buttons={[{ value: 'earnings', label: 'Earnings' }, { value: 'revenue', label: 'Revenue' }]}
                style={{ marginBottom: Spacing.md }}
              />
              {employeeSeries.length > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm }}>
                    {employeeSeries.map((series, index) => {
                      const shown = !hiddenEmployeeIds.includes(series.id);
                      return (
                        <View key={series.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => setHiddenEmployeeIds(current =>
                          current.includes(series.id) ? current.filter(id => id !== series.id) : [...current, series.id]
                        )} style={{
                          flexDirection: 'row', alignItems: 'center', padding: 8,
                          marginRight: 6, marginBottom: 6, borderRadius: 8,
                          backgroundColor: Colors.surfaceDark, opacity: shown ? 1 : 0.45,
                        }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, marginRight: 6, backgroundColor: graphColors[index % graphColors.length] }} />
                          <Text style={{ color: Colors.text }}>{series.name.slice(0, 6)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Open ${series.name} employee profile`}
                          onPress={() => (navigation as any).navigate('EmployeePerformance', {
                            employeeId: series.id,
                            employeeName: series.name,
                            year: adjustedDate.getFullYear(),
                          })}
                          style={{ paddingVertical: 8, paddingHorizontal: 6, marginRight: 8, marginBottom: 6 }}
                        >
                          <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Profile ›</Text>
                        </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                  {visibleSeries.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <View style={{ width: weeklyChartWidth }}>
                      <LineChart
                        data={employeeChartData}
                        width={weeklyChartWidth}
                        height={240}
                        chartConfig={{ ...chartConfig, propsForDots: { r: '3', strokeWidth: '1' } }}
                        style={styles.chart}
                        yAxisLabel="$"
                        fromZero
                        withShadow={false}
                        onDataPointClick={({ index }) => setSelectedWeek(index)}
                        decorator={() => (
                          <>
                            {weeklyStarts.map((week, index) => (
                              <SvgLine key={index}
                                x1={markerX(index)} x2={markerX(index)}
                                y1={20} y2={205}
                                stroke={Colors.textSecondary}
                                strokeOpacity={monthBoundaryIndices.has(index) ? 0.48 : 0.20}
                                strokeWidth={monthBoundaryIndices.has(index) ? 2.5 : 1}
                                strokeDasharray={monthBoundaryIndices.has(index) ? undefined : '3,6'}
                              />
                            ))}
                          </>
                        )}
                      />
                      <View style={{ height: 30, width: weeklyChartWidth, position: 'relative' }}>
                        {monthMarkers.map(marker => (
                          <Text key={marker.monthIndex} style={{
                            position: 'absolute',
                            left: markerX(marker.index) - 10,
                            top: 2, fontSize: 12, fontWeight: 'bold', color: Colors.text,
                          }}>{marker.label}</Text>
                        ))}
                      </View>
                      </View>
                    </ScrollView>
                  ) : <Text style={styles.noDataText}>Select an employee above to display the graph.</Text>}
                  {selectedWeekIndex !== null && (
                    <View style={{ marginTop: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.surfaceDark, borderRadius: BorderRadius.medium }}>
                      <Text style={{ color: Colors.text, fontWeight: 'bold' }}>
                        Week of {format(weeklyStarts[selectedWeekIndex], 'MMM d, yyyy')}
                      </Text>
                      {visibleSeries.map(series => (
                        <View key={series.id} style={styles.earningsRow}>
                          <Text style={styles.earningsLabel}>{series.name.slice(0, 6)}</Text>
                          <Text style={styles.earningsValue}>${series.amounts[selectedWeekIndex].toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              ) : <Text style={styles.noDataText}>No employee jobs recorded for this year.</Text>}
            </Card.Content>
          </Card>
        )}

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
                      <Chip compact style={styles.jobsChip} textStyle={styles.jobsChipLabel}>{month.jobs} jobs</Chip>
                      <Chip compact style={styles.yardsChip} textStyle={styles.yardsChipLabel}>{month.yards.toFixed(0)} yds</Chip>
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
                formatYLabel={(value) => `${parseFloat(value).toFixed(0)}`}
                withVerticalLines={false}
                withDots={true}
              />
            ) : (
              <Text style={styles.noDataText}>No revenue data for this year</Text>
            )}
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

const useStyles = makeStyles((Colors) => ({
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
    lineHeight: 36,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
    transform: [{ translateY: -3 }],
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
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    overflow: 'visible',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
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
    flexShrink: 1,
    marginRight: Spacing.sm,
    fontSize: 15,
    color: Colors.text,
  },
  earningsValue: {
    flexShrink: 0,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  totalBox: {
    flexDirection: 'column',
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
    fontSize: 24,
    flexShrink: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    color: Colors.textInverse,
  },
  referenceRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  referenceClient: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  referenceMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
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
    paddingTop: Spacing.xs,
  },
  jobsChip: {
    backgroundColor: Colors.infoBg,
    height:34,
  },
  jobsChipLabel: {
    fontSize: 11,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  yardsChip: {
    backgroundColor: Colors.warningBg,
    height: 34
  },
  yardsChipLabel: {
    fontSize: 11,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  monthRevenue: {
    minWidth: 100,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 90,
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
}));