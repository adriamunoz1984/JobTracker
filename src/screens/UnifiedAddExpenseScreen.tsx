import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { TextInput, Button, Switch, Text, SegmentedButtons, Chip, IconButton, Portal, Dialog, FAB, Card, Title } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { useExpenses } from '../context/ExpensesContext';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { 
  Expense, 
  ExpenseCategory, 
  RecurrenceType, 
  JobExpense, 
  JobExpenseCategory,
  BusinessExpense,
  BusinessExpenseCategory 
} from '../types';

// Define expense modes
type ExpenseMode = 'bill' | 'job' | 'business' | 'personal';

export default function UnifiedAddExpenseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addExpense, updateExpense, getExpenseById } = useExpenses();
  const { getJobById, updateJob } = useJobs();
  const { user } = useAuth();
  
  // Get params from route
  const params = route.params || {};
  const editExpenseId = params.expenseId as string | undefined;
  const jobId = params.jobId as string | undefined;
  const initialMode = params.mode as ExpenseMode || 'bill';
  
  // Get job details if jobId is provided
  const job = jobId ? getJobById(jobId) : undefined;
  
  const [isEditMode, setIsEditMode] = useState(!!editExpenseId);
  const [existingExpense, setExistingExpense] = useState<any>(undefined);
  const [mode, setMode] = useState<ExpenseMode>(initialMode);
  
  // Determine if user is owner
  const isOwner = user?.role === 'owner';
  
  // Shared form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(job ? new Date(job.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Bill-specific state
  const [isPaid, setIsPaid] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Fixed');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('Monthly');
  const [isBusinessExpense, setIsBusinessExpense] = useState(false);
  
  // Job expense state
  const [jobExpenseCategory, setJobExpenseCategory] = useState<JobExpenseCategory>('Fuel');
  
  // Business expense state
  const [businessCategory, setBusinessCategory] = useState<BusinessExpenseCategory>('Fuel');
  
  // Category UI state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Load existing expense data if in edit mode
  useEffect(() => {
    if (editExpenseId) {
      const expense = getExpenseById(editExpenseId);
      if (expense) {
        setExistingExpense(expense);
        
        // Set common fields
        setDescription(expense.name || expense.description || '');
        setAmount(expense.amount.toString());
        setExpenseDate(new Date(expense.date || expense.dueDate || new Date()));
        setNotes(expense.notes || '');
        
        // Detect and set mode
        if (expense.recurrence && expense.recurrence !== 'OneTime') {
          setMode('bill');
          setIsPaid(expense.isPaid || false);
          setCategory(expense.category || 'Fixed');
          setRecurrence(expense.recurrence);
          setIsBusinessExpense(expense.isBusinessExpense || false);
        } else if (expense.jobId) {
          setMode('job');
          setJobExpenseCategory(expense.category || 'Other');
        } else if (expense.isDailyExpense) {
          setMode('personal');
        } else {
          setMode('business');
          setBusinessCategory(expense.category || 'Other');
        }
      }
    } else if (jobId) {
      // New expense for a specific job
      setMode('job');
    }
  }, [editExpenseId, jobId, getExpenseById]);
  
  // Date picker handling
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || expenseDate;
    setShowDatePicker(Platform.OS === 'ios');
    setExpenseDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };
  
  // Get display name for the mode
  const getModeDisplayName = (): string => {
    switch (mode) {
      case 'bill': return 'Bill/Recurring Expense';
      case 'job': return 'Job Expense';
      case 'business': return 'Business Expense';
      case 'personal': return 'Personal Expense';
      default: return 'Expense';
    }
  };
  
  // Handle submit based on mode
  const handleSubmit = async () => {
    // Validate required fields
    if ((!description.trim() && mode !== 'bill') || !amount || isNaN(parseFloat(amount))) {
      Alert.alert('Please fill all required fields', 'Description/name and amount are required.');
      return;
    }
    
    try {
      if (mode === 'bill') {
        // Handle bill submission
        const billData = {
          name: description.trim() || 'Unnamed Bill',
          amount: parseFloat(amount),
          dueDate: expenseDate.toISOString(),
          isPaid,
          category,
          recurrence,
          notes: notes.trim() || undefined,
          isBusinessExpense: isOwner ? isBusinessExpense : false,
        };
        
        if (isEditMode && existingExpense) {
          await updateExpense({
            ...existingExpense,
            ...billData
          });
        } else {
          await addExpense(billData);
        }
      } 
      else if (mode === 'job' && jobId) {
        // Handle job expense submission
        const jobExpenseData: Omit<JobExpense, 'id' | 'createdAt' | 'updatedAt'> = {
          category: jobExpenseCategory,
          description: description.trim(),
          amount: parseFloat(amount),
          date: expenseDate.toISOString(),
          notes: notes.trim() || undefined
        };
        
        // Get the job and update its expenses
        const jobToUpdate = getJobById(jobId);
        if (jobToUpdate) {
          const now = new Date().toISOString();
          const newExpense: JobExpense = {
            ...jobExpenseData,
            id: `jexp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            createdAt: now,
            updatedAt: now,
          };
          
          const updatedExpenses = [...(jobToUpdate.expenses || [])];
          
          if (isEditMode && existingExpense) {
            // Update existing expense
            const expenseIndex = updatedExpenses.findIndex(exp => exp.id === existingExpense.id);
            if (expenseIndex !== -1) {
              updatedExpenses[expenseIndex] = {
                ...newExpense,
                id: existingExpense.id,
                createdAt: existingExpense.createdAt,
              };
            }
          } else {
            // Add new expense
            updatedExpenses.push(newExpense);
          }
          
          const updatedJob = {
            ...jobToUpdate,
            expenses: updatedExpenses
          };
          
          await updateJob(updatedJob);
        }
      }
      else if (mode === 'business') {
        // Handle business expense submission
        // This would connect to your business expenses context/API
        // For now, we'll show a placeholder
        Alert.alert('Business Expense Added', 'This would be saved to your business expenses.');
      }
      else if (mode === 'personal') {
        // Handle personal expense submission
        // This would connect to your personal expenses context/API
        // For now, we'll show a placeholder
        Alert.alert('Personal Expense Added', 'This would be saved to your personal expenses.');
      }
      
      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense. Please try again.');
    }
  };
  
  // Category options by type
  const jobCategories: JobExpenseCategory[] = ['Fuel', 'Food', 'Materials', 'Equipment', 'Labor', 'Repairs', 'Other'];
  const businessCategories: BusinessExpenseCategory[] = [
    'Fuel', 'Food', 'Supplies', 'Maintenance', 'Tools', 
    'Office', 'Marketing', 'Insurance', 'Tax', 'Employee', 'Other'
  ];
  
  // Mode selection buttons (only show if not editing and not tied to a job)
  const renderModeSelector = () => {
    if (isEditMode || jobId) return null;
    
    return (
      <View style={styles.modeContainer}>
        <Text style={styles.modeLabel}>Expense Type:</Text>
        <SegmentedButtons
          value={mode}
          onValueChange={(value) => setMode(value as ExpenseMode)}
          buttons={[
            { value: 'bill', label: 'Bill' },
            { value: 'job', label: 'Job' },
            { value: 'business', label: 'Business', disabled: !isOwner },
          ]}
          style={styles.modeButtons}
        />
      </View>
    );
  };
  
  // Render form fields based on mode
  const renderFormFields = () => {
    // Common fields for all modes
    const commonFields = (
      <>
        <TextInput
          label={mode === 'bill' ? "Bill Name" : "Description"}
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          mode="outlined"
        />
        
        <TextInput
          label="Amount ($)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          mode="outlined"
        />
        
        {/* Date field */}
        <Text style={styles.dateLabel}>
          {mode === 'bill' ? 'Due Date:' : 'Date:'} {format(expenseDate, 'MMMM dd, yyyy')}
        </Text>
        
        {!job && (
          <Button
            mode="outlined"
            onPress={showDatepicker}
            style={styles.dateButton}
            icon="calendar"
          >
            Select {mode === 'bill' ? 'Due Date' : 'Date'}
          </Button>
        )}
        
        {showDatePicker && (
          <DateTimePicker
            value={expenseDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}
      </>
    );
    
    // Bill-specific fields
    if (mode === 'bill') {
      return (
        <>
          {commonFields}
          
          {/* Paid Status */}
          <View style={styles.switchContainer}>
            <Text>Already Paid</Text>
            <Switch value={isPaid} onValueChange={setIsPaid} />
          </View>
          
          {/* Business Expense Option (owner only) */}
          {isOwner && (
            <View style={styles.switchContainer}>
              <Text>Count as Business Expense</Text>
              <Switch value={isBusinessExpense} onValueChange={setIsBusinessExpense} />
            </View>
          )}
          
          {/* Recurrence */}
          <Text style={styles.sectionLabel}>Recurrence</Text>
          <SegmentedButtons
            value={recurrence}
            onValueChange={(value) => setRecurrence(value as RecurrenceType)}
            buttons={[
              { value: 'Monthly', label: 'Monthly' },
              { value: 'Quarterly', label: 'Quarterly' },
              { value: 'Yearly', label: 'Yearly' },
            ]}
            style={styles.segmentedButtons}
          />
        </>
      );
    }
    
    // Job expense specific fields
    if (mode === 'job') {
      return (
        <>
          {commonFields}
          
          {/* Job expense categories */}
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
            {jobCategories.map((cat) => (
              <Chip
                key={cat}
                selected={jobExpenseCategory === cat}
                onPress={() => setJobExpenseCategory(cat)}
                style={styles.categoryChip}
              >
                {cat}
              </Chip>
            ))}
          </ScrollView>
        </>
      );
    }
    
    // Business expense specific fields
    if (mode === 'business') {
      return (
        <>
          {commonFields}
          
          {/* Business expense categories */}
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
            {businessCategories.map((cat) => (
              <Chip
                key={cat}
                selected={businessCategory === cat}
                onPress={() => setBusinessCategory(cat)}
                style={styles.categoryChip}
              >
                {cat}
              </Chip>
            ))}
          </ScrollView>
        </>
      );
    }
    
    // Default (personal expense)
    return commonFields;
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title>{isEditMode ? `Edit ${getModeDisplayName()}` : `Add ${getModeDisplayName()}`}</Title>
          {job && (
            <Text style={styles.jobInfo}>For job: {job.companyName || job.address}</Text>
          )}
        </Card.Content>
      </Card>
      
      <View style={styles.formContainer}>
        {/* Mode selector */}
        {renderModeSelector()}
        
        {/* Form fields based on mode */}
        {renderFormFields()}
        
        {/* Notes field (common to all modes) */}
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
          {isEditMode ? 'Update' : 'Save'} {getModeDisplayName()}
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
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  jobInfo: {
    fontStyle: 'italic',
    marginTop: 8,
    color: '#666',
  },
  formContainer: {
    padding: 16,
  },
  modeContainer: {
    marginBottom: 16,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modeButtons: {
    marginBottom: 16,
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
  categoryContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
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