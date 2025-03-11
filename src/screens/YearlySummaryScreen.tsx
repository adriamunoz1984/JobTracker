import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text } from 'react-native-paper';
import { format, startOfYear, endOfYear, addYears, subYears } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { Job } from '../types';

// A simple bar chart component
const BarChart = ({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) => {
  return (
    <View style={barStyles.container}>
      {data.map((item, index) => (
        <View key={index} style={barStyles.barContainer}>
          <Text style={barStyles.label}>{item.label}</Text>
          <View style={barStyles.barWrapper}>
            <View 
              style={[
                barStyles.bar, 
                { width: `${(item.value / maxValue) * 100}%` }
              ]} 
            />
          </View>
          <Text style={barStyles.value}>
            {item.value.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            })}
          </Text>
        </View>
      ))}
    </View>
  );
};

const barStyles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    width: 40,
    fontSize: 12,
  },
  barWrapper: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  bar: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  value: {
    width: 70,
    fontSize: 12,
    textAlign: 'right',
  },
});

export default function YearlySummaryScreen() {
  const { getJobsByDateRange } = useJobs();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [yearlyJobs, setYearlyJobs] = useState<Job[]>([]);
  
  // Calculate start and end of year
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  
  // Format year for display
  const yearText = format(currentDate, 'yyyy');
  
  useEffect(() => {
    // Get jobs for the current year
    const jobs = getJobsByDateRange(yearStart.toISOString(), yearEnd.toISOString());
    setYearlyJobs(jobs);
  }, [currentDate, getJobsByDateRange]);
  
  // Calculate yearly summary
  const totalEarnings = yearlyJobs.reduce((sum, job) => sum + job.amount, 0);
  const totalJobs = yearlyJobs.length;
  const unpaidAmount = yearlyJobs
    .filter(job => !job.isPaid)
    .reduce((sum, job) => sum + job.amount, 0);
    
  const cashPayments = yearlyJobs
    .filter(job => job.isPaid && job.paymentMethod === 'Cash')
    .reduce((sum, job) => sum + job.amount, 0);
    
  const netEarnings = (totalEarnings / 2) - cashPayments;
  
  // Group jobs by month for chart data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthJobs = yearlyJobs.filter(job => {
      const jobDate = new Date(job.date);
      return jobDate.getMonth() === i;
    });
    
    const monthlyEarnings = monthJobs.reduce((sum, job) => sum + job.amount, 0);
    
    return {
      label: format(new Date(currentDate.getFullYear(), i, 1), 'MMM'),
      value: monthlyEarnings,
    };
  });
  
  const maxMonthlyEarnings = Math.max(...monthlyData.map(d => d.value), 1);
  
  const navigateToPreviousYear = () => {
    setCurrentDate(subYears(currentDate, 1));
  };
  
  const navigateToNextYear = () => {
    setCurrentDate(addYears(currentDate, 1));
  };
  
  const navigateToCurrentYear = () => {
    setCurrentDate(new Date());
  };
  
  // Format currency for display
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.yearSelector}>
        <Button icon="chevron-left" onPress={navigateToPreviousYear} mode="text">
          Prev
        </Button>
        <Button onPress={navigateToCurrentYear} mode="text">
          Today
        </Button>
        <Button icon="chevron-right" onPress={navigateToNextYear} mode="text" contentStyle={{ flexDirection: 'row-reverse' }}>
          Next
        </Button>
      </View>
      
      <Title style={styles.yearTitle}>{yearText}</Title>
      
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title>Yearly Summary</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Jobs:</Paragraph>
            <Paragraph>{totalJobs}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Earnings:</Paragraph>
            <Paragraph style={styles.amount}>{formatCurrency(totalEarnings)}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Unpaid Amount:</Paragraph>
            <Paragraph style={styles.unpaidAmount}>{formatCurrency(unpaidAmount)}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Cash Payments:</Paragraph>
            <Paragraph>{formatCurrency(cashPayments)}</Paragraph>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Net Earnings:</Paragraph>
            <Paragraph style={styles.netEarnings}>{formatCurrency(netEarnings)}</Paragraph>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title>Monthly Breakdown</Title>
          <Divider style={styles.divider} />
          
          <BarChart data={monthlyData} maxValue={maxMonthlyEarnings} />
        </Card.Content>
      </Card>
      
      <Card style={styles.statsCard}>
        <Card.Content>
          <Title>Payment Stats</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.statsGrid}>
            {['Cash', 'Check', 'Zelle', 'Square', 'Charge'].map(method => {
              const methodJobs = yearlyJobs.filter(job => job.paymentMethod === method);
              const methodTotal = methodJobs.reduce((sum, job) => sum + job.amount, 0);
              const percentage = totalEarnings ? ((methodTotal / totalEarnings) * 100).toFixed(1) : '0.0';
              
              return (
                <View key={method} style={styles.statItem}>
                  <Text style={styles.statLabel}>{method}</Text>
                  <Text style={styles.statValue}>{formatCurrency(methodTotal)}</Text>
                  <Text style={styles.statPercentage}>{percentage}%</Text>
                </View>
              );
            })}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  yearTitle: {
    textAlign: 'center',
    marginVertical: 8,
  },
  summaryCard: {
    margin: 16,
    elevation: 4,
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
  },
  divider: {
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
  },
  amount: {
    fontWeight: 'bold',
  },
  unpaidAmount: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  netEarnings: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  statLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statPercentage: {
    color: '#757575',
  },
});