import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text, List, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { format, isSameDay, addMonths, subMonths } from 'date-fns';

import { useExpenses } from '../context/ExpensesContext';
import { Expense } from '../types';

// Type for marked dates in the calendar
type MarkedDates = {
  [date: string]: {
    marked: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
};

export default function BillCalendarScreen() {
  const navigation = useNavigation();
  const { expenses } = useExpenses();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [selectedDateExpenses, setSelectedDateExpenses] = useState<Expense[]>([]);
  
  // Format date for the calendar (YYYY-MM-DD)
  const formatCalendarDate = (date: Date) => format(date, 'yyyy-MM-dd');
  
  // Set up marked dates for the calendar
  useEffect(() => {
    const newMarkedDates: MarkedDates = {};
    const selectedDateString = formatCalendarDate(selectedDate);
    
    // Mark dates with expenses
    expenses.forEach(expense => {
      if (expense.isPaid) return; // Skip paid expenses
      
      const dueDateObj = new Date(expense.dueDate);
      const dueDateString = formatCalendarDate(dueDateObj);
      
      // Set color based on expense category
      let dotColor = '#2196F3'; // Default blue
      switch (expense.category) {
        case 'Fixed':
          dotColor = '#4CAF50'; // Green
          break;
        case 'Variable':
          dotColor = '#FF9800'; // Orange
          break;
        case 'Business':
          dotColor = '#9C27B0'; // Purple
          break;
        case 'Personal':
          dotColor = '#E91E63'; // Pink
          break;
        case 'Other':
          dotColor = '#607D8B'; // Blue Grey
          break;
      }
      
      // Update or create the marked date
      if (newMarkedDates[dueDateString]) {
        // If date already marked, just ensure it's still marked
        newMarkedDates[dueDateString].marked = true;
      } else {
        // Create new marked date
        newMarkedDates[dueDateString] = {
          marked: true,
          dotColor
        };
      }
    });
    
    // Highlight selected date
    if (newMarkedDates[selectedDateString]) {
      newMarkedDates[selectedDateString] = {
        ...newMarkedDates[selectedDateString],
        selected: true,
        selectedColor: 'rgba(33, 150, 243, 0.3)'
      };
    } else {
      newMarkedDates[selectedDateString] = {
        marked: false,
        selected: true,
        selectedColor: 'rgba(33, 150, 243, 0.3)'
      };
    }
    
    setMarkedDates(newMarkedDates);
  }, [expenses, selectedDate]);
  
  // Update expenses for selected date
  useEffect(() => {
    const selectedExpenses = expenses.filter(expense => {
      const dueDate = new Date(expense.dueDate);
      return isSameDay(dueDate, selectedDate) && !expense.isPaid;
    });
    
    setSelectedDateExpenses(selectedExpenses);
  }, [expenses, selectedDate]);
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Handle date selection on calendar
  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(new Date(day.dateString));
  };
  
  // Total due on selected date
  const totalDueOnDate = selectedDateExpenses.reduce(
    (sum, expense) => sum + expense.amount, 
    0
  );
  
  // Navigate to expense detail
  const handleExpensePress = (expense: Expense) => {
    navigation.navigate('ExpenseDetail' as never, { expenseId: expense.id } as never);
  };
  
  // Handle add new expense
  const handleAddExpense = () => {
    // Navigate to add expense with the selected date pre-filled
    navigation.navigate(
      'AddExpense' as never, 
      { prefilledDate: selectedDate.toISOString() } as never
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.calendarCard}>
        <Card.Content>
          <Title>Bill Calendar</Title>
          <Paragraph>
            Tap on a date to see due bills. Colored dots indicate different bill categories.
          </Paragraph>
          
          <Calendar
            current={formatCalendarDate(currentDate)}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              selectedDayBackgroundColor: '#2196F3',
              todayTextColor: '#2196F3',
              arrowColor: '#2196F3'
            }}
            style={styles.calendar}
          />
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <Badge style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} size={12} />
              <Text style={styles.legendText}>Fixed</Text>
            </View>
            <View style={styles.legendItem}>
              <Badge style={[styles.legendDot, { backgroundColor: '#FF9800' }]} size={12} />
              <Text style={styles.legendText}>Variable</Text>
            </View>
            <View style={styles.legendItem}>
              <Badge style={[styles.legendDot, { backgroundColor: '#9C27B0' }]} size={12} />
              <Text style={styles.legendText}>Business</Text>
            </View>
            <View style={styles.legendItem}>
              <Badge style={[styles.legendDot, { backgroundColor: '#E91E63' }]} size={12} />
              <Text style={styles.legendText}>Personal</Text>
            </View>
            <View style={styles.legendItem}>
              <Badge style={[styles.legendDot, { backgroundColor: '#607D8B' }]} size={12} />
              <Text style={styles.legendText}>Other</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.selectedDateCard}>
        <Card.Content>
          <Title>
            {format(selectedDate, 'MMMM d, yyyy')}
          </Title>
          <Divider style={styles.divider} />
          
          {selectedDateExpenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Paragraph style={styles.emptyText}>No bills due on this date</Paragraph>
              <Button 
                mode="contained" 
                onPress={handleAddExpense}
                style={styles.addButton}
              >
                Add Expense for This Date
              </Button>
            </View>
          ) : (
            <>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Due:</Text>
                <Text style={styles.totalAmount}>{formatCurrency(totalDueOnDate)}</Text>
              </View>
              
              <Divider style={styles.divider} />
              
              {selectedDateExpenses.map(expense => (
                <TouchableOpacity
                  key={expense.id}
                  onPress={() => handleExpensePress(expense)}
                >
                  <List.Item
                    title={expense.name}
                    description={`${expense.category} • ${expense.recurrence}`}
                    right={() => (
                      <Text style={styles.expenseAmount}>
                        {formatCurrency(expense.amount)}
                      </Text>
                    )}
                    style={styles.expenseItem}
                    left={props => (
                      <View style={[
                        styles.categoryIndicator, 
                        getCategoryColor(expense.category)
                      ]} />
                    )}
                  />
                </TouchableOpacity>
              ))}
              
              <Button 
                mode="outlined" 
                onPress={handleAddExpense}
                style={styles.addOutlineButton}
              >
                Add Another Expense
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

// Helper function to get the category color
const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Fixed':
      return { backgroundColor: '#4CAF50' };
    case 'Variable':
      return { backgroundColor: '#FF9800' };
    case 'Business':
      return { backgroundColor: '#9C27B0' };
    case 'Personal':
      return { backgroundColor: '#E91E63' };
    case 'Other':
    default:
      return { backgroundColor: '#607D8B' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  calendarCard: {
    margin: 16,
    marginBottom: 8,
  },
  calendar: {
    marginTop: 12,
    borderRadius: 8,
    elevation: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  legendDot: {
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
  },
  selectedDateCard: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  divider: {
    marginVertical: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontStyle: 'italic',
    marginBottom: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#F44336',
  },
  expenseItem: {
    paddingVertical: 8,
    paddingLeft: 0,
  },
  expenseAmount: {
    alignSelf: 'center',
    fontWeight: 'bold',
    paddingRight: 8,
  },
  categoryIndicator: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    marginRight: 8,
    alignSelf: 'center',
  },
  addButton: {
    backgroundColor: '#2196F3',
  },
  addOutlineButton: {
    marginTop: 16,
    borderColor: '#2196F3',
  }
});