import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text, FAB, Chip, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';

import { useExpenses } from '../context/ExpensesContext';
import { useJobs } from '../context/JobsContext';
import { DailyExpenseSummary } from '../types';

export default function DailyExpensesScreen() {
  const navigation = useNavigation();
  const { getDailyExpenseSummary, getTotalDailyExpensesForRange, deleteExpense } = useExpenses();
  const { calculateWeeklySummary } = useJobs();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyExpenseSummaries, setDailyExpenseSummaries] = useState<DailyExpenseSummary[]>([]);
  const [earningsData, setEarningsData] = useState({
    weeklyEarnings: 0,
    totalExpenses: 0,
    remainingEarnings: 0
  });
  
  // Calculate week range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  
  // Format dates for display
  const weekRangeText = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  
  // Fetch data whenever week changes
  useEffect(() => {
    // Get daily expenses for the week
    const summaries = getDailyExpenseSummary(
      weekStart.toISOString(), 
      weekEnd.toISOString()
    );
    setDailyExpenseSummaries(summaries);
    
    // Calculate weekly income and expenses
    const weeklySummary = calculateWeeklySummary(
      weekStart.toISOString(),
      weekEnd.toISOString()
    );
    
    const totalExpenses = getTotalDailyExpensesForRange(
      weekStart.toISOString(),
      weekEnd.toISOString()
    );
    
    setEarningsData({
      weeklyEarnings: weeklySummary.netEarnings,
      totalExpenses,
      remainingEarnings: weeklySummary.netEarnings - totalExpenses
    });
  }, [currentDate, getDailyExpenseSummary, calculateWeeklySummary, getTotalDailyExpensesForRange]);
  
  // Week navigation
  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };
  
  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };
  
  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };
  
  // Add a new daily expense
  const handleAddExpense = () => {
    navigation.navigate('AddDailyExpense' as never);
  };
  
  // Edit an expense
  const handleEditExpense = (expenseId: string) => {
    navigation.navigate('AddDailyExpense' as never, { expenseId } as never);
  };
  
  // Delete an expense
  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(expenseId);
    
    // Refresh the list after deletion
    const summaries = getDailyExpenseSummary(
      weekStart.toISOString(), 
      weekEnd.toISOString()
    );
    setDailyExpenseSummaries(summaries);
    
    // Update totals
    const totalExpenses = getTotalDailyExpensesForRange(
      weekStart.toISOString(),
      weekEnd.toISOString()
    );
    
    setEarningsData(prev => ({
      ...prev,
      totalExpenses,
      remainingEarnings: prev.weeklyEarnings - totalExpenses
    }));
  };
  
  // Format currency for display
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Get color for expense category
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Gas':
        return '#FF9800'; // Orange
      case 'Food':
        return '#4CAF50'; // Green
      case 'Water':
        return '#2196F3'; // Blue
      case 'Daily':
      default:
        return '#9E9E9E'; // Gray
    }
  };
  
  // Render a daily expense summary item
  const renderExpenseSummaryItem = ({ item }: { item: DailyExpenseSummary }) => {
    const dateObj = parseISO(item.date);
    
    return (
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.dateRow}>
            <Title>{format(dateObj, 'EEEE, MMM d')}</Title>
            <Title style={styles.dailyTotal}>{formatCurrency(item.totalAmount)}</Title>
          </View>
          
          <Divider style={styles.divider} />
          
          {item.expenses.map(expense => (
            <View key={expense.id} style={styles.expenseItem}>
              <View style={styles.expenseDetails}>
                <Text style={styles.expenseName}>{expense.name}</Text>
                <Chip 
                  style={[styles.categoryChip, { backgroundColor: getCategoryColor(expense.category) + '20' }]}
                  textStyle={{ color: getCategoryColor(expense.category) }}
                >
                  {expense.category}
                </Chip>
              </View>
              
              <View style={styles.expenseActions}>
                <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                <View style={styles.actionButtons}>
                  <IconButton 
                    icon="pencil" 
                    size={16} 
                    onPress={() => handleEditExpense(expense.id)}
                    style={styles.iconButton}
                  />
                  <IconButton 
                    icon="delete" 
                    size={16} 
                    onPress={() => handleDeleteExpense(expense.id)}
                    style={styles.iconButton}
                    color="#F44336"
                  />
                </View>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekNavigator}>
        <Button icon="chevron-left" onPress={goToPreviousWeek} mode="text">
          Prev
        </Button>
        <Button onPress={goToCurrentWeek} mode="text">
          Today
        </Button>
        <Button icon="chevron-right" onPress={goToNextWeek} mode="text" contentStyle={{ flexDirection: 'row-reverse' }}>
          Next
        </Button>
      </View>
      
      <Title style={styles.weekTitle}>{weekRangeText}</Title>
      
      {/* Weekly Summary Card */}
      <Card style={styles.weeklyCard}>
        <Card.Content>
          <Title>Weekly Summary</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Weekly Earnings:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(earningsData.weeklyEarnings)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Daily Expenses:</Text>
            <Text style={[styles.summaryValue, styles.expenseValue]}>
              - {formatCurrency(earningsData.totalExpenses)}
            </Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Remaining Earnings:</Text>
            <Text style={[
              styles.summaryValue, 
              earningsData.remainingEarnings >= 0 ? styles.positiveValue : styles.negativeValue
            ]}>
              {formatCurrency(earningsData.remainingEarnings)}
            </Text>
          </View>
        </Card.Content>
      </Card>
      
      {/* Daily Expenses List */}
      {dailyExpenseSummaries.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Paragraph style={styles.emptyText}>No daily expenses recorded for this week</Paragraph>
            <Button 
              mode="contained" 
              onPress={handleAddExpense}
              style={styles.addButton}
            >
              Add Your First Expense
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={dailyExpenseSummaries}
          renderItem={renderExpenseSummaryItem}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      {/* Add Expense FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddExpense}
        label="Add Expense"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  weekNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  weekTitle: {
    textAlign: 'center',
    marginVertical: 8,
  },
  weeklyCard: {
    margin: 16,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontWeight: 'bold',
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  expenseValue: {
    color: '#F44336', // Red for expenses
  },
  positiveValue: {
    color: '#4CAF50', // Green for positive balance
  },
  negativeValue: {
    color: '#F44336', // Red for negative balance
  },
  emptyCard: {
    margin: 16,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#2196F3',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Space for the FAB
  },
  summaryCard: {
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyTotal: {
    fontSize: 18,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expenseDetails: {
    flex: 1,
  },
  expenseName: {
    fontSize: 16,
    marginBottom: 4,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    height: 24,
  },
  expenseActions: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    margin: 0,
    padding: 0,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});