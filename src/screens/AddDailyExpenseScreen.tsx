import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Text, Chip, SegmentedButtons, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { useExpenses } from '../context/ExpensesContext';
import { ExpenseCategory } from '../types';

export default function AddDailyExpenseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addExpense, updateExpense, getExpenseById } = useExpenses();
  
  // Check if we're editing an existing expense
  const editExpenseId = route.params?.expenseId as string | undefined;
  const [isEditMode, setIsEditMode] = useState(!!editExpenseId);
  const [existingExpense, setExistingExpense] = useState<any>(undefined);
  
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Daily');
  const [notes, setNotes] = useState('');
  
  // Load existing expense data if in edit mode
  useEffect(() => {
    if (editExpenseId) {
      const expense = getExpenseById(editExpenseId);
      if (expense && expense.isDailyExpense) {
        setExistingExpense(expense);
        setName(expense.name);
        setAmount(expense.amount.toString());
        setExpenseDate(new Date(expense.expenseDate || expense.dueDate));
        setCategory(expense.category);
        setNotes(expense.notes || '');
      }
    }
  }, [editExpenseId, getExpenseById]);
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || expenseDate;
    setShowDatePicker(Platform.OS === 'ios');
    setExpenseDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };
  
  const handleSubmit = async () => {
    // Validate required fields
    if (!name.trim() || !amount || isNaN(parseFloat(amount))) {
      alert('Please enter a valid name and amount.');
      return;
    }
    
    try {
      const expenseData = {
        name: name.trim(),
        amount: parseFloat(amount),
        dueDate: expenseDate.toISOString(), // For compatibility
        expenseDate: expenseDate.toISOString(), // When the expense occurred
        isPaid: true, // Daily expenses are considered paid immediately
        paidDate: new Date().toISOString(),
        category,
        recurrence: 'OneTime' as const,
        notes: notes.trim() || undefined,
        isDailyExpense: true,
        affectsEarnings: true, // Will be subtracted from earnings
      };
      
      if (isEditMode && existingExpense) {
        // Update existing expense
        await updateExpense({
          ...existingExpense,
          ...expenseData
        });
      } else {
        // Add new expense
        await addExpense(expenseData);
      }
      
      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error saving daily expense:', error);
      alert('Failed to save expense. Please try again.');
    }
  };
  
  // Pre-defined expense categories for daily tracking
  const expenseCategories = [
    { value: 'Gas', label: 'Gas' },
    { value: 'Food', label: 'Food' },
    { value: 'Water', label: 'Water' },
    { value: 'Daily', label: 'Other Daily' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Name and Amount */}
        <TextInput
          label="Expense Description *"
          value={name}
          onChangeText={setName}
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
        
        {/* Expense Date */}
        <Text style={styles.dateLabel}>Date: {format(expenseDate, 'MMMM dd, yyyy')}</Text>
        <Button
          mode="outlined"
          onPress={showDatepicker}
          style={styles.dateButton}
          icon="calendar"
        >
          Select Date
        </Button>
        
        {showDatePicker && (
          <DateTimePicker
            value={expenseDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}
        
        <Divider style={styles.divider} />
        
        {/* Category Selection */}
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.categoryChipsContainer}>
          {expenseCategories.map((cat) => (
            <Chip
              key={cat.value}
              selected={category === cat.value}
              onPress={() => setCategory(cat.value as ExpenseCategory)}
              style={[
                styles.categoryChip,
                category === cat.value && styles.selectedCategoryChip
              ]}
            >
              {cat.label}
            </Chip>
          ))}
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Notes */}
        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          style={styles.input}
          mode="outlined"
          multiline
          numberOfLines={3}
        />
        
        {/* Submit Button */}
        <Button 
          mode="contained" 
          onPress={handleSubmit} 
          style={styles.submitButton}
        >
          {isEditMode ? 'Update Expense' : 'Save Expense'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  dateLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  dateButton: {
    marginBottom: 16,
    borderColor: '#2196F3',
  },
  divider: {
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  categoryChip: {
    margin: 4,
    height: 36,
  },
  selectedCategoryChip: {
    backgroundColor: '#2196F380',
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
});