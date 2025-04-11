import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { useExpenses } from '../context/ExpensesContext';
import { useWeeklyGoals } from '../context/WeeklyGoalsContext';
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

export default function WeeklyDashboardScreen() {
  const navigation = useNavigation();
  const { getJobsByDateRange, calculateWeeklySummary } = useJobs();
  const { getDailyExpenses, getUpcomingExpenses, getTotalDailyExpensesForRange } = useExpenses();
  const { getCurrentWeekGoal } = useWeeklyGoals();
  const { user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weeklyJobs, setWeeklyJobs] = useState<Job[]>([]);
  
  // State for display toggles
  const [earningsView, setEarningsView] = useState<'gross' | 'net'>('net');
  const [includeDailyExpenses, setIncludeDailyExpenses] = useState(true);
  const [includeBills, setIncludeBills] = useState(true);
  
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
    dailyExpenses: 0,
    bills: 0,
    finalTakeHome: 0
  });

  // State for weekly goal
  const [weeklyGoal, setWeeklyGoal] = useState({
    exists: false,
    incomeTarget: 0,
    progress: 0
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
      
      // Get daily expenses
      const dailyExpensesTotal = getTotalDailyExpensesForRange(startStr, endStr);
      
      // Get bills for this week
      const weeklyBills = getUpcomingExpenses(startStr, endStr);
      const billsTotal = weeklyBills.reduce((sum, bill) => sum + bill.amount, 0);
      
      // Get weekly goal
      const goal = getCurrentWeekGoal(startStr, endStr);
      if (goal) {
        setWeeklyGoal({
          exists: true,
          incomeTarget: goal.incomeTarget,
          progress: Math.min(100, Math.round((summary.totalEarnings / goal.incomeTarget) * 100)) || 0
        });
      } else {
        setWeeklyGoal({
          exists: false,
          incomeTarget: 0,
          progress: 0
        });
      }
      
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
      
      // Calculate final take home (after applicable expenses)
      let finalTakeHome = yourPay;
      
      // Apply deductions based on toggle state
      if (earningsView === 'net') {
        const expenseDeduction = includeDailyExpenses ? dailyExpensesTotal : 0;
        const billsDeduction = includeBills ? billsTotal : 0;
        finalTakeHome -= (expenseDeduction + billsDeduction);
      }
      
      setTotals({
        income: totalIncome,
        commission: totalIncome * (commissionRate / 100),
        cashPayments: summary.cashPayments,
        paidToMeAmount: summary.paidToMeAmount,
        yourPay,
        dailyExpenses: dailyExpensesTotal,
        bills: billsTotal,
        finalTakeHome
      });
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    }
  }, [
    currentDate, 
    getJobsByDateRange, 
    calculateWeeklySummary,
    getTotalDailyExpensesForRange,
    getUpcomingExpenses,
    getCurrentWeekGoal,
    isOwner,
    commissionRate,
    user,
    earningsView,
    includeDailyExpenses,
    includeBills
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
  
  const handleSetWeeklyGoal = () => {
    navigation.navigate('SetWeeklyGoal' as never, { 
      weekStart: weekStart.toISOString() 
    } as never);
  };
  
  const handleViewSummary = () => {
    navigation.navigate('WeeklySummary' as never);
  };
  
  const handleViewBills = () => {
    navigation.navigate('ExpensesList' as never);
  };
  
  const handlePayBills = () => {
    // Get upcoming bills for the week
    const upcomingBills = getUpcomingExpenses(
      weekStart.toISOString(), 
      weekEnd.toISOString()
    ).filter(bill => !bill.isPaid);
    
    navigation.navigate('PayBills' as never, { 
      suggestions: upcomingBills 
    } as never);
  };
  
  // Format currency for display
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Render progress bar for weekly goal
  const renderProgressBar = (progress: number) => {
    return (
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
    );
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
      
      {/* Weekly Goal Card */}
      <Card style={styles.goalCard}>
        <Card.Content>
          <View style={styles.goalHeader}>
            <Title>Weekly Goal</Title>
            <Button 
              mode="text" 
              onPress={handleSetWeeklyGoal}
              icon="pencil"
            >
              {weeklyGoal.exists ? 'Update' : 'Set Goal'}
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          {weeklyGoal.exists ? (
            <>
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Target Income:</Text>
                <Text style={styles.goalTarget}>{formatCurrency(weeklyGoal.incomeTarget)}</Text>
              </View>
              
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Current Income:</Text>
                <Text style={styles.amount}>{formatCurrency(totals.income)}</Text>
              </View>
              
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Progress:</Text>
                <Text style={styles.goalProgress}>{weeklyGoal.progress}%</Text>
              </View>
              
              {renderProgressBar(weeklyGoal.progress)}
              
              <View style={styles.goalRow}>
                <Text style={styles.goalLabel}>Remaining:</Text>
                <Text style={styles.goalRemaining}>
                  {formatCurrency(Math.max(0, weeklyGoal.incomeTarget - totals.income))}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.noGoalContainer}>
              <Text style={styles.noGoalText}>No weekly goal set</Text>
              <Button 
                mode="contained" 
                onPress={handleSetWeeklyGoal}
                style={styles.setGoalButton}
              >
                Set Weekly Goal
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
      
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
                label="Weekly Bills"
                value={includeBills}
                onValueChange={setIncludeBills}
              />
            </View>
          )}
        </Card.Content>
      </Card>
      
      {/* Weekly Summary Card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryHeader}>
            <Title>Weekly Earnings</Title>
            <Button 
              mode="text" 
              onPress={handleViewSummary}
              icon="eye"
            >
              Details
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Paragraph style={styles.label}>Total Jobs:</Paragraph>
            <Paragraph>{weeklyJobs.length}</Paragraph>
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
                  <Paragraph style={styles.label}>Weekly Bills:</Paragraph>
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
      
      {/* Action Buttons */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title>Weekly Actions</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.actionButtonsContainer}>
            <Button 
              mode="contained" 
              icon="plus"
              onPress={handleAddJob}
              style={[styles.actionButton, styles.addJobButton]}
            >
              Add Job
            </Button>
            
            <Button 
              mode="contained" 
              icon="file-document"
              onPress={handlePayBills}
              style={[styles.actionButton, styles.payBillsButton]}
            >
              Pay Bills
            </Button>
            
            <Button 
              mode="outlined" 
              icon="view-dashboard"
              onPress={handleViewSummary}
              style={styles.actionButton}
            >
              View Summary
            </Button>
            
            <Button 
              mode="outlined" 
              icon="format-list-bulleted"
              onPress={handleViewBills}
              style={styles.actionButton}
            >
              View Bills
            </Button>
          </View>
        </Card.Content>
      </Card>
      
      {/* Jobs This Week Card */}
      <Title style={styles.jobsTitle}>Jobs This Week ({weeklyJobs.length})</Title>
      
      {weeklyJobs.length === 0 ? (
        <Card style={styles.noJobsCard}>
          <Card.Content>
            <Paragraph style={styles.noJobsText}>No jobs recorded for this week</Paragraph>
            <Button 
              mode="contained"
              onPress={handleAddJob}
              style={styles.addButton}
            >
              Add Your First Job
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.jobsCard}>
          <Card.Content>
            {weeklyJobs.map((job) => (
              <TouchableOpacity 
                key={job.id}
                onPress={() => navigation.navigate('JobDetail' as never, { jobId: job.id } as never)}
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
            
            <Button 
              mode="outlined"
              onPress={handleViewSummary}
              icon="eye"
              style={styles.viewAllButton}
            >
              View All Details
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
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  weekTitle: {
    textAlign: 'center',
    marginVertical: 8,
  },
  goalCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#E8F5E9',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalLabel: {
    fontWeight: 'bold',
  },
  goalTarget: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  goalProgress: {
    fontWeight: 'bold',
  },
  goalRemaining: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  noGoalContainer: {
    alignItems: 'center',
    padding: 16,
  },
  noGoalText: {
    fontStyle: 'italic',
    marginBottom: 16,
  },
  setGoalButton: {
    backgroundColor: '#4CAF50',
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
    marginBottom: 8,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  actionsCard: {
    margin: 16,
    marginBottom: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    marginBottom: 16,
  },
  addJobButton: {
    backgroundColor: '#2196F3',
  },
  payBillsButton: {
    backgroundColor: '#FF9800',
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
  viewAllButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});