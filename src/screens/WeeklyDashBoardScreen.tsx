import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar, Divider, Text, List, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, addDays, isBefore, isToday, addWeeks, subWeeks } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { useExpenses } from '../context/ExpensesContext';
import { useWeeklyGoals } from '../context/WeeklyGoalsContext';

export default function WeeklyDashboardScreen() {
  const navigation = useNavigation();
  const { jobs, getJobsByDateRange } = useJobs();
  const { expenses, getUpcomingExpenses } = useExpenses();
  const { weeklyGoals, getCurrentWeekGoal, updateWeeklyGoal, suggestWeeklyGoal } = useWeeklyGoals();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weeklyJobs, setWeeklyJobs] = useState([]);
  const [upcomingBills, setUpcomingBills] = useState([]);
  const [currentGoal, setCurrentGoal] = useState(null);
  
  // Calculate start and end of week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 }); // Saturday
  
  // Format dates for display
  const weekRangeText = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  
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
  
  useEffect(() => {
    // Get jobs for the current week
   const jobsThisWeek = getJobsByDateRange(
  weekStart ? weekStart.toISOString() : new Date().toISOString(),
  weekEnd ? weekEnd.toISOString() : new Date().toISOString()
);
    
    // Get upcoming bills (next 4 weeks)
    const nextMonth = addDays(weekEnd, 28);
    const bills = getUpcomingExpenses(weekStart.toISOString(), nextMonth.toISOString());
    setUpcomingBills(bills);
    
    // Get or initialize this week's goal
    const goal = getCurrentWeekGoal(weekStart.toISOString(), weekEnd.toISOString());
    
    if (goal) {
      setCurrentGoal(goal);
    } else {
      // Create a suggested goal if no goal exists
      suggestWeeklyGoal(weekStart.toISOString(), weekEnd.toISOString())
        .then(suggestion => {
          // Only set the suggestion data, don't create an actual goal yet
          setCurrentGoal({
            weekStartDate: weekStart.toISOString(),
            weekEndDate: weekEnd.toISOString(),
            incomeTarget: suggestion.incomeTarget,
            actualIncome: 0,
            allocatedBills: suggestion.allocatedBills,
            id: 'temp-goal-id', // Temporary ID for the UI
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        })
        .catch(error => {
          console.error('Error suggesting weekly goal:', error);
        });
    }
  }, [currentDate, getJobsByDateRange, getUpcomingExpenses, getCurrentWeekGoal, suggestWeeklyGoal]);
  
  // Calculate week's actual income
  const weekIncome = weeklyJobs.reduce((sum, job) => sum + job.amount, 0);
  
  // Update the weekly goal with actual income
  useEffect(() => {
    if (currentGoal && currentGoal.id !== 'temp-goal-id' && weekIncome !== currentGoal.actualIncome) {
      const updatedGoal = {
        ...currentGoal,
        actualIncome: weekIncome
      };
      updateWeeklyGoal(updatedGoal)
        .then(() => {
          setCurrentGoal(updatedGoal);
        })
        .catch(error => {
          console.error('Error updating weekly goal:', error);
        });
    } else if (currentGoal && currentGoal.id === 'temp-goal-id') {
      // If it's a temporary suggested goal, just update the UI
      setCurrentGoal({
        ...currentGoal,
        actualIncome: weekIncome
      });
    }
  }, [weekIncome, currentGoal, updateWeeklyGoal]);
  
  // Calculate progress towards weekly goal
  const progressPercentage = currentGoal ? (weekIncome / currentGoal.incomeTarget) : 0;
  const progressColor = progressPercentage >= 1 ? '#4CAF50' : progressPercentage >= 0.7 ? '#FFC107' : '#F44336';
  
  // Sort upcoming bills by due date
  const sortedBills = [...upcomingBills].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  
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
  if (!dueDate) return 0; // Return 0 if no due date is provided
  
  try {
    const today = new Date();
    const due = new Date(dueDate);
    
    // Check if date is valid
    if (isNaN(due.getTime())) {
      console.warn('Invalid date encountered:', dueDate);
      return 0;
    }
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    console.error('Error calculating days until due:', error);
    return 0;
  }
};
  
  // Navigate to weekly goal setting screen
  const handleEditGoal = () => {
    navigation.navigate('SetWeeklyGoal' as never, { weekStart: weekStart.toISOString() } as never);
  };
  
  // Get suggested bills to pay with current income
  const getSuggestedPayments = () => {
    if (!currentGoal) return [];
    
    let remainingFunds = weekIncome;
    const suggestions = [];
    
    // First prioritize overdue bills
    const overdueBills = sortedBills.filter(bill => 
      !bill.isPaid && isBefore(new Date(bill.dueDate), new Date())
    );
    
    // Then upcoming bills
    const upcomingDueBills = sortedBills.filter(bill => 
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
  };
  
  // Handle pay bills navigation
  const handlePayBills = () => {
    const suggestedPayments = getSuggestedPayments();
    navigation.navigate('PayBills' as never, { suggestions: suggestedPayments } as never);
  };
  
  // Handle add job
  const handleAddJob = () => {
    navigation.navigate('AddJob' as never);
  };
  
  // Handle view all expenses
  const handleViewExpenses = () => {
    navigation.navigate('ExpensesList' as never);
  };
  
  const suggestedPayments = getSuggestedPayments();
  
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
              Actual: {formatCurrency(weekIncome)}
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
          <Title>This Week's Jobs</Title>
          <Divider style={styles.divider} />
          
          {weeklyJobs.length === 0 ? (
            <Paragraph style={styles.emptyState}>No jobs recorded for this week yet</Paragraph>
          ) : (
            <>
              <Paragraph>Completed: {weeklyJobs.filter(job => job.isPaid).length} jobs</Paragraph>
              <Paragraph>Income: {formatCurrency(weekIncome)}</Paragraph>
            </>
          )}
          
          <Button 
            mode="contained" 
            style={styles.addJobButton}
            onPress={handleAddJob}
          >
            Add New Job
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
          
          {sortedBills.length === 0 ? (
            <Paragraph style={styles.emptyState}>No upcoming bills</Paragraph>
          ) : (
            <List.Section>
              {sortedBills.slice(0, 5).map(bill => {
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
          
          <Paragraph>Based on your current income of {formatCurrency(weekIncome)}, you can pay:</Paragraph>
          
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
          
          {weekIncome < (currentGoal?.incomeTarget || 0) && (
            <Card style={styles.shortfallCard}>
              <Card.Content>
                <Paragraph style={styles.shortfallText}>
                  You need {formatCurrency((currentGoal?.incomeTarget || 0) - weekIncome)} more to reach your weekly goal
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
  addJobButton: {
    marginTop: 12,
    backgroundColor: '#2196F3',
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