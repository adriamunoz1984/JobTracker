import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Chip, IconButton, Text } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { format, isValid } from 'date-fns'; // Added isValid import

import { useExpenses } from '../context/ExpensesContext';
import { Expense } from '../types';

type RouteParams = {
  expenseId: string;
};

export default function ExpenseDetailScreen() {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation();
  const { getExpenseById, markAsPaid, markAsUnpaid, deleteExpense } = useExpenses();
  
  const [expense, setExpense] = useState<Expense | undefined>(undefined);
  
  const { expenseId } = route.params || {};
  
  useEffect(() => {
    if (expenseId) {
      const expenseData = getExpenseById(expenseId);
      setExpense(expenseData);
    }
  }, [expenseId, getExpenseById]);
  
  // Safe date formatter function
  const formatDateSafely = (dateString: string | undefined, formatString: string = 'MMMM dd, yyyy'): string => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (!isValid(date)) {
        console.warn('Invalid date encountered:', dateString);
        return 'Invalid date';
      }
      return format(date, formatString);
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Error with date';
    }
  };
  
  // Safe function to get Date object
  const getValidDate = (dateString: string | undefined): Date | null => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return isValid(date) ? date : null;
    } catch (error) {
      console.error('Error creating date from string:', error, dateString);
      return null;
    }
  };
  
  // Handle edit expense
  const handleEdit = () => {
    if (expense) {
      navigation.navigate('AddExpense' as never, { expenseId: expense.id } as never);
    }
  };
  
  // Handle toggle payment status
  const handleTogglePayment = async () => {
    if (!expense) return;
    
    try {
      if (expense.isPaid) {
        await markAsUnpaid(expense.id);
      } else {
        await markAsPaid(expense.id);
      }
      
      // Refresh expense data
      const updatedExpense = getExpenseById(expense.id);
      setExpense(updatedExpense);
    } catch (error) {
      console.error('Error toggling payment status:', error);
      Alert.alert('Error', 'Failed to update payment status.');
    }
  };
  
  // Handle delete expense
  const handleDelete = () => {
    if (!expense) return;
    
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete ${expense.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense.');
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
  
  if (!expense) {
    return (
      <View style={styles.centered}>
        <Paragraph>Expense not found</Paragraph>
      </View>
    );
  }
  
  const formattedDueDate = formatDateSafely(expense.dueDate);
  const formattedCreatedDate = formatDateSafely(expense.createdAt);
  
  // Get status indicator color
  const getStatusColor = () => {
    if (expense.isPaid) return '#4CAF50'; // Green for paid
    
    const now = new Date();
    const dueDate = getValidDate(expense.dueDate);
    
    // If no valid due date, return default
    if (!dueDate) return '#607D8B'; // Grey for unknown
    
    if (dueDate < now) return '#F44336'; // Red for overdue
    
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff <= 7) return '#FF9800'; // Orange for due soon
    return '#2196F3'; // Blue for upcoming
  };
  
  // Get status label
  const getStatusLabel = () => {
    if (expense.isPaid) return 'PAID';
    
    const now = new Date();
    const dueDate = getValidDate(expense.dueDate);
    
    // If no valid due date, return default
    if (!dueDate) return 'UNKNOWN STATUS';
    
    if (dueDate < now) return 'OVERDUE';
    
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysDiff === 0) return 'DUE TODAY';
    if (daysDiff === 1) return 'DUE TOMORROW';
    if (daysDiff <= 7) return `DUE IN ${daysDiff} DAYS`;
    
    return 'UPCOMING';
  };
  
  const statusColor = getStatusColor();
  const statusLabel = getStatusLabel();
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
    <Title 
      numberOfLines={1}
      ellipsizeMode="tail"
      style={styles.title}
    >
      {expense.name}
    </Title>
    <Chip
      mode="outlined"
      textStyle={{ color: statusColor, fontWeight: 'bold' }}
      style={{ backgroundColor: `${statusColor}10`, borderColor: statusColor }}
    >
      {statusLabel}
    </Chip>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Due Date:</Text>
            <Text>{formattedDueDate}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Recurrence:</Text>
            <Text>{expense.recurrence || 'One-time'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Category:</Text>
            <Chip
              mode="outlined"
              style={[styles.categoryChip, getCategoryStyle(expense.category)]}
              textStyle={{ color: getCategoryColor(expense.category) }}
            >
              {expense.category || 'Other'}
            </Chip>
          </View>
          
          {expense.isPaid && expense.paidDate && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Paid On:</Text>
              <Text>{formatDateSafely(expense.paidDate)}</Text>
            </View>
          )}
          
          <Divider style={styles.divider} />
          
          {expense.notes ? (
            <>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Paragraph style={styles.notes}>{expense.notes}</Paragraph>
            </>
          ) : (
            <Paragraph style={styles.noNotes}>No notes added</Paragraph>
          )}
          
          <Divider style={styles.divider} />
          
          <Text style={styles.metaData}>
            Created: {formattedCreatedDate}
          </Text>
        </Card.Content>
      </Card>
      
      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={handleTogglePayment}
          style={expense.isPaid ? styles.markUnpaidButton : styles.markPaidButton}
          icon={expense.isPaid ? 'close' : 'check'}
        >
          {expense.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
        </Button>
        
        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleEdit}
            style={styles.editButton}
            icon="pencil"
          >
            Edit
          </Button>
          
          <Button
            mode="outlined"
            onPress={handleDelete}
            style={styles.deleteButton}
            icon="delete"
          >
            Delete
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

// Helper function to get category color
const getCategoryColor = (category: string = 'Other') => {
  switch (category) {
    case 'Fixed':
      return '#4CAF50'; // Green
    case 'Variable':
      return '#FF9800'; // Orange
    case 'Business':
      return '#9C27B0'; // Purple
    case 'Personal':
      return '#E91E63'; // Pink
    case 'Other':
    default:
      return '#607D8B'; // Blue Grey
  }
};

// Helper function to get category chip style
const getCategoryStyle = (category: string = 'Other') => {
  const color = getCategoryColor(category);
  return {
    borderColor: color,
    backgroundColor: `${color}10`,
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseTitle: {
    flex: 1,
    marginRight: 10, // Add space between the title and the status chip
    maxWidth: '70%',  // Limit the title width to 70% of the container
  },
  
  title: {
    flex: 1,
    marginRight: 8,
    maxWidth: '70%', // Limit title width
  },
  divider: {
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontWeight: 'bold',
    width: 100,
  },
  amount: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  categoryChip: {
    height: 28,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
  },
  notes: {
    marginBottom: 8,
  },
  noNotes: {
    fontStyle: 'italic',
    color: '#757575',
  },
  metaData: {
    fontStyle: 'italic',
    fontSize: 12,
    color: '#757575',
  },
  actionsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  markPaidButton: {
    marginBottom: 16,
    backgroundColor: '#4CAF50',
  },
  markUnpaidButton: {
    marginBottom: 16,
    backgroundColor: '#F44336',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#2196F3',
  },
  deleteButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: '#F44336',
    color: '#F44336',
  },
});