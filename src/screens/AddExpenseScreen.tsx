import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Switch, Text, SegmentedButtons, Menu, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { useExpenses } from '../context/ExpensesContext';
import { Expense, ExpenseCategory, RecurrenceType } from '../types';

export default function AddExpenseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addExpense, updateExpense, getExpenseById } = useExpenses();
  
  // Check if we're editing an existing expense
  const editExpenseId = route.params?.expenseId as string | undefined;
  const [isEditMode, setIsEditMode] = useState(!!editExpenseId);
  const [existingExpense, setExistingExpense] = useState<Expense | undefined>(undefined);
  
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Fixed');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('Monthly');
  const [notes, setNotes] = useState('');
  
  // Category options
  const categories: ExpenseCategory[] = ['Fixed', 'Variable', 'Business', 'Personal', 'Other'];
  
  // Load existing expense data if in edit mode
  useEffect(() => {
    if (editExpenseId) {
      const expense = getExpenseById(editExpenseId);
      if (expense) {
        setExistingExpense(expense);
        setName(expense.name);
        setAmount(expense.amount.toString());
        setDueDate(new Date(expense.dueDate));
        setIsPaid(expense.isPaid);
        setCategory(expense.category);
        setRecurrence(expense.recurrence);
        setNotes(expense.notes || '');
      }
    }
  }, [editExpenseId, getExpenseById]);
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dueDate;
    setShowDatePicker(Platform.OS === 'ios');
    setDueDate(currentDate);
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
        dueDate: dueDate.toISOString(),
        isPaid,
        category,
        recurrence,
        notes: notes.trim() || undefined,
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
      console.error('Error saving expense:', error);
      alert('Failed to save expense. Please try again.');
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Name and Amount */}
        <TextInput
          label="Expense Name *"
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
        
        {/* Due Date */}
        <Text style={styles.dateLabel}>Due Date: {format(dueDate, 'MMMM dd, yyyy')}</Text>
        <Button
          mode="outlined"
          onPress={showDatepicker}
          style={styles.dateButton}
          icon="calendar"
        >
          Select Due Date
        </Button>
        
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}
        
        {/* Paid Status */}
        <View style={styles.switchContainer}>
          <Text>Already Paid</Text>
          <Switch value={isPaid} onValueChange={setIsPaid} />
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Category */}
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.menuContainer}>
          <Button 
            mode="outlined" 
            onPress={() => setShowCategoryMenu(true)}
            style={styles.menuButton}
          >
            {category}
          </Button>
          
          <Menu
            visible={showCategoryMenu}
            onDismiss={() => setShowCategoryMenu(false)}
            anchor={<View />} // Empty view as anchor
            style={styles.menu}
          >
            {categories.map((cat) => (
              <Menu.Item
                key={cat}
                title={cat}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryMenu(false);
                }}
              />
            ))}
          </Menu>
        </View>
        
        {/* Recurrence */}
        <Text style={styles.sectionLabel}>Recurrence</Text>
        <SegmentedButtons
          value={recurrence}
          onValueChange={(value) => setRecurrence(value as RecurrenceType)}
          buttons={[
            { value: 'OneTime', label: 'One Time' },
            { value: 'Monthly', label: 'Monthly' },
            { value: 'Weekly', label: 'Weekly' },
          ]}
          style={styles.segmentedButtons}
        />
        
        {/* More recurrence options */}
        <SegmentedButtons
          value={recurrence}
          onValueChange={(value) => setRecurrence(value as RecurrenceType)}
          buttons={[
            { value: 'Biweekly', label: 'Biweekly' },
            { value: 'Quarterly', label: 'Quarterly' },
            { value: 'Yearly', label: 'Yearly' },
          ]}
          style={styles.segmentedButtons}
        />
        
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  menuContainer: {
    marginBottom: 16,
    zIndex: 1000,
  },
  menuButton: {
    marginBottom: 8,
  },
  menu: {
    minWidth: 200,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
});