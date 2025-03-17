import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Card, Title, Paragraph, Button, TextInput, Divider, List, Switch, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format } from 'date-fns';

import { useWeeklyGoals } from '../context/WeeklyGoalsContext';
import { useExpenses } from '../context/ExpensesContext';
import { WeeklyGoal, AllocatedBill } from '../types';

export default function SetWeeklyGoalScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addWeeklyGoal, updateWeeklyGoal, getCurrentWeekGoal } = useWeeklyGoals();
  
  // Refs to store initial date values
  const weekStartRef = useRef(null);
  const weekEndRef = useRef(null);
  
  // Initialize dates only once on component mount
  if (weekStartRef.current === null) {
    const weekStartParam = route.params?.weekStart as string | undefined;
    weekStartRef.current = weekStartParam ? new Date(weekStartParam) : new Date();
    
    weekEndRef.current = new Date(weekStartRef.current);
    weekEndRef.current.setDate(weekEndRef.current.getDate() + 6);
  }
  
  // Format dates for display (computed once from refs)
  const weekRangeText = `${format(weekStartRef.current, 'MMM d')} - ${format(weekEndRef.current, 'MMM d, yyyy')}`;
  
  // Single state object to reduce state updates
  const [formState, setFormState] = useState({
    isLoading: true,
    incomeTarget: '1500',
    allocatedBills: [] as AllocatedBill[],
    notes: '',
    isModified: false,
    existingGoal: null as WeeklyGoal | null
  });
  
  // Load data only once on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadGoal = async () => {
      try {
        if (!isMounted) return;
        
        // Convert dates to strings once
        const weekStartStr = weekStartRef.current.toISOString();
        const weekEndStr = weekEndRef.current.toISOString();
        
        // Get existing goal
        const existing = getCurrentWeekGoal(weekStartStr, weekEndStr);
        
        if (isMounted) {
          if (existing) {
            setFormState({
              isLoading: false,
              incomeTarget: existing.incomeTarget.toString(),
              allocatedBills: existing.allocatedBills || [],
              notes: existing.notes || '',
              isModified: false,
              existingGoal: existing
            });
          } else {
            setFormState({
              isLoading: false,
              incomeTarget: '1500',
              allocatedBills: [],
              notes: '',
              isModified: false,
              existingGoal: null
            });
          }
        }
      } catch (error) {
        console.error('Error loading weekly goal:', error);
        if (isMounted) {
          setFormState({
            isLoading: false,
            incomeTarget: '1500',
            allocatedBills: [],
            notes: '',
            isModified: false,
            existingGoal: null
          });
        }
      }
    };
    
    loadGoal();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount
  
  // Format currency for display
  const formatCurrency = (amount) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(value)) return '$0.00';
    
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Update form state in a way that doesn't trigger unnecessary re-renders
  const updateFormState = (updates) => {
    setFormState(current => ({
      ...current,
      ...updates,
      isModified: true
    }));
  };
  
  // Handle bill toggle
  const toggleBillAllocation = (index) => {
    if (!formState.allocatedBills || index >= formState.allocatedBills.length) return;
    
    const updatedBills = [...formState.allocatedBills];
    updatedBills[index] = {
      ...updatedBills[index],
      isComplete: !updatedBills[index].isComplete
    };
    
    updateFormState({ allocatedBills: updatedBills });
  };
  
  // Handle amount change for a bill
  const updateBillAmount = (index, amount) => {
    if (!formState.allocatedBills || index >= formState.allocatedBills.length) return;
    
    const value = parseFloat(amount);
    if (isNaN(value)) return;
    
    const updatedBills = [...formState.allocatedBills];
    updatedBills[index] = {
      ...updatedBills[index],
      weeklyAmount: value
    };
    
    // Update target total
    const newTotal = updatedBills.reduce((sum, bill) => sum + (bill.weeklyAmount || 0), 0);
    
    updateFormState({
      allocatedBills: updatedBills,
      incomeTarget: newTotal.toFixed(2)
    });
  };
  
  // Handle save
  const handleSave = async () => {
    try {
      const targetAmount = parseFloat(formState.incomeTarget);
      if (isNaN(targetAmount)) {
        alert('Please enter a valid target amount');
        return;
      }
      
      const goalData = {
        weekStartDate: weekStartRef.current.toISOString(),
        weekEndDate: weekEndRef.current.toISOString(),
        incomeTarget: targetAmount,
        actualIncome: formState.existingGoal?.actualIncome || 0,
        allocatedBills: formState.allocatedBills || [],
        notes: formState.notes.trim() || undefined,
      };
      
      if (formState.existingGoal) {
        // Update existing goal
        await updateWeeklyGoal({
          ...formState.existingGoal,
          ...goalData,
        });
      } else {
        // Add new goal
        await addWeeklyGoal(goalData);
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving weekly goal:', error);
      alert('Failed to save weekly goal. Please try again.');
    }
  };
  
  const handleReset = () => {
    if (formState.existingGoal) {
      // Reset to existing goal values
      setFormState({
        ...formState,
        incomeTarget: formState.existingGoal.incomeTarget.toString(),
        allocatedBills: formState.existingGoal.allocatedBills || [],
        notes: formState.existingGoal.notes || '',
        isModified: false
      });
    } else {
      // Reset to default values
      setFormState({
        ...formState,
        incomeTarget: '1500',
        allocatedBills: [],
        notes: '',
        isModified: false
      });
    }
  };
  
  // Render bill item
  const renderBillItem = ({ item, index }) => (
    <List.Item
      title={item.expenseName || 'Unnamed Bill'}
      description={`Weekly allocation: ${formatCurrency(item.weeklyAmount)}`}
      right={() => (
        <View style={styles.itemRight}>
          <TextInput
            mode="outlined"
            value={item.weeklyAmount.toString()}
            onChangeText={(text) => updateBillAmount(index, text)}
            keyboardType="numeric"
            style={styles.amountInput}
            dense
          />
          <Switch 
            value={item.isComplete}
            onValueChange={() => toggleBillAllocation(index)}
          />
        </View>
      )}
      style={[
        styles.billItem,
        item.isComplete ? styles.completedBill : null
      ]}
    />
  );
  
  if (formState.isLoading) {
    return (
      <View style={styles.centered}>
        <Paragraph>Loading weekly goal...</Paragraph>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title>Weekly Goal</Title>
          <Paragraph>{weekRangeText}</Paragraph>
        </Card.Content>
      </Card>
      
      <Card style={styles.targetCard}>
        <Card.Content>
          <Title>Income Target</Title>
          <Divider style={styles.divider} />
          
          <TextInput
            label="Weekly Target ($)"
            value={formState.incomeTarget}
            onChangeText={(text) => updateFormState({ incomeTarget: text })}
            keyboardType="numeric"
            mode="outlined"
            style={styles.targetInput}
          />
          
          <Paragraph style={styles.targetDescription}>
            This is how much you need to earn this week to stay on track with your bills.
          </Paragraph>
        </Card.Content>
      </Card>
      
      <Card style={styles.billsCard}>
        <Card.Content>
          <View style={styles.billsHeader}>
            <Title>Allocated Bills</Title>
            {formState.isModified && (
              <Button 
                mode="text" 
                onPress={handleReset}
                compact
              >
                Reset
              </Button>
            )}
          </View>
          <Divider style={styles.divider} />
          
          {!formState.allocatedBills || formState.allocatedBills.length === 0 ? (
            <Paragraph style={styles.emptyState}>
              No upcoming bills to allocate funds for.
            </Paragraph>
          ) : (
            <FlatList
              data={formState.allocatedBills}
              renderItem={renderBillItem}
              keyExtractor={(item, index) => `${item.expenseId || 'bill'}-${index}`}
              scrollEnabled={false}
            />
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.notesCard}>
        <Card.Content>
          <Title>Notes</Title>
          <Divider style={styles.divider} />
          
          <TextInput
            label="Add notes about this week's goal"
            value={formState.notes}
            onChangeText={(text) => updateFormState({ notes: text })}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.notesInput}
          />
        </Card.Content>
      </Card>
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          onPress={handleSave} 
          style={styles.saveButton}
        >
          {formState.existingGoal ? 'Update Goal' : 'Set Goal'}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  targetCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  billsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  notesCard: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  divider: {
    marginVertical: 12,
  },
  targetInput: {
    marginVertical: 8,
    backgroundColor: 'white',
  },
  targetDescription: {
    fontStyle: 'italic',
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
  },
  billsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyState: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 12,
  },
  billItem: {
    paddingLeft: 0,
    marginVertical: 4,
  },
  completedBill: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  amountInput: {
    width: 100,
    height: 40,
    marginRight: 8,
  },
  notesInput: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
});
