// src/screens/ReportsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  Divider,
  SegmentedButtons,
  Chip
} from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const screenWidth = Dimensions.get('window').width;

export default function ReportsScreen() {
  const { jobs } = useJobs();
  const { user } = useAuth();

  // Filter states
  const [dateRange, setDateRange] = useState<'week' | 'month'>('week');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [showGraphs, setShowGraphs] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filtered jobs
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now)
        };
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
      default:
        return { start: now, end: now };
    }
  };

  // Filter jobs based on criteria
  useEffect(() => {
    const { start, end } = getDateRange();
    
    let filtered = jobs.filter(job => {
      const jobDate = parseISO(job.date);
      const inRange = isWithinInterval(jobDate, { start, end });
      
      if (!inRange) return false;
      
      // Filter by payment status
      if (paymentStatus === 'paid' && !job.isPaid) return false;
      if (paymentStatus === 'unpaid' && job.isPaid) return false;
      
      return true;
    });

    setFilteredJobs(filtered);
  }, [jobs, dateRange, paymentStatus]);

  // Calculate statistics
  const stats = {
    totalJobs: filteredJobs.length,
    totalYards: filteredJobs.reduce((sum, job) => sum + (job.yards || 0), 0),
    totalCharged: filteredJobs.reduce((sum, job) => sum + (job.amount || 0), 0),
    totalPaid: filteredJobs.filter(j => j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0),
    totalUnpaid: filteredJobs.filter(j => !j.isPaid).reduce((sum, job) => sum + (job.amount || 0), 0),
    
    // Breakdown by payment method
    cash: filteredJobs.filter(j => j.paymentMethod === 'Cash').reduce((sum, job) => sum + (job.amount || 0), 0),
    check: filteredJobs.filter(j => j.paymentMethod === 'Check').reduce((sum, job) => sum + (job.amount || 0), 0),
    charge: filteredJobs.filter(j => j.paymentMethod === 'Charge').reduce((sum, job) => sum + (job.amount || 0), 0),
    
    cashCount: filteredJobs.filter(j => j.paymentMethod === 'Cash').length,
    checkCount: filteredJobs.filter(j => j.paymentMethod === 'Check').length,
    chargeCount: filteredJobs.filter(j => j.paymentMethod === 'Charge').length,
    
    // Paid to me
    paidToMe: filteredJobs.filter(j => j.isPaidToMe).reduce((sum, job) => sum + (job.amount || 0), 0),
    
    // Employee jobs (for owners)
    employeeJobs: filteredJobs.filter(j => (j as any).isEmployeeJob).reduce((sum, job) => sum + (job.amount || 0), 0),
  };

  // Calculate net earnings for owner
  const calculateNetEarnings = () => {
    let net = stats.totalCharged;
    
    // Subtract employee earnings if owner
    if (user?.role === 'owner') {
      net -= stats.employeeJobs;
    }
    
    // Subtract "paid to me" jobs (already received)
    net -= stats.paidToMe;
    
    return net;
  };

  const netEarnings = calculateNetEarnings();

  // Prepare chart data
  const pieChartData = [
    {
      name: 'Cash',
      amount: stats.cash,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Check',
      amount: stats.check,
      color: '#2196F3',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Charge',
      amount: stats.charge,
      color: '#FF9800',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }
  ].filter(item => item.amount > 0);

  // Export as PDF
  const exportPDF = async () => {
    try {
      setIsExporting(true);
      
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
              color: #2196F3; 
              border-bottom: 3px solid #2196F3; 
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            h2 { 
              color: #666; 
              margin-top: 30px;
              margin-bottom: 15px;
              border-left: 4px solid #2196F3;
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
              padding: 12px 8px; 
              text-align: left;
            }
            th { 
              background-color: #2196F3; 
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
              color: #4CAF50; 
              margin-top: 20px;
              padding: 15px;
              background-color: #E8F5E9;
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
            .paid { color: #4CAF50; font-weight: bold; }
            .unpaid { color: #F44336; font-weight: bold; }
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
                <th>Date</th>
                <th>Client</th>
                <th>Yards</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredJobs.map(job => `
                <tr>
                  <td>${format(parseISO(job.date), 'MMM d, yyyy')}</td>
                  <td>${job.companyName || 'No Company'}</td>
                  <td>${job.yards}</td>
                  <td>$${job.amount.toFixed(2)}</td>
                  <td>${job.paymentMethod}</td>
                  <td class="${job.isPaid ? 'paid' : 'unpaid'}">
                    ${job.isPaid ? '✓ Paid' : '✗ Unpaid'}
                  </td>
                </tr>
              `).join('')}
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
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>📊 Reports & Analytics</Text>
        
        {/* Filters */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Filters</Text>
            
            <Text style={styles.filterLabel}>Date Range:</Text>
            <SegmentedButtons
              value={dateRange}
              onValueChange={(value) => setDateRange(value as any)}
              buttons={[
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
              ]}
              style={styles.segmentedButtons}
            />
            
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
              <Text>Show Graphs</Text>
              <Chip
                selected={showGraphs}
                onPress={() => setShowGraphs(!showGraphs)}
              >
                {showGraphs ? '✓ On' : 'Off'}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Summary Stats */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Summary</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Jobs:</Text>
              <Text style={styles.statValue}>{stats.totalJobs}</Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Yards:</Text>
              <Text style={styles.statValue}>{stats.totalYards.toFixed(1)}</Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Charged:</Text>
              <Text style={styles.statValue}>${stats.totalCharged.toFixed(2)}</Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Paid:</Text>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                ${stats.totalPaid.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Unpaid:</Text>
              <Text style={[styles.statValue, { color: '#F44336' }]}>
                ${stats.totalUnpaid.toFixed(2)}
              </Text>
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
                ${stats.cash.toFixed(2)} ({stats.cashCount} jobs)
              </Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>📝 Check:</Text>
              <Text style={styles.breakdownValue}>
                ${stats.check.toFixed(2)} ({stats.checkCount} jobs)
              </Text>
            </View>
            
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>📋 Charge:</Text>
              <Text style={styles.breakdownValue}>
                ${stats.charge.toFixed(2)} ({stats.chargeCount} jobs)
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

        {/* Net Earnings - Owner Only */}
        {user?.role === 'owner' && (
          <Card style={[styles.card, styles.earningsCard]}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Your Net Earnings</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Charged:</Text>
                <Text style={styles.statValue}>${stats.totalCharged.toFixed(2)}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>- Employee Jobs:</Text>
                <Text style={styles.statValue}>-${stats.employeeJobs.toFixed(2)}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>- Paid to Me:</Text>
                <Text style={styles.statValue}>-${stats.paidToMe.toFixed(2)}</Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>You're Owed:</Text>
                <Text style={styles.totalValue}>${netEarnings.toFixed(2)}</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Export Button */}
        <View style={styles.exportContainer}>
          <Button
            mode="contained"
            icon="file-pdf-box"
            onPress={exportPDF}
            style={styles.exportButton}
            loading={isExporting}
            disabled={isExporting}
          >
            Export as PDF
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
    color: '#2196F3',
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  breakdownLabel: {
    fontSize: 14,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  earningsCard: {
    backgroundColor: '#E8F5E9',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  exportContainer: {
    marginBottom: 32,
  },
  exportButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
  },
});