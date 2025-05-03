import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Card, Title, Paragraph, FAB, Text, Searchbar, Chip, Divider, IconButton, Menu, Button, Modal, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';

import { useAuth } from '../context/AuthContext';
import { BusinessExpense, BusinessExpenseCategory } from '../types';

// Mock context for business expenses (to be implemented)
// You would replace this with a real context
const useBusinessExpenses = () => {
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  
  // Add a business expense
  const addExpense = async (expense: Omit<BusinessExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newExpense: BusinessExpense = {
      ...expense,
      id: `bexp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };
    
    setExpenses(prev => [...prev, newExpense]);
    return newExpense.id;
  };
  
  // Update a business expense
  const updateExpense = async (expense: BusinessExpense) => {
    setExpenses(prev => prev.map(e => 
      e.id === expense.id ? { ...expense, updatedAt: new Date().toISOString() } : e
    ));
  };
  
  // Delete a business expense
  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };
  
  // Get expenses for date range
  const getExpensesForRange = (startDate: string, endDate: string) => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      
      return expenses.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, { start, end });
      });
    } catch (error) {
      console.error('Error getting expenses for range:', error);
      return [];
    }
  };
  
  // Get total by category for date range
  const getTotalsByCategory = (startDate: string, endDate: string) => {
    const expensesInRange = getExpensesForRange(startDate, endDate);
    
    // Group by category
    return expensesInRange.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {} as Record<BusinessExpenseCategory, number>);
  };
  
  return {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesForRange,
    getTotalsByCategory
  };
};

// Add Expense Modal
const AddBusinessExpenseModal = ({ 
  visible, 
  onDismiss, 
  onSubmit 
}: { 
  visible: boolean; 
  onDismiss: () => void; 
  onSubmit: (expense: Omit<BusinessExpense, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) => {
  const [category, setCategory] = useState<BusinessExpenseCategory>('Fuel');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const resetForm = () => {
    setCategory('Fuel');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };
  
  const handleSubmit = () => {
    if (!description.trim() || !amount || isNaN(parseFloat(amount)) || !date) {
      Alert.alert('Please fill required fields', 'Description, amount, and date are required');
      return;
    }
    
    onSubmit({
      category,
      description: description.trim(),
      amount: parseFloat(amount),
      date: `${date}T12:00:00.000Z`, // Use noon to avoid timezone issues
      notes: notes.trim() || undefined
    });
    
    resetForm();
    onDismiss();
  };
  
  // List of expense categories
  const categories: BusinessExpenseCategory[] = [
    'Fuel', 'Food', 'Supplies', 'Maintenance', 'Tools', 
    'Office', 'Marketing', 'Insurance', 'Tax', 'Employee', 'Other'
  ];
  
  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
      <Card style={styles.modalCard}>
        <Card.Title title="Add Business Expense" />
        <Card.Content>
          <ScrollView style={styles.categoryScrollView} horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <Chip
                key={cat}
                selected={category === cat}
                onPress={() => setCategory(cat)}
                style={styles.categoryChip}
                selectedColor="#2196F3"
              >
                {cat}
              </Chip>
            ))}
          </ScrollView>
          
          <TextInput
            label="Description *"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Amount ($) *"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Date (YYYY-MM-DD) *"
            value={date}
            onChangeText={setDate}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Notes (Optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.input}
            mode="outlined"
          />
          
          <View style={styles.modalActions}>
            <Button onPress={onDismiss} style={styles.modalButton}>Cancel</Button>
            <Button mode="contained" onPress={handleSubmit} style={styles.modalButton}>Add Expense</Button>
          </View>
        </Card.Content>
      </Card>
    </Modal>
  );
};

export default function BusinessExpensesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { 
    expenses, 
    addExpense, 
    deleteExpense, 
    getExpensesForRange, 
    getTotalsByCategory 
  } = useBusinessExpenses();
  
  // Only owners should access this screen
  const isOwner = user?.role === 'owner';
  
  // State for the screen
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BusinessExpenseCategory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Calculate month range
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Format month for display
  const monthText = format(currentDate, 'MMMM yyyy');
  
  // Get expenses for the current month
  const monthlyExpenses = getExpensesForRange(
    monthStart.toISOString(),
    monthEnd.toISOString()
  );
  
  // Filter expenses based on search and category
  const filteredExpenses = monthlyExpenses.filter(expense => {
    const matchesSearch = !searchQuery || 
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = !selectedCategory || expense.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Calculate totals by category
  const categoryTotals = getTotalsByCategory(
    monthStart.toISOString(),
    monthEnd.toISOString()
  );
  
  // Calculate total expenses
  const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
  
  // Sort categories by total amount (descending)
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, amountA], [, amountB]) => amountB - amountA)
    .map(([category]) => category);
  
  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };
  
  // Handle adding a business expense
  const handleAddExpense = async (expenseData: Omit<BusinessExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addExpense(expenseData);
      Alert.alert('Success', 'Business expense added successfully');
    } catch (error) {
      console.error('Error adding business expense:', error);
      Alert.alert('Error', 'Failed to add business expense');
    }
  };
  // For editing a business expense
      const handleEditBusinessExpense = (expenseId: string) => {
        navigation.navigate('AddExpense', {
          expenseId: expenseId,
          mode: 'business'
        });
      };
  // Handle deleting a business expense
  const handleDeleteExpense = (id: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(id);
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          }
        }
      ]
    );
  };
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // If not an owner, show restricted access message
  if (!isOwner) {
    return (
      <View style={styles.restrictedContainer}>
        <Title>Restricted Access</Title>
        <Paragraph>This section is only available to owners.</Paragraph>
        <Button mode="contained" onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Month selector */}
      <View style={styles.monthSelector}>
        <Button icon="chevron-left" onPress={goToPreviousMonth} mode="text">
          Prev
        </Button>
        <Button onPress={goToCurrentMonth} mode="text">
          Today
        </Button>
        <Button icon="chevron-right" onPress={goToNextMonth} mode="text" contentStyle={{ flexDirection: 'row-reverse' }}>
          Next
        </Button>
      </View>
      
      <Title style={styles.monthTitle}>{monthText}</Title>
      
      {/* Search and filter */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search expenses..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>
      
      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterContainer}>
        <Chip
          selected={selectedCategory === null}
          onPress={() => setSelectedCategory(null)}
          style={styles.filterChip}
        >
          All
        </Chip>
        {sortedCategories.map(category => (
          <Chip
            key={category}
            selected={selectedCategory === category}
            onPress={() => setSelectedCategory(category as BusinessExpenseCategory)}
            style={[
              styles.filterChip,
              { borderColor: getCategoryColor(category as BusinessExpenseCategory) }
            ]}
          >
            {category}
          </Chip>
        ))}
      </ScrollView>
      
      {/* Monthly summary card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title>Monthly Summary</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Paragraph style={styles.totalLabel}>Total Business Expenses:</Paragraph>
            <Paragraph style={styles.totalAmount}>{formatCurrency(totalExpenses)}</Paragraph>
          </View>
          
          {sortedCategories.length > 0 && (
            <>
              <Title style={styles.categoryBreakdownTitle}>By Category</Title>
              
              {sortedCategories.map(category => {
                const amount = categoryTotals[category as BusinessExpenseCategory] || 0;
                const percentage = totalExpenses > 0 
                  ? ((amount / totalExpenses) * 100).toFixed(1) 
                  : '0';
                
                return (
                  <View key={category} style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
                      <View style={[
                        styles.categoryIndicator, 
                        { backgroundColor: getCategoryColor(category as BusinessExpenseCategory) }
                      ]} />
                      <Paragraph>{category}</Paragraph>
                    </View>
                    <View style={styles.categoryAmounts}>
                      <Paragraph style={styles.categoryAmount}>{formatCurrency(amount)}</Paragraph>
                      <Paragraph style={styles.categoryPercentage}>{percentage}%</Paragraph>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* Expense list */}
      <Title style={styles.expensesTitle}>Expenses ({filteredExpenses.length})</Title>
      
      {filteredExpenses.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Paragraph style={styles.emptyText}>
              {searchQuery || selectedCategory 
                ? 'No expenses match your filters' 
                : 'No expenses recorded for this month'}
            </Paragraph>
            <Button 
              mode="contained" 
              icon="plus" 
              onPress={() => setShowAddModal(true)}
              style={styles.addButton}
            >
              Add Business Expense
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.expenseCard}>
              <Card.Content>
                <View style={styles.expenseHeader}>
                  <View style={styles.expenseTitleContainer}>
                    <Chip 
                      style={[
                        styles.categoryChip,
                        { backgroundColor: getCategoryColor(item.category) + '20' }
                      ]}
                      textStyle={{ color: getCategoryColor(item.category) }}
                    >
                      {item.category}
                    </Chip>
                    <Title style={styles.expenseTitle}>{item.description}</Title>
                  </View>
                  <Menu
                    visible={item.menuVisible}
                    onDismiss={() => {
                      const updatedExpenses = expenses.map(e => 
                        e.id === item.id ? { ...e, menuVisible: false } : e
                      );
                      setExpenses(updatedExpenses);
                    }}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        onPress={() => {
                          const updatedExpenses = expenses.map(e => 
                            e.id === item.id ? { ...e, menuVisible: true } : e
                          );
                          setExpenses(updatedExpenses);
                        }}
                      />
                    }
                  >
                    <Menu.Item 
                      onPress={() => {
                        navigation.navigate('EditBusinessExpense', { expenseId: item.id });
                      }} 
                      title="Edit" 
                      icon="pencil" 
                    />
                    <Menu.Item 
                      onPress={() => handleDeleteExpense(item.id)} 
                      title="Delete" 
                      icon="delete" 
                    />
                  </Menu>
                </View>
                
                <View style={styles.expenseDetails}>
                  <View style={styles.expenseInfoRow}>
                    <Text style={styles.expenseLabel}>Date:</Text>
                    <Text>{format(parseISO(item.date), 'MMM d, yyyy')}</Text>
                  </View>
                  
                  <View style={styles.expenseInfoRow}>
                    <Text style={styles.expenseLabel}>Amount:</Text>
                    <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                  
                  {item.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.expenseLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{item.notes}</Text>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      {/* Button or FAB for adding business expense*/}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddExpense', {
          mode: 'business'
        })}
        label="Add Expense"
      />
      
      {/* Add expense modal */}
      <AddBusinessExpenseModal
        visible={showAddModal}
        onDismiss={() => setShowAddModal(false)}
        onSubmit={handleAddExpense}
      />
    </View>
  );
}

// Helper function to get a color for category
const getCategoryColor = (category: BusinessExpenseCategory): string => {
  switch (category) {
    case 'Fuel':
      return '#FF9800'; // Orange
    case 'Food':
      return '#4CAF50'; // Green
    case 'Supplies':
      return '#2196F3'; // Blue
    case 'Maintenance':
      return '#9C27B0'; // Purple
    case 'Tools':
      return '#F44336'; // Red
    case 'Office':
      return '#607D8B'; // Blue Gray
    case 'Marketing':
      return '#00BCD4'; // Cyan
    case 'Insurance':
      return '#795548'; // Brown
    case 'Tax':
      return '#FF5722'; // Deep Orange
    case 'Employee':
      return '#009688'; // Teal
    case 'Other':
    default:
      return '#9E9E9E'; // Gray
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  monthTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
  },
  categoryFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#F44336', // Red for expenses
  },
  categoryBreakdownTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontWeight: 'bold',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#757575',
  },
  expensesTitle: {
    marginHorizontal: 16,
    marginBottom: 8,
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
    paddingTop: 0,
    paddingBottom: 80, // Extra space for FAB
  },
  expenseCard: {
    marginBottom: 16,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseTitleContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  expenseTitle: {
    fontSize: 16,
    marginTop: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
  expenseDetails: {
    marginTop: 12,
  },
  expenseInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  expenseLabel: {
    fontWeight: 'bold',
    color: '#757575',
  },
  expenseAmount: {
    fontWeight: 'bold',
  },
  notesContainer: {
    marginTop: 8,
  },
  notesText: {
    fontStyle: 'italic',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
  // Modal styles
  modalContainer: {
    margin: 20,
  },
  modalCard: {
    padding: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    marginLeft: 8,
  },
  input: {
    marginBottom: 12,
  },
  categoryScrollView: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
});