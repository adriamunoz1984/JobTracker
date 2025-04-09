// This is a simplified version of the Monthly Summary screen
// that avoids using potentially problematic functions

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text } from 'react-native-paper';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

import { useJobs } from '../context/JobsContext';
import { useExpenses } from '../context/ExpensesContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';

// Simple Toggle Component
const EarningsToggle = ({ currentView, onToggle }) => {
  return (
    <View style={toggleStyles.container}>
      <Text style={toggleStyles.label}>Show earnings:</Text>
      <View style={toggleStyles.buttonGroup}>
        <TouchableOpacity 
          onPress={() => onToggle('gross')}
          style={[
            toggleStyles.button,
            currentView === 'gross' ? toggleStyles.activeButton : toggleStyles.inactiveButton
          ]}
        >
          <Text style={[
            toggleStyles.buttonText,
            currentView === 'gross' ? toggleStyles.activeButtonText : toggleStyles.inactiveButtonText
          ]}>
            Before Expenses
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => onToggle('net')}
          style={[
            toggleStyles.button,
            currentView === 'net' ? toggleStyles.activeButton : toggleStyles.inactiveButton
          ]}
        >
          <Text style={[
            toggleStyles.buttonText,
            currentView === 'net' ? toggleStyles.activeButtonText : toggleStyles.inactiveButtonText
          ]}>
            After Expenses
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Simple Checkbox Component
const Checkbox = ({ label, value, onValueChange }) => {
  return (
    <TouchableOpacity 
      style={toggleStyles.checkbox}
      onPress={() => onValueChange(!value)}
    >
      <View style={[
        toggleStyles.checkboxBox,
        value ? toggleStyles.checkboxChecked : toggleStyles.checkboxUnchecked
      ]}>
        {value && <Text style={toggleStyles.checkmark}>✓</Text>}
      </View>
      <Text style={toggleStyles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

export default function MonthlySummaryScreen() {
  const navigation = useNavigation();
  const { getJobsByDateRange } = useJobs();
  const { getTotalDailyExpensesForRange, expenses } = useExpenses();
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthlyJobs, setMonthlyJobs] = useState<Job[]>([]);
  
  // State for display toggles
  const [earningsView, setEarningsView] = useState<'gross' | 'net'>('net');
  const [includeDailyExpenses, setIncludeDailyExpenses] = useState(true);
  const [includeBills, setIncludeBills] = useState(true);
  
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
    dailyExpenses: 0,
    bills: 0,
    finalTakeHome: 0
  });
  
  // Get monthly bills total (manual implementation to avoid using missing functions)
  const getBillsTotal = () => {
    try {
      const start = monthStart;
      const end = monthEnd;
      
      // Filter expenses that are regular bills (not daily expenses)
      return expenses
        .filter(expense => {
          if (expense.isDailyExpense) return false;
          
          const dueDate = new Date(expense.dueDate);
          return dueDate >= start && dueDate <= end;
        })
        .reduce((sum, bill) => sum + bill.amount, 0);
    } catch (error) {
      console.error('Error calculating bills total:', error);
      return 0;
    }
  };
  
  // Fetch data and calculate totals
  useEffect(() => {
    try {
      // Get jobs for the current month
      const jobs = getJobsByDateRange(monthStart.toISOString(), monthEnd.toISOString());
      setMonthlyJobs(jobs);
      
      // Get daily expenses
      const dailyExpensesTotal = getTotalDailyExpensesForRange(
        monthStart.toISOString(), 
        monthEnd.toISOString()
      );
      
      // Get bills total
      const billsTotal = getBillsTotal();
      
      // Calculate income
      const totalIncome = jobs.reduce((sum, job) => sum + job.amount, 0);
      
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
      
      // Calculate final take home (after applicable expenses)
      let finalTakeHome = yourPay;
      
      // These deductions will be applied based on toggle state
      if (earningsView === 'net') {
        const expenseDeduction = includeDailyExpenses ? dailyExpensesTotal : 0;
        const billsDeduction = includeBills ? billsTotal : 0;
        finalTakeHome -= (expenseDeduction + billsDeduction);
      }
      
      setTotals({
        income: totalIncome,
        commission,
        cashPayments,
        paidToMeAmount,
        yourPay,
        dailyExpenses: dailyExpensesTotal,
        bills: billsTotal,
        finalTakeHome
      });
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  }, [
    currentDate, 
    getJobsByDateRange, 
    getTotalDailyExpensesForRange,
    isOwner,
    commissionRate,
    user,
    earningsView,
    includeDailyExpenses,
    includeBills
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
      
      {/* Add the earning view toggle */}
      <Card style={styles.toggleCard}>
        <Card.Content>
          <EarningsToggle 
            currentView={earningsView}
            onToggle={setEarningsView}
          />
          
          {/* Add expense inclusion checkboxes */}
          {earningsView === 'net' && (
            <View style={styles.checkboxContainer}>
              <Text style={styles.checkboxTitle}>Include in calculations:</Text>
              <Checkbox 
                label="Daily Expenses"
                value={includeDailyExpenses}
                onValueChange={setIncludeDailyExpenses}
              />
              <Checkbox 
                label="Monthly Bills"
                value={includeBills}
                onValueChange={setIncludeBills}
              />
            </View>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title>Monthly Summary</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Jobs:</Paragraph>
            <Paragraph>{monthlyJobs.length}</Paragraph>
          </View>
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Income:</Paragraph>
            <Paragraph style={styles.amount}>{formatCurrency(totals.income)}</Paragraph>
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
              
              <View style={styles.summaryRow}>
                <Paragraph style={styles.label}>Your Pay:</Paragraph>
                <Paragraph style={styles.yourPay}>{formatCurrency(totals.yourPay)}</Paragraph>
              </View>
            </>
          )}
          
          {/* Only show expense deductions if viewing net earnings */}
          {earningsView === 'net' && (
            <>
              <Divider style={styles.divider} />
              
              {includeDailyExpenses && totals.dailyExpenses > 0 && (
                <View style={styles.summaryRow}>
                  <Paragraph style={styles.label}>Daily Expenses:</Paragraph>
                  <Paragraph style={styles.deductionText}>- {formatCurrency(totals.dailyExpenses)}</Paragraph>
                </View>
              )}
              
              {includeBills && totals.bills > 0 && (
                <View style={styles.summaryRow}>
                  <Paragraph style={styles.label}>Monthly Bills:</Paragraph>
                  <Paragraph style={styles.deductionText}>- {formatCurrency(totals.bills)}</Paragraph>
                </View>
              )}
              
              <Divider style={styles.divider} />
              
              <View style={styles.summaryRow}>
                <Paragraph style={styles.label}>Final Take Home:</Paragraph>
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
      
      {/* Job list and other cards would go here */}
      {/* ... */}
      
    </ScrollView>
  );
}

// Styles for the toggle components
const toggleStyles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
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
  button: {
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
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxUnchecked: {
    backgroundColor: 'transparent',
    borderColor: '#757575',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  checkboxTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  }
});

// Main styles
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
  toggleCard: {
    margin: 16,
    marginBottom: 8,
  },
  checkboxContainer: {
    marginTop: 8,
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
  deductionText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  yourPay: {
    fontWeight: 'bold',
    color: '#2196F3',
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
  // Other styles would go here...
});