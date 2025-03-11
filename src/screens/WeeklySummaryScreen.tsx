import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text } from 'react-native-paper';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { Job } from '../types';

export default function WeeklySummaryScreen() {
  const { getJobsByDateRange, calculateWeeklySummary } = useJobs();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weeklyJobs, setWeeklyJobs] = useState<Job[]>([]);
  
  // Calculate start and end of week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 }); // Saturday
  
  // Format dates for display
  const weekRangeText = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  
  useEffect(() => {
    // Get jobs for the current week
    const jobs = getJobsByDateRange(weekStart.toISOString(), weekEnd.toISOString());
    setWeeklyJobs(jobs);
  }, [currentDate, getJobsByDateRange]);
  
  // Calculate weekly summary
  const summary = calculateWeeklySummary(weekStart.toISOString(), weekEnd.toISOString());
  
  const navigateToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };
  
  const navigateToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };
  
  const navigateToCurrentWeek = () => {
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
      <View style={styles.weekSelector}>
        <Button icon="chevron-left" onPress={navigateToPreviousWeek} mode="text">
          Prev
        </Button>
        <Button onPress={navigateToCurrentWeek} mode="text">
          Today
        </Button>
        <Button icon="chevron-right" onPress={navigateToNextWeek} mode="text" contentStyle={{ flexDirection: 'row-reverse' }}>
          Next
        </Button>
      </View>
      
      <Title style={styles.weekTitle}>{weekRangeText}</Title>
      
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title>Weekly Summary</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Jobs:</Paragraph>
            <Paragraph>{summary.totalJobs}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Earnings:</Paragraph>
            <Paragraph style={styles.amount}>{formatCurrency(summary.totalEarnings)}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Unpaid Amount:</Paragraph>
            <Paragraph style={styles.unpaidAmount}>{formatCurrency(summary.totalUnpaid)}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Cash Payments:</Paragraph>
            <Paragraph>{formatCurrency(summary.cashPayments)}</Paragraph>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Net Earnings:</Paragraph>
            <Paragraph style={styles.netEarnings}>{formatCurrency(summary.netEarnings)}</Paragraph>
          </View>
          
          <View style={styles.formulaContainer}>
            <Text style={styles.formulaText}>
              Net Earnings = (Total Earnings / 2) - Cash Payments
            </Text>
          </View>
        </Card.Content>
      </Card>
      
      <Title style={styles.jobsTitle}>Jobs This Week ({weeklyJobs.length})</Title>
      
      {weeklyJobs.length === 0 ? (
        <Card style={styles.noJobsCard}>
          <Card.Content>
            <Paragraph style={styles.noJobsText}>No jobs recorded for this week</Paragraph>
          </Card.Content>
        </Card>
      ) : (
        weeklyJobs.map((job) => (
          <Card key={job.id} style={[styles.jobCard, job.isPaid ? styles.paidJobCard : styles.unpaidJobCard]}>
            <Card.Content>
              <View style={styles.jobHeader}>
                <Title>{job.companyName || 'Unnamed Job'}</Title>
                <Text style={job.isPaid ? styles.paidText : styles.unpaidText}>
                  {job.isPaid ? 'PAID' : 'UNPAID'}
                </Text>
              </View>
              
              <Paragraph>{format(new Date(job.date), 'MMM d, yyyy')}</Paragraph>
              <Paragraph>{`${job.address}, ${job.city}`}</Paragraph>
              
              <View style={styles.jobFooter}>
                <Paragraph>{`${job.yards} yards`}</Paragraph>
                <Paragraph style={styles.jobAmount}>{formatCurrency(job.amount)}</Paragraph>
              </View>
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  weekTitle: {
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
  formulaContainer: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  formulaText: {
    fontStyle: 'italic',
    textAlign: 'center',
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
  jobCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 5,
  },
  paidJobCard: {
    borderLeftColor: '#4CAF50',
  },
  unpaidJobCard: {
    borderLeftColor: '#F44336',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paidText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  unpaidText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  jobAmount: {
    fontWeight: 'bold',
  },
});