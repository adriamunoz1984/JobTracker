import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text as RNText } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text } from 'react-native-paper';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';

export default function WeeklySummaryScreen() {
  const navigation = useNavigation();
  const { jobs, calculateWeeklySummary } = useJobs();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weeklyJobs, setWeeklyJobs] = useState<Job[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  
  // Calculate start and end of week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 }); // Saturday
  
  // Format dates for display
  const weekRangeText = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  
  useEffect(() => {
    // Get jobs for the current week
    const summary = calculateWeeklySummary(weekStart.toISOString(), weekEnd.toISOString());
    const filteredJobs = jobs.filter((job) => {
      try {
        const jobDate = new Date(job.date);
        const jobDateFormatted = format(jobDate, 'yyyy-MM-dd');
        
        const startFormatted = format(weekStart, 'yyyy-MM-dd');
        const endFormatted = format(weekEnd, 'yyyy-MM-dd');
        
        const isInRange = jobDateFormatted >= startFormatted && jobDateFormatted <= endFormatted;
        return isInRange;
      } catch (error) {
        console.error('Error filtering job:', error);
        return false;
      }
    });
    
    setWeeklySummary(summary);
    setWeeklyJobs(filteredJobs);
  }, [currentDate, jobs, calculateWeeklySummary]);
  
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
            <Paragraph>{weeklyJobs.length}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Earnings:</Paragraph>
            <Paragraph style={styles.amount}>{formatCurrency(weeklySummary?.totalEarnings)}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Unpaid Amount:</Paragraph>
            <Paragraph style={styles.unpaidAmount}>{formatCurrency(weeklySummary?.totalUnpaid)}</Paragraph>
          </View>
          
          {/* Display different calculations based on role */}
          {user?.role === 'owner' ? (
            // Owner view - simpler calculation
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Paragraph style={styles.label}>Net Earnings:</Paragraph>
                <Paragraph style={styles.netEarnings}>{formatCurrency(weeklySummary?.netEarnings)}</Paragraph>
              </View>
              
              <View style={styles.formulaContainer}>
                <Text style={styles.formulaText}>
                  Owner Earnings = 100% of Total Earnings
                </Text>
              </View>
            </>
          ) : (
            // Employee view - show commission and payment details
            <>
              <View style={styles.summaryRow}>
                <Paragraph style={styles.label}>Your Commission Rate:</Paragraph>
                <Paragraph>{user?.commissionRate || 50}%</Paragraph>
              </View>
              
              <View style={styles.summaryRow}>
                <Paragraph style={styles.label}>Commission Amount:</Paragraph>
                <Paragraph>
                  {formatCurrency((weeklySummary?.totalEarnings || 0) * ((user?.commissionRate || 50) / 100))}
                </Paragraph>
              </View>
              
              {user?.keepsCash && (
                <View style={styles.summaryRow}>
                  <Paragraph style={styles.label}>Cash Payments Kept:</Paragraph>
                  <Paragraph style={styles.deduction}>- {formatCurrency(weeklySummary?.cashPayments)}</Paragraph>
                </View>
              )}
              
              {user?.keepsCheck && (
                <View style={styles.summaryRow}>
                  <Paragraph style={styles.label}>Check Payments Kept:</Paragraph>
                  <Paragraph style={styles.deduction}>- {formatCurrency(weeklySummary?.checkPayments)}</Paragraph>
                </View>
              )}
              
              <Divider style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Paragraph style={styles.label}>Your Net Pay:</Paragraph>
                <Paragraph style={styles.netEarnings}>{formatCurrency(weeklySummary?.netEarnings)}</Paragraph>
              </View>
              
              <View style={styles.formulaContainer}>
                <Text style={styles.formulaText}>
                  Your Pay = (Total × {user?.commissionRate || 50}%)
                  {user?.keepsCash ? ' - Cash Payments' : ''}
                  {user?.keepsCheck ? ' - Check Payments' : ''}
                </Text>
              </View>
            </>
          )}
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
                <View style={styles.paymentDetails}>
                  <Paragraph style={styles.jobAmount}>{formatCurrency(job.amount)}</Paragraph>
                  {(job.paymentMethod === 'Cash' || job.paymentMethod === 'Check') && 
                   job.paymentToMe && (
                    <Text style={styles.paymentToMe}>To me</Text>
                  )}
                </View>
              </View>
              
              <RNText style={styles.jobId}>Payment: {job.paymentMethod}</RNText>
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
  deduction: {
    color: '#F44336',
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
  paymentDetails: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  jobAmount: {
    fontWeight: 'bold',
  },
  paymentToMe: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  jobId: {
    fontSize: 10,
    color: '#999',
    marginTop: 8,
  },
});