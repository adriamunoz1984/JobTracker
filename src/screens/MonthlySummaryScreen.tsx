import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text } from 'react-native-paper';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { Job } from '../types';

export default function MonthlySummaryScreen() {
  const { getJobsByDateRange } = useJobs();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyJobs, setMonthlyJobs] = useState<Job[]>([]);
  
  // Calculate start and end of month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Format month for display
  const monthText = format(currentDate, 'MMMM yyyy');
  
  useEffect(() => {
    // Get jobs for the current month
    const jobs = getJobsByDateRange(monthStart.toISOString(), monthEnd.toISOString());
    setMonthlyJobs(jobs);
  }, [currentDate, getJobsByDateRange]);
  
  // Calculate monthly summary
  const totalEarnings = monthlyJobs.reduce((sum, job) => sum + job.amount, 0);
  const unpaidAmount = monthlyJobs
    .filter(job => !job.isPaid)
    .reduce((sum, job) => sum + job.amount, 0);
    
  const cashPayments = monthlyJobs
    .filter(job => job.isPaid && job.paymentMethod === 'Cash')
    .reduce((sum, job) => sum + job.amount, 0);
    
  const netEarnings = (totalEarnings / 2) - cashPayments;
  
  const navigateToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  const navigateToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  const navigateToCurrentMonth = () => {
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
      <View style={styles.monthSelector}>
        <Button icon="chevron-left" onPress={navigateToPreviousMonth} mode="text">
          Prev
        </Button>
        <Button onPress={navigateToCurrentMonth} mode="text">
          Today
        </Button>
        <Button icon="chevron-right" onPress={navigateToNextMonth} mode="text" contentStyle={{ flexDirection: 'row-reverse' }}>
          Next
        </Button>
      </View>
      
      <Title style={styles.monthTitle}>{monthText}</Title>
      
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title>Monthly Summary</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Jobs:</Paragraph>
            <Paragraph>{monthlyJobs.length}</Paragraph>
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
      
      <Title style={styles.jobsTitle}>Jobs This Month ({monthlyJobs.length})</Title>
      
      {monthlyJobs.length === 0 ? (
        <Card style={styles.noJobsCard}>
          <Card.Content>
            <Paragraph style={styles.noJobsText}>No jobs recorded for this month</Paragraph>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.jobListCard}>
          <Card.Content>
            <View style={styles.paymentBreakdown}>
              <View style={styles.paymentMethod}>
                <Title style={styles.paymentTitle}>Payment Methods</Title>
                {['Cash', 'Check', 'Zelle', 'Square', 'Charge'].map(method => {
                  const methodJobs = monthlyJobs.filter(job => job.paymentMethod === method);
                  const methodTotal = methodJobs.reduce((sum, job) => sum + job.amount, 0);
                  
                  return (
                    <View key={method} style={styles.methodRow}>
                      <Text style={styles.methodName}>{method}</Text>
                      <Text style={styles.methodCount}>{methodJobs.length} jobs</Text>
                      <Text style={styles.methodAmount}>{formatCurrency(methodTotal)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Group jobs by date */}
            {Object.entries(
              monthlyJobs.reduce<Record<string, Job[]>>((acc, job) => {
                const dateKey = format(new Date(job.date), 'yyyy-MM-dd');
                if (!acc[dateKey]) {
                  acc[dateKey] = [];
                }
                acc[dateKey].push(job);
                return acc;
              }, {})
            )
              .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
              .map(([dateKey, jobs]) => (
                <View key={dateKey} style={styles.dateGroup}>
                  <Text style={styles.dateHeader}>
                    {format(new Date(dateKey), 'EEE, MMM d')} - {jobs.length} jobs
                  </Text>
                  
                  {jobs.map(job => (
                    <View key={job.id} style={styles.jobItem}>
                      <View style={styles.jobDetails}>
                        <Text>{job.companyName || 'Unnamed Job'}</Text>
                        <Text style={styles.jobAddress}>{job.city}</Text>
                      </View>
                      <View style={styles.jobPayment}>
                        <Text style={[
                          styles.jobStatus, 
                          job.isPaid ? styles.paidText : styles.unpaidText
                        ]}>
                          {job.isPaid ? 'PAID' : 'UNPAID'}
                        </Text>
                        <Text style={styles.jobAmount}>{formatCurrency(job.amount)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))
            }
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  monthTitle: {
    textAlign: 'center',
    marginVertical: 8,
  },
  summaryCard: {
    margin: 16,
    elevation: 4,
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
  jobsTitle: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  noJobsCard: {
    margin: 16,
  },
  noJobsText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  jobListCard: {
    margin: 16,
    elevation: 2,
  },
  paymentBreakdown: {
    marginBottom: 16,
  },
  paymentMethod: {
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  methodName: {
    flex: 1,
    fontWeight: 'bold',
  },
  methodCount: {
    flex: 1,
    textAlign: 'center',
  },
  methodAmount: {
    flex: 1,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    fontWeight: 'bold',
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  jobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  jobDetails: {
    flex: 2,
  },
  jobAddress: {
    color: '#757575',
    fontSize: 12,
  },
  jobPayment: {
    flex: 1,
    alignItems: 'flex-end',
  },
  jobStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  paidText: {
    color: '#4CAF50',
  },
  unpaidText: {
    color: '#F44336',
  },
  jobAmount: {
    fontWeight: 'bold',
  },
});