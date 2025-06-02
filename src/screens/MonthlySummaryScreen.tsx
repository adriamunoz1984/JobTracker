// src/screens/MonthlySummaryScreen.tsx - simplified version without expense references
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';

export default function MonthlySummaryScreen() {
  const navigation = useNavigation();
  const { getJobsByDateRange } = useJobs();
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // State for display toggles
  const [earningsView, setEarningsView] = useState('gross');
  
  // Calculate start and end of month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Format month for display
  const monthText = format(currentDate, 'MMMM yyyy');
  
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
    totalUnpaid: 0,
    finalTakeHome: 0
  });
  
  // Fetch data and calculate totals
  useEffect(() => {
    try {
      // Format dates for API calls
      const startStr = monthStart.toISOString();
      const endStr = monthEnd.toISOString();
      
      // Get jobs for the current month
      const jobs = getJobsByDateRange(startStr, endStr);
      
      // Calculate income
      const totalIncome = jobs.reduce((sum, job) => sum + job.amount, 0);
      
      // Calculate unpaid amount
      const totalUnpaid = jobs
        .filter(job => !job.isPaid)
        .reduce((sum, job) => sum + job.amount, 0);
        
      // Calculate cash payments
      const cashPayments = jobs
        .filter(job => job.isPaid && job.paymentMethod === 'Cash')
        .reduce((sum, job) => sum + job.amount, 0);
      
      // Calculate paid to me amounts
      const paidToMeAmount = jobs
        .filter(job => job.isPaid && job.isPaidToMe)
        .reduce((sum, job) => sum + job.amount, 0);
      
      // Calculate commission
      const commission = totalIncome * (commissionRate / 100);
      
      // Calculate base pay (before expenses)
      let yourPay = 0;
      if (isOwner) {
        yourPay = totalIncome;
      } else {
        yourPay = commission;
        // Subtract direct payments if employee is configured to keep them
        if (user?.keepsCash) {
          yourPay -= cashPayments;
        }
        yourPay -= paidToMeAmount;
      }
      
      setTotals({
        income: totalIncome,
        commission,
        cashPayments,
        paidToMeAmount,
        yourPay,
        totalUnpaid,
        finalTakeHome: yourPay
      });
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  }, [
    currentDate, 
    getJobsByDateRange,
    isOwner,
    commissionRate,
    user
  ]);
  
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
  
  // Simple toggle component
  const EarningsToggle = ({ currentView, onToggle }) => {
    return (
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Show earnings:</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            onPress={() => onToggle('gross')}
            style={[
              styles.toggleButton,
              currentView === 'gross' ? styles.activeButton : styles.inactiveButton
            ]}
          >
            <Text style={[
              styles.buttonText,
              currentView === 'gross' ? styles.activeButtonText : styles.inactiveButtonText
            ]}>
              Gross Income
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => onToggle('net')}
            style={[
              styles.toggleButton,
              currentView === 'net' ? styles.activeButton : styles.inactiveButton
            ]}
          >
            <Text style={[
              styles.buttonText,
              currentView === 'net' ? styles.activeButtonText : styles.inactiveButtonText
            ]}>
              Net Income
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
                <Paragraph style={[
                  styles.netEarnings,
                  totals.finalTakeHome >= 0 ? styles.positiveAmount : styles.negativeAmount
                ]}>
                  {formatCurrency(totals.finalTakeHome)}
                </Paragraph>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* You could add more monthly specific cards here */}
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
  deductionText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  netEarnings: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#4CAF50',
  },
  negativeAmount: {
    color: '#F44336',
  },
  // Toggle styles
  toggleContainer: {
    marginVertical: 12,
  },
  toggleLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#2196F3',
  },
  inactiveButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeButtonText: {
    color: 'white',
  },
  inactiveButtonText: {
    color: '#2196F3',
  },
});