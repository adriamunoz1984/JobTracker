import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { useExpenses } from '../context/ExpensesContext';
import { useAuth } from '../context/AuthContext';
import { Job, Expense } from '../types';
import { formatDate, toDateString, getMonthBoundaries, groupItemsByDate } from '../utils/DateUtil';

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

// Add this utility function if it's not already in DateUtils.ts
const getMonthBoundaries = (date: Date): { start: Date, end: Date } => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  // Create timezone-safe dates at noon
  return {
    start: new Date(`${toDateString(start)}T12:00:00`),
    end: new Date(`${toDateString(end)}T12:00:00`)
  };
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
  
  // Calculate start and end of month using the utility function
  const { start: monthStart, end: monthEnd } = getMonthBoundaries(currentDate);
  
  // Format month for display
  const monthText = formatDate(toDateString(monthStart), 'MMMM yyyy');
  
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
      // Convert to string format for consistent comparison
      const startStr = toDateString(monthStart);
      const endStr = toDateString(monthEnd);
      
      // Filter expenses that are regular bills (not daily expenses)
      return expenses
        .filter(expense => {
          if (expense.isDailyExpense) return false;
          
          // Get the date part only for comparison
          const dueDateStr = expense.dueDate.split('T')[0];
          return dueDateStr >= startStr && dueDateStr <= endStr;
        })
        .reduce((sum, bill) => sum + bill.amount, 0);
    } catch (error) {
      console.error('Error calculating bills total:', error);
      return 0;
    }
  };
  
  // Calculate payment method totals
  const calculatePaymentMethodTotals = (jobs: Job[]) => {
    const methods = ['Cash', 'Check', 'Zelle', 'Square', 'Charge'];
    return methods.map(method => {
      const methodJobs = jobs.filter(job => job.paymentMethod === method);
      const total = methodJobs.reduce((sum, job) => sum + job.amount, 0);
      return { method, count: methodJobs.length, total };
    });
  };
  
  // Fetch data and calculate totals
  useEffect(() => {
    try {
      // Convert to string format for job fetching
      const startStr = toDateString(monthStart);
      const endStr = toDateString(monthEnd);
      
      // Get jobs for the current month
      const jobs = getJobsByDateRange(`${startStr}T00:00:00Z`, `${endStr}T23:59:59Z`);
      setMonthlyJobs(jobs);
      
      // Get daily expenses
      const dailyExpensesTotal = getTotalDailyExpensesForRange(
        `${startStr}T00:00:00Z`, 
        `${endStr}T23:59:59Z`
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
  
  // Navigation handlers
  const handleViewBills = () => {
    navigation.navigate('ExpensesList' as never);
  };
  
  const handleViewDailyExpenses = () => {
    navigation.navigate('DailyExpenses' as never);
  };
  
  const handleViewJobDetails = (jobId: string) => {
    navigation.navigate('JobDetail' as never, { jobId } as never);
  };
  
  const handleAddJob = () => {
    navigation.navigate('AddJob' as never);
  };
  
  // Format currency for display
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Get payment method breakdowns
  const paymentBreakdown = calculatePaymentMethodTotals(monthlyJobs);
  
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
      
      <Title style={styles.jobsTitle}>Jobs This Month ({monthlyJobs.length})</Title>
      
      {monthlyJobs.length === 0 ? (
        <Card style={styles.noJobsCard}>
          <Card.Content>
            <Paragraph style={styles.noJobsText}>No jobs recorded for this month</Paragraph>
            <Button 
              mode="contained"
              onPress={handleAddJob}
              style={styles.addButton}
            >
              Add Job
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.jobListCard}>
          <Card.Content>
            <View style={styles.paymentBreakdown}>
              <View style={styles.paymentMethod}>
                <Title style={styles.paymentTitle}>Payment Methods</Title>
                {paymentBreakdown.map(item => (
                  <View key={item.method} style={styles.methodRow}>
                    <Text style={styles.methodName}>{item.method}</Text>
                    <Text style={styles.methodCount}>{item.count} jobs</Text>
                    <Text style={styles.methodAmount}>{formatCurrency(item.total)}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Group jobs by date with fixed date handling */}
            {Object.entries(
              groupItemsByDate(monthlyJobs)
            )
              .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
              .map(([dateKey, jobs]) => (
                <View key={dateKey} style={styles.dateGroup}>
                  <Text style={styles.dateHeader}>
                    {formatDate(`${dateKey}T00:00:00Z`, 'EEE, MMM d')} - {jobs.length} jobs
                  </Text>
                  
                  {jobs.map(job => (
                    <TouchableOpacity
                      key={job.id}
                      style={styles.jobItem}
                      onPress={() => handleViewJobDetails(job.id)}
                    >
                      <View style={styles.jobDetails}>
                        <Text style={styles.jobName}>{job.companyName || 'Unnamed Job'}</Text>
                        <Text style={styles.jobAddress}>{job.city}</Text>
                        <View style={styles.jobInfoRow}>
                          <Text style={styles.jobYards}>{job.yards} yards</Text>
                          {job.isPaidToMe && (
                            <View style={styles.paidToMeBadge}>
                              <Text style={styles.paidToMeText}>Paid To Me</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.jobPayment}>
                        <Text style={[
                          styles.jobStatus, 
                          job.isPaid ? styles.paidText : styles.unpaidText
                        ]}>
                          {job.isPaid ? 'PAID' : 'UNPAID'}
                        </Text>
                        <Text style={styles.jobAmount}>{formatCurrency(job.amount)}</Text>
                        <Text style={styles.paymentMethod}>{job.paymentMethod}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            }
          </Card.Content>
        </Card>
      )}
      
      {/* Daily Expenses Summary - Only show if including expenses */}
      {earningsView === 'net' && includeDailyExpenses && totals.dailyExpenses > 0 && (
        <Card style={styles.expensesCard}>
          <Card.Content>
            <Title>Daily Expenses</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.expensesTotalRow}>
              <Text style={styles.expensesTotalLabel}>Total Daily Expenses:</Text>
              <Text style={styles.expensesTotalAmount}>{formatCurrency(totals.dailyExpenses)}</Text>
            </View>
            
            <Button 
              mode="outlined" 
              icon="receipt"
              onPress={handleViewDailyExpenses}
              style={styles.viewButton}
            >
              View Expense Details
            </Button>
          </Card.Content>
        </Card>
      )}
      
      {/* Bills Summary - Only show if including bills */}
      {earningsView === 'net' && includeBills && totals.bills > 0 && (
        <Card style={styles.billsCard}>
          <Card.Content>
            <Title>Monthly Bills</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.expensesTotalRow}>
              <Text style={styles.expensesTotalLabel}>Total Monthly Bills:</Text>
              <Text style={styles.expensesTotalAmount}>{formatCurrency(totals.bills)}</Text>
            </View>
            
            <Button 
              mode="outlined" 
              icon="file-document"
              onPress={handleViewBills}
              style={styles.viewButton}
            >
              View Bills
            </Button>
          </Card.Content>
        </Card>
      )}
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
  addButton: {
    backgroundColor: '#2196F3',
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
  },
  jobDetails: {
    flex: 2,
  },
  jobName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  jobAddress: {
    color: '#757575',
    fontSize: 14,
    marginBottom: 4,
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobYards: {
    fontSize: 14,
    color: '#616161',
    marginRight: 8,
  },
  paidToMeBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paidToMeText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: 'bold',
  },
  jobPayment: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  jobStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paidText: {
    color: '#4CAF50',
  },
  unpaidText: {
    color: '#F44336',
  },
  jobAmount: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#757575',
  },
  expensesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF8E1',
  },
  billsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#E8F5E9',
  },
  expensesTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expensesTotalLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  expensesTotalAmount: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#F44336',
  },
  viewButton: {
    marginTop: 8,
  }
});