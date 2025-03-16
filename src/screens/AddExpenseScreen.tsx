import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Modal } from 'react-native';
import { TextInput, Button, Switch, Text, SegmentedButtons, Menu, Divider, Chip, IconButton, Portal, Dialog, FAB } from 'react-native-paper';
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
  const [recurrence, setRecurrence] = useState<RecurrenceType>('Monthly');
  const [notes, setNotes] = useState('');
  
  // Category UI state
  const [showCategories, setShowCategories] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Category options - we'll store these in state so we can add to them
  const [categories, setCategories] = useState<Array<{ value: ExpenseCategory; label: string; icon: string; color: string }>>([
    { value: 'Fixed', label: 'Fixed', icon: 'lock', color: '#4CAF50' },
    { value: 'Variable', label: 'Variable', icon: 'currency-usd', color: '#FF9800' },
    { value: 'Business', label: 'Business', icon: 'briefcase', color: '#9C27B0' },
    { value: 'Personal', label: 'Personal', icon: 'account', color: '#E91E63' },
    { value: 'Other', label: 'Other', icon: 'dots-horizontal', color: '#607D8B' }
  ]);
  
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
  
  // Get color for selected category
  const getCategoryColor = (categoryValue: ExpenseCategory) => {
    return categories.find(cat => cat.value === categoryValue)?.color || '#607D8B';
  };
  
  // Find the current category object
  const currentCategory = categories.find(cat => cat.value === category);
  
  // Add a new custom category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }
    
    // Create a new category with a random color and the tag icon
    const newCatValue = newCategoryName.trim() as ExpenseCategory;
    const newCategory = {
      value: newCatValue,
      label: newCategoryName.trim(),
      icon: 'tag',
      color: `#${Math.floor(Math.random()*16777215).toString(16)}` // Random color
    };
    
    setCategories([...categories, newCategory]);
    setCategory(newCatValue);
    setNewCategoryName('');
    setShowAddCategoryDialog(false);
    setShowCategories(true); // Keep categories visible
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
        
        {/* Category Selection Button */}
        <Text style={styles.sectionLabel}>Category</Text>
        <Button
          mode="outlined"
          onPress={() => setShowCategories(!showCategories)}
          style={[
            styles.categoryButton,
            { borderColor: getCategoryColor(category) }
          ]}
          icon={() => (
            <View style={[
              styles.categoryDot,
              { backgroundColor: getCategoryColor(category) }
            ]} />
          )}
          contentStyle={{ justifyContent: 'flex-start' }}
        >
          {currentCategory?.label || category}
        </Button>
        
        {/* Collapsible Category Selection */}
        {showCategories && (
          <View style={styles.categoriesContainer}>
            <View style={styles.categoryChipsContainer}>
              {categories.map((cat) => (
                <Chip
                  key={cat.value}
                  selected={category === cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: category === cat.value 
                        ? `${cat.color}20` // 20% opacity
                        : '#f0f0f0',
                      borderColor: category === cat.value ? cat.color : '#e0e0e0'
                    }
                  ]}
                  icon={cat.icon}
                  textStyle={{ 
                    color: category === cat.value ? cat.color : '#757575',
                    fontWeight: category === cat.value ? 'bold' : 'normal'
                  }}
                >
                  {cat.label}
                </Chip>
              ))}
            </View>
            
            <FAB
              style={styles.addCategoryButton}
              small
              icon="plus"
              label="Add Category"
              onPress={() => setShowAddCategoryDialog(true)}
            />
          </View>
        )}
        
        {/* Add Category Dialog */}
        <Portal>
          <Dialog visible={showAddCategoryDialog} onDismiss={() => setShowAddCategoryDialog(false)}>
            <Dialog.Title>Add New Category</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Category Name"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                mode="outlined"
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowAddCategoryDialog(false)}>Cancel</Button>
              <Button onPress={handleAddCategory}>Add</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
        
        <Divider style={styles.divider} />
        
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
          style={[styles.submitButton, { backgroundColor: getCategoryColor(category) }]}
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
    marginBottom: 12,
    fontWeight: 'bold',
  },
  categoryButton: {
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoriesContainer: {
    marginBottom: 16,
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
  addCategoryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#607D8B',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 8,
  },
});