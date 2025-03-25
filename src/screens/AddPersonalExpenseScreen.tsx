// src/screens/AddPersonalExpenseScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Text, Chip, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { usePersonalExpenses } from '../context/PersonalExpensesContext';
import { useJobs } from '../context/JobsContext';
import { PersonalExpenseCategory, PersonalExpense } from '../types';

export default function AddPersonalExpenseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addExpense, updateExpense, getExpenseById } = usePersonalExpenses();
  const { jobs } = useJobs();
  
  // Check if we're editing an existing expense
  const editExpenseId = route.params?.expenseId as string | undefined;
  const [isEditMode, setIsEditMode] = useState(!!editExpenseId);
  const [existingExpense, setExistingExpense] = useState<PersonalExpense | undefined>(undefined);
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState<PersonalExpenseCategory>('Gas');
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [showJobSelection, setShowJobSelection] = useState(false);
  
  // Load existing expense data if in edit mode
  useEffect(() => {
    if (editExpenseId) {
      const expense = getExpenseById(editExpenseId);
      if (expense) {
        setExistingExpense(expense);
        setDescription(expense.description);
        setAmount(expense.amount.toString());
        setDate(new Date(expense.date));
        setCategory(expense.category);
        setJobId(expense.jobId);
      }
    }
  }, [editExpenseId, getExpenseById]);
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };
  
  // Category color mapping
  const getCategoryColor = (cat: PersonalExpenseCategory) => {
    switch (cat) {
      case 'Gas': return '#FF9800'; // Orange
      case 'Food': return '#4CAF50'; // Green
      case 'Water': return '#2196F3'; // Blue
      case 'Entertainment': return '#9C27B0'; // Purple
      case 'Supplies': return '#F44336'; // Red
      case 'Tools': return '#795548'; // Brown
      case 'Repairs': return '#607D8B'; // Blue Grey
      case 'Other': return '#9E9E9E'; // Grey
      default: return '#9E9E9E';
    }
  };
  
  const handleSubmit = async () => {
    // Validate required fields
    if (!description.trim() || !amount || isNaN(parseFloat(amount))) {
      alert('Please enter a valid description and amount.');
      return;
    }
    
    try {
      const expenseData = {
        description: description.trim(),
        amount: parseFloat(amount),
        date: date.toISOString(),
        category,
        jobId: jobId || undefined,
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
  
  // Filter jobs for today or selected date only
  const jobsForSelectedDate = jobs.filter(job => {
    const jobDate = new Date(job.date);
    const selectedDate = new Date(date);
    
    return (
      jobDate.getFullYear() === selectedDate.getFullYear() &&
      jobDate.getMonth() === selectedDate.getMonth() &&
      jobDate.getDate() === selectedDate.getDate()
    );
  });
  
  // Render selected job info
  const renderSelectedJob = () => {
    if (!jobId) return null;
    
    const job = jobs.find(j => j.id === jobId);
    if (!job) return null;
    
    return (
      <View style={styles.selectedJobContainer}>
        <Text style={styles.jobLabel}>Related Job:</Text>
        <View style={styles.selectedJob}>
          <Text style={styles.jobText}>
            {job.companyName || 'Unnamed Job'} - ${job.amount}
          </Text>
          <Button 
            mode="text" 
            compact 
            icon="close" 
            onPress={() => setJobId(undefined)}
            style={styles.clearJobButton}
          >
            Clear
          </Button>
        </View>
      </View>
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        {/* Description Input */}
        <TextInput
          label="Description *"
          value