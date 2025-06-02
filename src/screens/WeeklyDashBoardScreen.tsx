import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';

export default function WeeklyDashboardScreen() {
  const navigation = useNavigation();
  const { getJobsByDateRange, calculateWeeklySummary } = useJobs();
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weeklyJobs, setWeeklyJobs] = useState<Job[]>([]);
  
  // Calculate start and end of week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 }); // Saturday
  
  // Format dates for display
  const weekRangeText = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  
  // Get user's role and commission rate
  const isOwner = user?.role === 'owner';
  const commissionRate = user?.commissionRate || 50;
  
  // State for calculated totals
  const [totals, setTotals] = useState({
    income: 0,
    commission: 0,
    cashPayments: 0,
    paidToMeAmount: 0,
    yourPay: 0,
    totalUnpaid: 0
  });

  // Fetch data and calculate totals
  useEffect(() => {
    try {
      // Format dates for API calls
      const startStr = weekStart.toISOString();
      const endStr = weekEnd.toISOString();
      
      // Get jobs for the current week
      const jobs = getJobsByDateRange(startStr, endStr);
      setWeeklyJobs(jobs);
      
      // Get weekly summary
      const summary = calculateWeeklySummary(startStr, endStr);
      
      // Calculate income
      const totalIncome = summary.totalEarnings;
      
      // Calculate commission based on user role
      let yourPay = 0;
      if (isOwner) {
        yourPay = totalIncome;
      } else {
        // Calculate based on commission rate
        const commission = totalIncome * (commissionRate / 100);
        yourPay = commission;
        
        // Adjust for direct payments
        if (user?.keepsCash) {
          yourPay -= summary.cashPayments;
        }
        yourPay -= summary.paidToMeAmount;
      }
      
      setTotals({
        income: totalIncome,
        commission: totalIncome * (commissionRate / 100),
        cashPayments: summary.cashPayments,
        paidToMeAmount: summary.paidToMeAmount,
        yourPay,
        totalUnpaid: summary.totalUnpaid
      });
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    }
  }, [
    currentDate, 
    getJobsByDateRange, 
    calculateWeeklySummary,
    isOwner,
    commissionRate,
    user
  ]);
  
  const navigateToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };
  
  const navigateToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };
  
  const navigateToCurrentWeek = () => {
    setCurrentDate(new Date());
  };
  
  // Navigation handlers
  const handleAddJob = () => {
    navigation.navigate('AddJob' as never);
  };
  
  const handleViewJobDetail = (jobId: string) => {
    navigation.navigate('JobDetail' as never, { jobId: jobId } as never);
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
      
      {/* Weekly Summary Card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title>Weekly Earnings</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Jobs:</Paragraph>
            <Paragraph>{weeklyJobs.length}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Income:</Paragraph>
            <Paragraph style={styles.amount}>{formatCurrency(totals.income)}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Unpaid Amount:</Paragraph>
            <Paragraph style={styles.unpaidAmount}>{formatCurrency(totals.totalUnpaid)}</Paragraph>
          </View>
          
          {/* Show different calculations based on role */}
          {isOwner ? (
            // Owner view - simpler calculation
            <View style={styles.summaryRow}>
              <Paragraph style={styles.label}>Your Income:</Paragraph>
              <Paragraph style={styles.amount}>{formatCurrency(totals.yourPay)}</Paragraph>
            </View>
          ) : (
            // Employee view - show commission and payment details
            <>
              <View style={styles.summaryRow}>
                <Paragraph style={styles.label}>Your Commission ({commissionRate}%):</Paragraph>
                <Paragraph style={styles.amount}>{formatCurrency(totals.commission)}</Paragraph>
              </View>
              
              {user?.keepsCash && totals.cashPayments > 0 && (
                <View style={styles.summaryRow}>
                  <Paragraph style={styles.label}>Cash Kept:</Paragraph>
                  <Paragraph style={styles.deductionText}>- {formatCurrency(totals.cashPayments)}</Paragraph>
                </View>
              )}
              
              {totals.paidToMeAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Paragraph style={styles.label}>"Paid To Me" Jobs:</Paragraph>
                  <Paragraph style={styles.deductionText}>- {formatCurrency(totals.paidToMeAmount)}</Paragraph>
                </View>
              )}
              
              <Divider style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Paragraph style={styles.label}>Your Pay:</Paragraph>
                <Paragraph style={styles.yourPay}>{formatCurrency(totals.yourPay)}</Paragraph>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* Action Buttons */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title>Weekly Actions</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.actionButtonsContainer}>
            {/*add smething here*/}
          </View>
        </Card.Content>
      </Card>
      
      {/* Jobs This Week Card */}
      <Title style={styles.jobsTitle}>Jobs This Week ({weeklyJobs.length})</Title>
      
      {weeklyJobs.length === 0 ? (
        <Card style={styles.noJobsCard}>
          <Card.Content>
            <Paragraph style={styles.noJobsText}>No jobs recorded for this week</Paragraph>
            
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.jobsCard}>
          <Card.Content>
            {weeklyJobs.map((job) => (
              <TouchableOpacity 
                key={job.id}
                onPress={() => handleViewJobDetail(job.id)}
                style={[
                  styles.jobItem,
                  { borderLeftColor: job.isPaid ? '#4CAF50' : '#F44336' }
                ]}
              >
                <View style={styles.jobInfo}>
                  <Text style={styles.jobCompany}>{job.companyName || 'Unnamed Job'}</Text>
                  <Text style={styles.jobAddress}>{format(new Date(job.date), 'EEE')} - {job.address}</Text>
                  <View style={styles.jobDetails}>
                    <Text style={styles.jobYards}>{job.yards} yards</Text>
                    <Text style={styles.jobPaymentMethod}>{job.paymentMethod}</Text>
                  </View>
                </View>
                <View style={styles.jobAmount}>
                  <Text style={[
                    styles.jobStatus,
                    job.isPaid ? styles.paidStatus : styles.unpaidStatus
                  ]}>
                    {job.isPaid ? 'PAID' : 'UNPAID'}
                  </Text>
                  <Text style={styles.jobTotal}>{formatCurrency(job.amount)}</Text>
                </View>
              </TouchableOpacity>
            ))}
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
    marginBottom: 8,
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
  deductionText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  yourPay: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  actionsCard: {
    margin: 16,
    marginBottom: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionButton: {
    width: '100%',
    marginBottom: 16,
  },
  addJobButton: {
    backgroundColor: '#2196F3',
  },
  jobsTitle: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  noJobsCard: {
    margin: 16,
  },
  noJobsText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#2196F3',
  },
  jobsCard: {
    margin: 16,
    marginBottom: 80, // Extra padding for FAB
    elevation: 2,
  },
  jobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderLeftWidth: 3,
  },
  jobInfo: {
    flex: 1,
  },
  jobCompany: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  jobAddress: {
    color: '#757575',
    fontSize: 14,
    marginBottom: 4,
  },
  jobDetails: {
    flexDirection: 'row',
  },
  jobYards: {
    fontSize: 14,
    color: '#616161',
    marginRight: 8,
  },
  jobPaymentMethod: {
    fontSize: 14,
    color: '#616161',
  },
  jobAmount: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  jobStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paidStatus: {
    color: '#4CAF50',
  },
  unpaidStatus: {
    color: '#F44336',
  },
  jobTotal: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});