import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text as RNText } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text } from 'react-native-paper';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

import { useJobs } from '../context/JobsContext';
import { Job } from '../types';

export default function WeeklySummaryScreen() {
  const navigation = useNavigation();
  const { jobs } = useJobs();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weeklyJobs, setWeeklyJobs] = useState<Job[]>([]);
  
  // Calculate start and end of week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 }); // Saturday
  
  // Format dates for display
  const weekRangeText = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  
  // For debugging
  const formattedWeekStart = format(weekStart, 'yyyy-MM-dd');
  const formattedWeekEnd = format(weekEnd, 'yyyy-MM-dd');
  
  useEffect(() => {
    // Direct filtering in the component instead of using context function
    try {
      // Get jobs for the current week - manually filter by date
      const filteredJobs = jobs.filter((job) => {
        try {
          const jobDate = new Date(job.date);
          const jobDateFormatted = format(jobDate, 'yyyy-MM-dd');
          
          const isInRange = jobDateFormatted >= formattedWeekStart && 
                          jobDateFormatted <= formattedWeekEnd;
          
          console.log(`Job ${job.id} date: ${jobDateFormatted}, in range: ${isInRange}`);
          return isInRange;
        } catch (error) {
          console.error('Error filtering job:', error);
          return false;
        }
      });
      
      console.log(`Found ${filteredJobs.length} jobs in range`);
      setWeeklyJobs(filteredJobs);
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
  }, [currentDate, jobs, formattedWeekStart, formattedWeekEnd]);
  
  // Calculate weekly summary manually
  const totalEarnings = weeklyJobs.reduce((sum, job) => sum + job.amount, 0);
  const totalUnpaid = weeklyJobs
    .filter(job => !job.isPaid)
    .reduce((sum, job) => sum + job.amount, 0);
  const cashPayments = weeklyJobs
    .filter(job => job.isPaid && job.paymentMethod === 'Cash')
    .reduce((sum, job) => sum + job.amount, 0);
  const netEarnings = (totalEarnings / 2) - cashPayments;
  
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
      
      {/* Debug Card */}
      <Card style={styles.debugCard}>
        <Card.Content>
          <Title>Debug Info</Title>
          <Paragraph>Total Jobs in System: {jobs.length}</Paragraph>
          <Paragraph>Jobs For This Week: {weeklyJobs.length}</Paragraph>
          <Paragraph>Week Start: {formattedWeekStart}</Paragraph>
          <Paragraph>Week End: {formattedWeekEnd}</Paragraph>
        </Card.Content>
      </Card>
      
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title>Weekly Summary</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Jobs:</Paragraph>
            <Paragraph>{weeklyJobs.length}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Earnings:</Paragraph>
            <Paragraph style={styles.amount}>{formatCurrency(totalEarnings)}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Unpaid Amount:</Paragraph>
            <Paragraph style={styles.unpaidAmount}>{formatCurrency(totalUnpaid)}</Paragraph>
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
              
              <Paragraph>Date: {format(new Date(job.date), 'MMM d, yyyy')}</Paragraph>
              <Paragraph>Address: {`${job.address}, ${job.city}`}</Paragraph>
              
              <View style={styles.jobFooter}>
                <Paragraph>{`${job.yards} yards`}</Paragraph>
                <Paragraph style={styles.jobAmount}>{formatCurrency(job.amount)}</Paragraph>
              </View>
              
              <RNText style={styles.jobId}>Job ID: {job.id}</RNText>
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
  debugCard: {
    margin: 16,
    backgroundColor: '#FFF9C4', // Light yellow
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
    marginBottom: 16,
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
  jobId: {
    fontSize: 10,
    color: '#999',
    marginTop: 8,
  },
});