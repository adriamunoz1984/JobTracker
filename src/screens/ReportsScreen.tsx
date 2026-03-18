// src/screens/ReportsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert, Platform } from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  Divider,
  SegmentedButtons,
  Chip,
  Checkbox
} from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

interface ColumnConfig {
  date: boolean;
  weekOf: boolean;
  client: boolean;
  address: boolean;
  yards: boolean;
  paymentType: boolean;
  amount: boolean;
  status: boolean;
  checkNumber: boolean;
  notes: boolean;
}

export default function ReportsScreen() {
  const { jobs } = useJobs();
  const { user } = useAuth();

  const [dateRange, setDateRange] = useState<'week' | 'lastweek' | 'month' | 'custom'>('week');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showGraphs, setShowGraphs] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Column toggles
  const [columns, setColumns] = useState<ColumnConfig>({
    date: true,
    weekOf: true,
    client: true,
    address: true,
    yards: true,
    paymentType: true,
    amount: true,
    status: true,
    checkNumber: false,
    notes: false,
  });

  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now)
        };
      case 'lastweek':
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          start: startOfWeek(lastWeek),
          end: endOfWeek(lastWeek)
        };
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate
        };
      default:
        return { start: now, end: now };
    }
  };

  useEffect(() => {
    const { start, end } = getDateRange();
    
    let filtered = jobs.filter(job => {
      const jobDate = parseISO(job.date);
      const inRange = isWithinInterval(jobDate, { start, end });
      
      if (!inRange) return false;
      
      if (paymentStatus === 'paid' && !job.isPaid) return false;
      if (paymentStatus === 'unpaid' && job.isPaid) return false;
      
      return true;
    });

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setFilteredJobs(filtered);
  }, [jobs, dateRange, paymentStatus, customStartDate, customEndDate]);

  const stats = {
    totalJobs: filteredJobs.length,
    totalYards: filteredJobs.reduce((sum, job) => sum + (job.yards || 0), 0),
    totalCharged: filteredJobs.reduce((sum, job) => sum + (job.amount || 0), 0),
    totalPaid: filteredJobs.filter(j => j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0),
    totalUnpaid: filteredJobs.filter(j => !j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0),
    
    cash: filteredJobs.filter(j => j.paymentMethod === 'Cash').reduce((sum, job) => sum + (job.amount || 0), 0),
    check: filteredJobs.filter(j => j.paymentMethod === 'Check').reduce((sum, job) => sum + (job.amount || 0), 0),
    charge: filteredJobs.filter(j => j.paymentMethod === 'Charge').reduce((sum, job) => sum + (job.amount || 0), 0),
    
    cashCount: filteredJobs.filter(j => j.paymentMethod === 'Cash').length,
    checkCount: filteredJobs.filter(j => j.paymentMethod === 'Check').length,
    chargeCount: filteredJobs.filter(j => j.paymentMethod === 'Charge').length,
    
    paidToMe: filteredJobs.filter(j => j.isPaidToMe).reduce((sum, job) => sum + (job.amount || 0), 0),
    employeeJobs: filteredJobs.filter(j => (j as any).isEmployeeJob).reduce((sum, job) => sum + (job.amount || 0), 0),
  };

  const calculateNetEarnings = () => {
    let net = stats.totalCharged;
    if (user?.role === 'owner') {
      net -= stats.employeeJobs;
    }
    net -= stats.paidToMe;
    return net;
  };

  const netEarnings = calculateNetEarnings();

  const pieChartData = [
    {
      name: 'Cash',
      amount: stats.cash,
      color: Colors.payment.cash,
      legendFontColor: Colors.textSecondary,
      legendFontSize: 12
    },
    {
      name: 'Check',
      amount: stats.check,
      color: Colors.payment.check,
      legendFontColor: Colors.textSecondary,
      legendFontSize: 12
    },
    {
      name: 'Charge',
      amount: stats.charge,
      color: Colors.payment.charge,
      legendFontColor: Colors.textSecondary,
      legendFontSize: 12
    }
  ].filter(item => item.amount > 0);

  const toggleColumn = (column: keyof ColumnConfig) => {
    setColumns(prev => ({ ...prev, [column]: !prev[column] }));
  };

  const exportPDF = async () => {
    try {
      setIsExporting(true);
      
      // Build table headers based on selected columns
      let tableHeaders = '';
      if (columns.date) tableHeaders += '<th>Date</th>';
      if (columns.weekOf) tableHeaders += '<th>Week Of</th>';
      if (columns.client) tableHeaders += '<th>Client</th>';
      if (columns.address) tableHeaders += '<th>Address</th>';
      if (columns.yards) tableHeaders += '<th>Yards</th>';
      if (columns.paymentType) tableHeaders += '<th>Payment</th>';
      if (columns.amount) tableHeaders += '<th>Amount</th>';
      if (columns.status) tableHeaders += '<th>Status</th>';
      if (columns.checkNumber) tableHeaders += '<th>Check #</th>';
      if (columns.notes) tableHeaders += '<th>Notes</th>';

      // Build table rows based on selected columns
      const tableRows = filteredJobs.map(job => {
        const jobDate = parseISO(job.date);
        const weekStart = startOfWeek(jobDate);
        
        let row = '<tr>';
        if (columns.date) row += `<td>${format(jobDate, 'MMM d, yyyy')}</td>`;
        if (columns.weekOf) row += `<td>${format(weekStart, 'MMM d, yyyy')}</td>`;
        if (columns.client) row += `<td>${job.companyName || 'No Company'}</td>`;
        if (columns.address) row += `<td>${job.address}, ${job.city}</td>`;
        if (columns.yards) row += `<td>${job.yards}</td>`;
        if (columns.paymentType) row += `<td>${job.paymentMethod}</td>`;
        if (columns.amount) row += `<td>$${job.amount.toFixed(2)}</td>`;
        if (columns.status) row += `<td class="${job.isPaid ? 'paid' : 'unpaid'}">${job.isPaid ? '✓ Paid' : '✗ Unpaid'}</td>`;
        if (columns.checkNumber) row += `<td>${job.checkNumber || '—'}</td>`;
        if (columns.notes) row += `<td>${job.notes || '—'}</td>`;
        row += '</tr>';
        return row;
      }).join('');
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              margin-bottom: 20px;
            }
            h2 { 
              color: ${Colors.secondary}; 
              margin-top: 30px;
              margin-bottom: 15px;
              border-left: 4px solid ${Colors.primary};
              padding-left: 10px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              font-size: 11px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 8px 6px; 
              text-align: left;
            }
            th { 
              background-color: ${Colors.primary}; 
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .summary { 
              background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
              padding: 20px; 
              border-radius: 8px; 
              margin: 20px 0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .summary p {
              margin: 10px 0;
              font-size: 16px;
            }
            .total { 
              font-size: 22px; 
              font-weight: bold; 
              color: ${Colors.success}; 
              margin-top: 20px;
              padding: 15px;
              background-color: ${Colors.successBg};
              border-radius: 5px;
              text-align: center;
            }
            .breakdown { 
              margin: 15px 0;
              padding: 15px;
              background-color: #fff;
              border-radius: 5px;
            }
            .breakdown p {
              margin: 8px 0;
              font-size: 15px;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #999;
              font-size: 12px;
              text-align: center;
            }
            .paid { color: ${Colors.success}; font-weight: bold; }
            .unpaid { color: ${Colors.error}; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>📊 Job Report</h1>
          <p style="color: #666; font-size: 14px;">
            ${format(getDateRange().start, 'MMMM d, yyyy')} to ${format(getDateRange().end, 'MMMM d, yyyy')}
          </p>
          
          <div class="summary">
            <h2>Summary Statistics</h2>
            <p><strong>Total Jobs:</strong> ${stats.totalJobs}</p>
            <p><strong>Total Yards:</strong> ${stats.totalYards.toFixed(1)} yards</p>
            <p><strong>Total Charged:</strong> $${stats.totalCharged.toFixed(2)}</p>
            <p><strong>Total Paid:</strong> <span class="paid">$${stats.totalPaid.toFixed(2)}</span></p>
            <p><strong>Total Unpaid:</strong> <span class="unpaid">$${stats.totalUnpaid.toFixed(2)}</span></p>
          </div>
          
          <h2>💰 Payment Method Breakdown</h2>
          <div class="breakdown">
            <p>💵 <strong>Cash:</strong> $${stats.cash.toFixed(2)} (${stats.cashCount} jobs)</p>
            <p>📝 <strong>Check:</strong> $${stats.check.toFixed(2)} (${stats.checkCount} jobs)</p>
            <p>📋 <strong>Charge:</strong> $${stats.charge.toFixed(2)} (${stats.chargeCount} jobs)</p>
          </div>
          
          ${user?.role === 'owner' ? `
            <h2>💼 Your Net Earnings</h2>
            <div class="breakdown">
              <p>Total Charged: $${stats.totalCharged.toFixed(2)}</p>
              <p>- Employee Jobs: -$${stats.employeeJobs.toFixed(2)}</p>
              <p>- Paid to Me: -$${stats.paidToMe.toFixed(2)}</p>
              <div class="total">You're Owed: $${netEarnings.toFixed(2)}</div>
            </div>
          ` : ''}
          
          <h2>📋 Job Details</h2>
          <table>
            <thead>
              <tr>
                ${tableHeaders}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          
          <div class="footer">
            Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });
      
      Alert.alert(
        'PDF Created! ✅',
        'Your report is ready to share.',
        [
          { text: 'OK' },
          { 
            text: 'Share', 
            onPress: async () => {
              try {
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(uri);
                }
              } catch (error) {
                console.error('Error sharing:', error);
                Alert.alert('Error', 'Failed to share PDF');
              }
            }
          }
        ]
      );
      
      console.log('PDF created at:', uri);
    } catch (error) {
      console.error('Error creating PDF:', error);
      Alert.alert('Error', 'Failed to create PDF report');
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
        <Text style={styles.headerTitle}>📊 Reports & Analytics</Text>
        <Text style={styles.headerSubtitle}>
          {format(getDateRange().start, 'MMM d')} - {format(getDateRange().end, 'MMM d, yyyy')}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Date Range Filters */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Date Range</Text>
            
            <SegmentedButtons
              value={dateRange}
              onValueChange={(value) => setDateRange(value as any)}
              buttons={[
                { value: 'week', label: 'This Week' },
                { value: 'lastweek', label: 'Last Week' },
                { value: 'month', label: 'This Month' },
                { value: 'custom', label: 'Custom' },
              ]}
              style={styles.segmentedButtons}
            />

            {/* Custom Date Range Pickers */}
            {dateRange === 'custom' && (
              <View style={styles.customDateContainer}>
                <Text style={styles.filterLabel}>Custom Date Range:</Text>
                
                <View style={styles.datePickerRow}>
                  <View style={styles.datePickerItem}>
                    <Text style={styles.dateLabel}>Start Date:</Text>
                    <Button
                      mode="outlined"
                      icon="calendar"
                      onPress={() => setShowStartPicker(true)}
                      style={styles.dateButton}
                      textColor={Colors.primary}
                    >
                      {format(customStartDate, 'MMM d, yyyy')}
                    </Button>
                  </View>

                  <View style={styles.datePickerItem}>
                    <Text style={styles.dateLabel}>End Date:</Text>
                    <Button
                      mode="outlined"
                      icon="calendar"
                      onPress={() => setShowEndPicker(true)}
                      style={styles.dateButton}
                      textColor={Colors.primary}
                    >
                      {format(customEndDate, 'MMM d, yyyy')}
                    </Button>
                  </View>
                </View>

                {showStartPicker && (
                  <DateTimePicker
                    value={customStartDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowStartPicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setCustomStartDate(selectedDate);
                      }
                    }}
                  />
                )}

                {showEndPicker && (
                  <DateTimePicker
                    value={customEndDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowEndPicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setCustomEndDate(selectedDate);
                      }
                    }}
                  />
                )}
              </View>
            )}
            
            <Text style={styles.filterLabel}>Payment Status:</Text>
            <SegmentedButtons
              value={paymentStatus}
              onValueChange={(value) => setPaymentStatus(value as any)}
              buttons={[
                { value: 'all', label: 'All' },
                { value: 'paid', label: 'Paid' },
                { value: 'unpaid', label: 'Unpaid' },
              ]}
              style={styles.segmentedButtons}
            />
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Show Graphs</Text>
              <Chip
                selected={showGraphs}
                onPress={() => setShowGraphs(!showGraphs)}
                mode={showGraphs ? 'flat' : 'outlined'}
                style={showGraphs ? styles.chipActive : styles.chip}
                textStyle={showGraphs ? styles.chipActiveText : undefined}
              >
                {showGraphs ? '✓ On' : 'Off'}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Column Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Report Columns</Text>
            <Text style={styles.subtitle}>Select which columns to include in the PDF report</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.checkboxGrid}>
              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.date ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('date')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Date</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.weekOf ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('weekOf')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Week Of</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.client ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('client')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Client</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.address ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('address')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Address</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.yards ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('yards')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Yards</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.paymentType ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('paymentType')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Payment Type</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.amount ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('amount')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Amount</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.status ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('status')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Paid/Unpaid</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.checkNumber ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('checkNumber')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Check Number</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Checkbox
                  status={columns.notes ? 'checked' : 'unchecked'}
                  onPress={() => toggleColumn('notes')}
                  color={Colors.primary}
                />
                <Text style={styles.checkboxLabel}>Notes</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Summary Stats */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Summary</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Jobs</Text>
                <Text style={styles.statValue}>{stats.totalJobs}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Yards</Text>
                <Text style={styles.statValue}>{stats.totalYards.toFixed(0)}</Text>
              </View>
            </View>

            <View style={styles.statGrid}>
              <View style={[styles.statBox, styles.statBoxSuccess]}>
                <Text style={styles.statLabelInverse}>Paid</Text>
                <Text style={styles.statValueInverse}>${stats.totalPaid.toFixed(0)}</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxError]}>
                <Text style={styles.statLabelInverse}>Unpaid</Text>
                <Text style={styles.statValueInverse}>${stats.totalUnpaid.toFixed(0)}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Payment Breakdown */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Payment Breakdown</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>💵 Cash:</Text>
              <Text style={styles.breakdownValue}>
                ${stats.cash.toFixed(0)} ({stats.cashCount})
              </Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>📝 Check:</Text>
              <Text style={styles.breakdownValue}>
                ${stats.check.toFixed(0)} ({stats.checkCount})
              </Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>📋 Charge:</Text>
              <Text style={styles.breakdownValue}>
                ${stats.charge.toFixed(0)} ({stats.chargeCount})
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Pie Chart */}
        {showGraphs && pieChartData.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Payment Methods</Text>
              <PieChart
                data={pieChartData}
                width={screenWidth - 60}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </Card.Content>
          </Card>
        )}

        {/* Net Earnings */}
        {user?.role === 'owner' && (
          <Card style={[styles.card, styles.earningsCard]}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>💼 Your Net Earnings</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Total Charged:</Text>
                <Text style={styles.earningsValue}>${stats.totalCharged.toFixed(2)}</Text>
              </View>
              
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>- Employee Jobs:</Text>
                <Text style={styles.earningsValue}>-${stats.employeeJobs.toFixed(2)}</Text>
              </View>
              
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>- Paid to Me:</Text>
                <Text style={styles.earningsValue}>-${stats.paidToMe.toFixed(2)}</Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <LinearGradient
                colors={[Colors.success, Colors.successLight]}
                style={styles.totalBox}
              >
                <Text style={styles.totalLabel}>You're Owed:</Text>
                <Text style={styles.totalValue}>${netEarnings.toFixed(2)}</Text>
              </LinearGradient>
            </Card.Content>
          </Card>
        )}

        {/* Export Button */}
        <Button
          mode="contained"
          icon="file-pdf-box"
          onPress={exportPDF}
          style={styles.exportButton}
          loading={isExporting}
          disabled={isExporting}
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
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  divider: {
    marginVertical: Spacing.md,
    backgroundColor: Colors.borderLight,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  segmentedButtons: {
    marginBottom: Spacing.sm,
  },
  customDateContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  datePickerItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    color: Colors.text,
  },
  dateButton: {
    borderColor: Colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  chip: {
    borderColor: Colors.primary,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipActiveText: {
    color: Colors.textInverse,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
  },
  checkboxLabel: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: -8,
  },
  statGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statBox: {
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
  },
  statBoxSuccess: {
    backgroundColor: Colors.success,
  },
  statBoxError: {
    backgroundColor: Colors.error,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabelInverse: {
    fontSize: 12,
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
    opacity: 0.9,
  },
  statValueInverse: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textInverse,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  breakdownLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  earningsCard: {
    backgroundColor: Colors.successBg,
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
  exportButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
});