import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { FAB, Searchbar, Card, Title, Paragraph, Chip, Button, SegmentedButtons, Divider, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, isAfter, isBefore, isToday } from 'date-fns';

import { useExpenses } from '../context/ExpensesContext';
import { Expense } from '../types';

export default function ExpensesListScreen() {
  const navigation = useNavigation();
  const { expenses, isLoading } = useExpenses();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaid, setFilterPaid] = useState<boolean | null>(false); // null = show all, true = paid only, false = unpaid only
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  // Filter expenses based on search, paid status, and category
  const filteredExpenses = expenses.filter(expense => {
    // Search filter
    const matchesSearch = searchQuery
      ? expense.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    // Paid status filter
    const matchesPaidStatus = filterPaid === null 
      ? true
      : expense.isPaid === filterPaid;
    
    // Category filter
    const matchesCategory = filterCategory === null
      ? true
      : expense.category === filterCategory;
    
    return matchesSearch && matchesPaidStatus && matchesCategory;
  });

  // Sort expenses by due date (closest first)
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    // Always prioritize unpaid
    if (a.isPaid !== b.isPaid) {
      return a.isPaid ? 1 : -1;
    }
    
    // Then sort by due date
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddExpense = () => {
    navigation.navigate('AddExpense' as never);
  };

  const handleExpensePress = (expense: Expense) => {
    navigation.navigate('ExpenseDetail' as never, { expenseId: expense.id } as never);
  };

  const handleViewCalendar = () => {
    navigation.navigate('BillCalendar' as never);
  };

  // Get status label and color for expense
  const getStatusInfo = (expense: Expense) => {
    const dueDate = new Date(expense.dueDate);
    const today = new Date();
    
    if (expense.isPaid) {
      return { 
        label: 'PAID', 
        color: '#4CAF50', 
        bgColor: 'rgba(76, 175, 80, 0.1)' 
      };
    }
    
    if (isToday(dueDate)) {
      return { 
        label: 'DUE TODAY', 
        color: '#FF9800', 
        bgColor: 'rgba(255, 152, 0, 0.1)' 
      };
    }
    
    if (isBefore(dueDate, today)) {
      return { 
        label: 'OVERDUE', 
        color: '#F44336', 
        bgColor: 'rgba(244, 67, 54, 0.1)' 
      };
    }
    
    // Calculate days until due
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return { 
        label: `DUE IN ${diffDays} DAY${diffDays === 1 ? '' : 'S'}`, 
        color: '#FF9800', 
        bgColor: 'rgba(255, 152, 0, 0.1)' 
      };
    }
    
    return { 
      label: 'UPCOMING', 
      color: '#2196F3', 
      bgColor: 'rgba(33, 150, 243, 0.1)' 
    };
  };

  // Render expense item
  const renderExpenseItem = ({ item }: { item: Expense }) => {
    const status = getStatusInfo(item);
    const formattedDueDate = format(new Date(item.dueDate), 'MMM dd, yyyy');
    const formattedAmount = item.amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    
    return (
      <Card 
        style={[styles.expenseCard, { borderLeftColor: status.color }]} 
        onPress={() => handleExpensePress(item)}
      >
        // In the renderExpenseItem function in ExpensesListScreen.tsx, update the Card.Content section:

        <Card.Content>
          <View style={styles.cardHeader}>
            <Title 
              numberOfLines={1} 
              ellipsizeMode="tail" 
              style={styles.expenseTitle}
            >
              {item.name}
            </Title>
            <Chip 
              mode="outlined" 
              textStyle={{ color: status.color, fontWeight: 'bold' }}
              style={{ backgroundColor: status.bgColor, borderColor: status.color }}
            >
              {status.label}
            </Chip>
          </View>
          
          <View style={styles.detailRow}>
            <Paragraph>Due: {formattedDueDate}</Paragraph>
            <Paragraph style={styles.amount}>{formattedAmount}</Paragraph>
          </View>
          
          <View style={styles.detailRow}>
            <Paragraph>{item.category}</Paragraph>
            <Paragraph>{item.recurrence}</Paragraph>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search expenses..."
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      <Button 
          mode="outlined" 
          onPress={handleViewCalendar} 
          icon="calendar"
          style={styles.calendarButton}
        >
          Calendar View
        </Button>
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filterPaid === null ? 'all' : filterPaid ? 'paid' : 'unpaid'}
          onValueChange={(value) => {
            if (value === 'all') setFilterPaid(null);
            else if (value === 'paid') setFilterPaid(true);
            else setFilterPaid(false);
          }}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'paid', label: 'Paid' },
          ]}
          style={styles.segmentedButtons}
        />
        
        
      </View>
      
      <Divider style={styles.divider} />
      
      {sortedExpenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No expenses found</Text>
          <Button 
            mode="contained" 
            onPress={handleAddExpense}
            style={styles.addFirstButton}
          >
            Add Your First Expense
          </Button>
        </View>
      ) : (
        <FlatList
          data={sortedExpenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={styles.listContent}
        />
      )}

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
  searchBar: {
    margin: 10,
    elevation: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  segmentedButtons: {
    flex: 1,
    marginRight: 8,
  },
  calendarButton: {
    borderColor: '#2196F3',
  },
  divider: {
    marginVertical: 8,
  },
  listContent: {
    padding: 10,
    paddingBottom: 80, // Space for the FAB
  },
  expenseCard: {
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amount: {
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
    color: '#757575',
  },
  addFirstButton: {
    backgroundColor: '#2196F3',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});