import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar, Divider, Text, List, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, addDays, isBefore, addWeeks, subWeeks } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { useExpenses } from '../context/ExpensesContext';
import { useWeeklyGoals } from '../context/WeeklyGoalsContext';
import { useAuth } from '../context/AuthContext';
import { Job, Expense, WeeklyGoal } from '../types';

export default function WeeklyDashboardScreen() {
  const navigation = useNavigation();
  const { getJobsByDateRange } = useJobs();
  const { getUpcomingExpenses, getTotalDailyExpensesForRange } = useExpenses();
  const { getCurrentWeekGoal, updateWeeklyGoal, suggestWeeklyGoal } = useWeeklyGoals();
  const { user } = useAuth();
  
  // State for current date and data fetched from it
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Refs to prevent infinite loops
  const weekStartRef = useRef(startOfWeek(currentDate, { weekStartsOn: 0 }));
  const weekEndRef = useRef(endOfWeek(currentDate, { weekStartsOn: 0 }));
  
  // State for fetched data
  const [dashboardData, setDashboardData] = useState({
    weeklyJobs: [] as Job[],
    weekIncome: 0,
    cashPayments: 0,
    cashPaymentsToEmployee: 0, // New: Cash specifically marked "to me"
    checkPaymentsToEmployee: 0, // New: Checks specifically marked "to me" 
    yourPay: 0,
    upcomingBills: [] as Expense[],
    currentGoal: null as WeeklyGoal | null,
    suggestedPayments: [] as Expense[],
    dailyExpensesTotal: 0,
    finalTakeHome: 0,
    commissionRate: user?.commissionRate || 50, // Add commission rate
    isOwner: user?.role === 'owner' // Whether user is owner
  });
  
  // Update refs when currentDate changes
  useEffect(() => {
    weekStartRef.current = startOfWeek(currentDate, { weekStartsOn: 0 });
    weekEndRef.current = endOfWeek(currentDate, { weekStartsOn: 0 });
  }, [currentDate]);
  
  // Single data-fetching effect that runs only when the date changes
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const weekStart = weekStartRef.current;
        const weekEnd = weekEndRef.current;
        
        // Fetch jobs and calculate income
        const jobs = getJobsByDateRange(weekStart.toISOString(), weekEnd.toISOString());
        const totalIncome = jobs.reduce((sum, job) => sum + job.amount, 0);
        
        // Get all cash/check payments
        const allCashPayments = jobs
          .filter(job => job.isPaid && job.paymentMethod === 'Cash')
          .reduce((sum, job) => sum + job.amount, 0);
          
        const allCheckPayments = jobs
          .filter(job => job.isPaid && job.paymentMethod === 'Check')
          .reduce((sum, job) => sum + job.amount, 0);
        
        // Get cash/check payments specifically marked as going to the employee
        const cashPaymentsToEmployee = jobs
          .filter(job => job.isPaid && job.paymentMethod === 'Cash' && job.paymentToMe)
          .reduce((sum, job) => sum + job.amount, 0);
          
        const checkPaymentsToEmployee = jobs
          .filter(job => job.isPaid && job.paymentMethod === 'Check' && job.paymentToMe)
          .reduce((sum, job) => sum + job.amount, 0);
        
        // Calculate employee's actual pay based on role
        let yourPay = 0;
        
        if (user?.role === 'owner') {
          // Owner gets 100% of job income
          yourPay = totalIncome;
        } else {
          // Employee gets commission
          const commissionRate = (user?.commissionRate || 50) / 100;
          
          // Calculate commission amount
          yourPay = totalIncome * commissionRate;
          
          // Subtract cash/check that the employee kept, if they're configured to keep them
          if (user?.keepsCash) {
            yourPay -= cashPaymentsToEmployee;
          }
          
          if (user?.keepsCheck) {
            yourPay -= checkPaymentsToEmployee;
          }
        }
        
        // Get daily expenses total
        const dailyExpensesTotal = getTotalDailyExpensesForRange(
          weekStart.toISOString(),
          weekEnd.toISOString()
        );
        
        // Calculate final take home after daily expenses
        const finalTakeHome = yourPay - dailyExpensesTotal;
        
        // Fetch upcoming bills
        const nextMonth = addDays(weekEnd, 28);
        const bills = getUpcomingExpenses(weekStart.toISOString(), nextMonth.toISOString());
        
        // Sort bills by due date
        const sortedBills = [...bills].sort((a, b) => {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        
        // Get or suggest a goal
        let goal = getCurrentWeekGoal(weekStart.toISOString(), weekEnd.toISOString());
        
        // If no goal exists, create a suggested one
        if (!goal) {
          try {
            const suggestion = await suggestWeeklyGoal(weekStart.toISOString(), weekEnd.toISOString());
            goal = {
              id: 'temp-goal-id',
              weekStartDate: weekStart.toISOString(),
              weekEndDate: weekEnd.toISOString(),
              incomeTarget: suggestion.incomeTarget,
              actualIncome: finalTakeHome, // Use final take home pay
              allocatedBills: suggestion.allocatedBills,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          } catch (error) {
            console.error('Error suggesting weekly goal:', error);
          }
        } else if (goal.actualIncome !== finalTakeHome) {
          // Update the goal with current income if it exists
          try {
            const updatedGoal = {
              ...goal,
              actualIncome: finalTakeHome // Use final take home pay
            };
            await updateWeeklyGoal(updatedGoal);
            goal = updatedGoal;
          } catch (error) {
            console.error('Error updating weekly goal:', error);
          }
        }
        
        // Calculate suggested payments
        const suggestedPayments = getSuggestedPayments(sortedBills, finalTakeHome, goal);
        
        // Update all state at once to prevent cascading updates
        setDashboardData({
          weeklyJobs: jobs,
          weekIncome: totalIncome,
          cashPayments: allCashPayments,
          cashPaymentsToEmployee,
          checkPaymentsToEmployee,
          yourPay,
          upcomingBills: sortedBills,
          currentGoal: goal,
          suggestedPayments,
          dailyExpensesTotal,
          finalTakeHome,
          commissionRate: user?.commissionRate || 50,
          isOwner: user?.role === 'owner'
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    
    fetchDashboardData();
  }, [currentDate, user]); // Depend on date and user to recalculate when role/settings change
  
  // Extract values from dashboard data
  const { 
    weeklyJobs, 
    weekIncome, 
    cashPayments,
    cashPaymentsToEmployee,
    checkPaymentsToEmployee,
    yourPay, 
    upcomingBills, 
    currentGoal, 
    suggestedPayments,
    dailyExpensesTotal,
    finalTakeHome,
    commissionRate,
    isOwner
  } = dashboardData;
  
  // Helper function to get suggested bills to pay
  function getSuggestedPayments(bills, income, goal) {
    if (!goal) return [];
    
    let remainingFunds = income;
    const suggestions = [];
    
    // First prioritize overdue bills
    const overdueBills = bills.filter(bill => 
      !bill.isPaid && isBefore(new Date(bill.dueDate), new Date())
    );
    
    // Then upcoming bills
    const upcomingDueBills = bills.filter(bill => 
      !bill.isPaid && !isBefore(new Date(bill.dueDate), new Date())
    );
    
    // Combine them with overdue first
    const prioritizedBills = [...overdueBills, ...upcomingDueBills];
    
    // Suggest payments based on available funds
    for (const bill of prioritizedBills) {
      if (remainingFunds >= bill.amount) {
        suggestions.push(bill);
        remainingFunds -= bill.amount;
      }
    }
    
    return suggestions;
  }
  
  // Navigation between weeks
  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };
  
  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };
  
  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };
  
  // Format dates for display
  const weekRangeText = `${format(weekStartRef.current, 'MMM d')} - ${format(weekEndRef.current, 'MMM d, yyyy')}`;
  
  // Calculate progress towards weekly goal
  const progressPercentage = currentGoal && currentGoal.incomeTarget > 0 
    ? (finalTakeHome / currentGoal.incomeTarget) 
    : 0;
  const progressColor = progressPercentage >= 1 ? '#4CAF50' : progressPercentage >= 0.7 ? '#FFC107' : '#F44336';
  
  // Format currency for display
  const formatCurrency = (amount) => {
    if (amount === undefined) return '$0.00';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Modified getDaysUntilDue function with validation
  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return 0;
    
    try {
      const today = new Date();
      const due = new Date(dueDate);
      
      // Check if date is valid
      if (isNaN(due.getTime())) {
        return 0;
      }
      
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return 0;
    }
  };
  
  // Handler functions
  const handleEditGoal = () => {
    navigation.navigate('SetWeeklyGoal' as never, { weekStart: weekStartRef.current.toISOString() } as never);
  };
  
  const handlePayBills = () => {
    navigation.navigate('PayBills' as never, { suggestions: suggestedPayments } as never);
  };
  
  const handleAddJob = () => {
    navigation.navigate('AddJob' as never);
  };
  
  const handleViewJobDetails = (jobId) => {
    // Navigate to the Home tab first, then to JobDetail screen
    navigation.navigate('Home', {
      screen: 'JobDetail',
      params: { jobId }
    });
  };
  
  const handleViewExpenses = () => {
    navigation.navigate('ExpensesList' as never);
  };
  
  const handleViewDailyExpenses = () => {
    navigation.navigate('DailyExpenses' as never);
  };
  
  const handleAddDailyExpense = () => {
    navigation.navigate('AddDailyExpense' as never);
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Week navigation */}
      <View style={styles.weekNavigation}>
        <IconButton
          icon="chevron-left"
          size={24}
          onPress={goToPreviousWeek}
        />
        <Button mode="text" onPress={goToCurrentWeek}>
          Today
        </Button>
        <IconButton
          icon="chevron-right"
          size={24}
          onPress={goToNextWeek}
        />
      </View>
      
      {/* Header card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title>Weekly Dashboard</Title>
          <Paragraph>{weekRangeText}</Paragraph>
        </Card.Content>
      </Card>
      
      {/* Goal card */}
      <Card style={styles.goalCard}>
        <Card.Content>
          <View style={styles.goalHeader}>
            <Title>This Week's Goal</Title>
            <Button mode="text" onPress={handleEditGoal}>Edit</Button>
          </View>
          
          <View style={styles.goalDetails}>
            <Paragraph style={styles.goalTarget}>
              Target: {formatCurrency(currentGoal?.incomeTarget || 0)}
            </Paragraph>
            <Paragraph style={styles.goalActual}>
              Actual: {formatCurrency(finalTakeHome)}
            </Paragraph>
          </View>
          
          <ProgressBar
            progress={Math.min(progressPercentage, 1)}
            color={progressColor}
            style={styles.progressBar}
          />
          
          <Paragraph style={{
            textAlign: 'center',
            marginTop: 8,
            color: progressColor
          }}>
            {Math.round(progressPercentage * 100)}% of weekly target
          </Paragraph>
        </Card.Content>
      </Card>
      
      {/* Jobs card */}
      <Card style={styles.jobsCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>This Week's Jobs</Title>
            <Button 
              mode="text" 
              onPress={handleAddJob} 
              compact
            >
              Add New
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          {weeklyJobs.length === 0 ? (
            <Paragraph style={styles.emptyState}>No jobs recorded for this week yet</Paragraph>
          ) : (
            <>
              <View style={styles.jobSummary}>
                <Paragraph>Completed: {weeklyJobs.filter(job => job.isPaid).length} jobs</Paragraph>
                <Paragraph>Total Income: {formatCurrency(weekIncome)}</Paragraph>
                
                {/* Different calculations based on role */}
                {isOwner ? (
                  // Owner view
                  <Paragraph style={styles.yourPayText}>Your Income: {formatCurrency(yourPay)}</Paragraph>
                ) : (
                  // Employee view - show commission and payment details
                  <>
                    <Paragraph>Commission ({commissionRate}%): {formatCurrency(weekIncome * (commissionRate / 100))}</Paragraph>
                    
                    {user?.keepsCash && cashPaymentsToEmployee > 0 && (
                      <Paragraph style={styles.deductionText}>Cash Kept: -{formatCurrency(cashPaymentsToEmployee)}</Paragraph>
                    )}
                    
                    {user?.keepsCheck && checkPaymentsToEmployee > 0 && (
                      <Paragraph style={styles.deductionText}>Checks Kept: -{formatCurrency(checkPaymentsToEmployee)}</Paragraph>
                    )}
                    
                    <Paragraph style={styles.yourPayText}>Your Pay: {formatCurrency(yourPay)}</Paragraph>
                  </>
                )}
              </View>
              
              <List.Section style={styles.jobList}>
                {weeklyJobs.map(job => (
                  <List.Item
                    key={job.id}
                    title={job.companyName || 'Unlisted Company'}
                    description={
                      <View>
                        <Text>{`${job.city || 'No location'} • ${job.yards} yards`}</Text>
                        {job.paymentToMe && (job.paymentMethod === 'Cash' || job.paymentMethod === 'Check') && (
                          <Text style={styles.paymentToMeTag}>To me</Text>
                        )}
                      </View>
                    }
                    left={() => (
                      <List.Icon 
                        icon={job.isPaid ? "check-circle" : "clock-outline"} 
                        color={job.isPaid ? "#4CAF50" : "#FFC107"} 
                      />
                    )}
                    right={() => (
                      <View style={styles.jobRight}>
                        <Text style={styles.jobAmount}>{formatCurrency(job.amount)}</Text>
                        <Text style={[
                          styles.paymentStatus, 
                          { color: job.isPaid ? "#4CAF50" : "#F44336" }
                        ]}>
                          {job.isPaid ? job.paymentMethod || 'Paid' : 'Unpaid'}
                        </Text>
                      </View>
                    )}
                    onPress={() => handleViewJobDetails(job.id)}
                    style={[
                      styles.jobItem,
                      { backgroundColor: job.isPaid ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255, 193, 7, 0.05)' }
                    ]}
                  />
                ))}
              </List.Section>
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* Daily Expenses Card */}
      <Card style={styles.expensesCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>Daily Expenses</Title>
            <Button 
              mode="text" 
              onPress={handleAddDailyExpense} 
              compact
            >
              Add Expense
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.expensesSummary}>
            <View style={styles.summaryRow}>
              <Paragraph style={styles.label}>Your Pay:</Paragraph>
              <Paragraph style={styles.amount}>{formatCurrency(yourPay)}</Paragraph>
            </View>
            
            <View style={styles.summaryRow}>
              <Paragraph style={styles.label}>Daily Expenses:</Paragraph>
              <Paragraph style={styles.expenseAmount}>- {formatCurrency(dailyExpensesTotal)}</Paragraph>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Paragraph style={styles.label}>Final Take Home:</Paragraph>
              <Paragraph style={[
                styles.finalAmount,
                finalTakeHome >= 0 ? styles.positiveAmount : styles.negativeAmount
              ]}>
                {formatCurrency(finalTakeHome)}
              </Paragraph>
            </View>
          </View>
          
          <Button
            mode="outlined"
            onPress={handleViewDailyExpenses}
            icon="receipt"
            style={styles.viewButton}
          >
            View All Daily Expenses
          </Button>
        </Card.Content>
      </Card>
      
      {/* Bills card */}
      <Card style={styles.billsCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title>Upcoming Bills</Title>
            <Button 
              mode="text" 
              onPress={handleViewExpenses} 
              compact
            >
              View All
            </Button>
          </View>
          <Divider style={styles.divider} />
          
          {upcomingBills.length === 0 ? (
            <Paragraph style={styles.emptyState}>No upcoming bills</Paragraph>
          ) : (
            <List.Section>
              {upcomingBills.slice(0, 5).map(bill => {
                const daysUntil = getDaysUntilDue(bill.dueDate);
                let urgencyColor = '#4CAF50';
                if (daysUntil <= 0) urgencyColor = '#F44336';
                else if (daysUntil <= 7) urgencyColor = '#FFC107';
                
                return (
                  <List.Item
                    key={bill.id}
                    title={bill.name}
                    description={`Due: ${format(new Date(bill.dueDate), 'MMM d, yyyy')}`}
                    right={() => (
                      <View style={styles.billRight}>
                        <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
                        <Text style={[styles.daysUntil, { color: urgencyColor }]}>
                          {daysUntil <= 0 ? 'OVERDUE' : `${daysUntil} days`}
                        </Text>
                      </View>
                    )}
                    style={styles.billItem}
                  />
                );
              })}
            </List.Section>
          )}
        </Card.Content>
      </Card>
      
      {/* Payment suggestions card */}
      <Card style={styles.suggestionsCard}>
        <Card.Content>
          <Title>Payment Suggestions</Title>
          <Divider style={styles.divider} />
          
          <Paragraph>Based on your current take-home pay of {formatCurrency(finalTakeHome)}, you can pay:</Paragraph>
          
          {suggestedPayments.length === 0 ? (
            <Paragraph style={styles.emptyState}>
              No bills can be paid with current income
            </Paragraph>
          ) : (
            <List.Section>
              {suggestedPayments.map(bill => (
                <List.Item
                  key={bill.id}
                  title={bill.name}
                  description={formatCurrency(bill.amount)}
                  left={() => <List.Icon icon="check-circle" color="#4CAF50" />}
                  style={styles.suggestionItem}
                />
              ))}
              
              <Button
                mode="contained"
                style={styles.payBillsButton}
                onPress={handlePayBills}
                disabled={suggestedPayments.length === 0}
              >
                Pay Selected Bills
              </Button>
            </List.Section>
          )}
          
          {finalTakeHome < (currentGoal?.incomeTarget || 0) && (
            <Card style={styles.shortfallCard}>
              <Card.Content>
                <Paragraph style={styles.shortfallText}>
                  You need {formatCurrency((currentGoal?.incomeTarget || 0) - finalTakeHome)} more to reach your weekly goal
                </Paragraph>
              </Card.Content>
            </Card>
          )}
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
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  goalCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  goalTarget: {
    fontWeight: 'bold',
  },
  goalActual: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
  },
  jobsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  // Styles for daily expenses card
  expensesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f8f8ff', // Light blue-ish background to differentiate
  },
  expensesSummary: {
    marginVertical: 8,
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
  expenseAmount: {
    fontWeight: 'bold',
    color: '#F44336', // Red for expenses
  },
  finalAmount: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  positiveAmount: {
    color: '#4CAF50', // Green for positive balance
  },
  negativeAmount: {
    color: '#F44336', // Red for negative balance
  },
  viewButton: {
    marginTop: 8,
  },
  // End of new styles
  jobSummary: {
    marginBottom: 12,
  },
  yourPayText: {
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 4,
  },
  deductionText: {
    color: '#F44336', // Red color for deductions
  },
  jobList: {
    marginHorizontal: -16, // Counter the Card padding
  },
  jobItem: {
    paddingLeft: 0,
    borderRadius: 4,
    marginBottom: 4,
  },
  jobRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 12,
  },
  jobAmount: {
    fontWeight: 'bold',
  },
  paymentStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  paymentToMeTag: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  billsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  suggestionsCard: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 12,
  },
  emptyState: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 12,
  },
  billItem: {
    paddingLeft: 0,
  },
  billRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 12,
  },
  billAmount: {
    fontWeight: 'bold',
  },
  daysUntil: {
    fontSize: 12,
    marginTop: 4,
  },
  suggestionItem: {
    paddingLeft: 0,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: 4,
    marginBottom: 4,
  },
  payBillsButton: {
    marginTop: 12,
    backgroundColor: '#4CAF50',
  },
  shortfallCard: {
    marginTop: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.05)',
  },
  shortfallText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#F44336',
  },
});