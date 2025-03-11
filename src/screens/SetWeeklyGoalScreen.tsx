import React, { useState, useEffect } from 'react';
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
  const { weeklyGoals, addWeeklyGoal, updateWeeklyGoal, getCurrentWeekGoal, suggestWeeklyGoal } = useWeeklyGoals();
  const { getUpcomingExpenses } = useExpenses();
  
  // Get the week start date from params or use current date
  const weekStartParam = route.params?.weekStart as string | undefined;
  const weekStart = weekStartParam ? new Date(weekStartParam) : new Date();
  
  // State for form
  const [suggestedGoal, setSuggestedGoal] = useState<{
    incomeTarget: number;
    allocatedBills: AllocatedBill[];
  } | null>(null);
  const [incomeTarget, setIncomeTarget] = useState('');
  const [allocatedBills, setAllocatedBills] = useState<AllocatedBill[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [existingGoal, setExistingGoal] = useState<WeeklyGoal | null>(null);
  const [isModified, setIsModified] = useState(false);
  
  // Format dates for display
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekRangeText = `${format(weekStart, 'MMM d')} - ${format(weekEndDate, 'MMM d, yyyy')}`;
  
  // Load existing goal or suggest a new one
  useEffect(() => {
    const loadGoal = async () => {
      setIsLoading(true);
      
      // Check if we already have a goal for this week
      const existing = getCurrentWeekGoal(
        weekStart.toISOString(), 
        weekEndDate.toISOString()
      );
      
      if (existing) {
        // Use existing goal
        setExistingGoal(existing);
        setIncomeTarget(existing.incomeTarget.toString());
        setAllocatedBills(existing.allocatedBills);
        setNotes(existing.notes || '');
        setIsLoading(false);
      } else {
        // Get suggested goal
        try {
          const suggestion = await suggestWeeklyGoal(
            weekStart.toISOString(),
            weekEndDate.toISOString()
          );
          
          setSuggestedGoal(suggestion);
          setIncomeTarget(suggestion.incomeTarget.toFixed(2));
          setAllocatedBills(suggestion.allocatedBills);
          setIsLoading(false);
        } catch (error) {
          console.error('Error suggesting weekly goal:', error);
          setIsLoading(false);
        }
      }
    };
    
    loadGoal();
  }, [weekStart, getCurrentWeekGoal, suggestWeeklyGoal]);
  
  // Format currency for display
  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(value)) return '$0.00';
    
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Handle bill toggle
  const toggleBillAllocation = (index: number) => {
    const updatedBills = [...allocatedBills];
    updatedBills[index] = {
      ...updatedBills[index],
      isComplete: !updatedBills[index].isComplete
    };
    
    setAllocatedBills(updatedBills);
    setIsModified(true);
  };
  
  // Handle amount change for a bill
  const updateBillAmount = (index: number, amount: string) => {
    const value = parseFloat(amount);
    if (isNaN(value)) return;
    
    const updatedBills = [...allocatedBills];
    updatedBills[index] = {
      ...updatedBills[index],
      weeklyAmount: value
    };
    
    setAllocatedBills(updatedBills);
    
    // Update target total
    const newTotal = updatedBills.reduce((sum, bill) => sum + bill.weeklyAmount, 0);
    setIncomeTarget(newTotal.toFixed(2));
    setIsModified(true);
  };
  
  // Handle save
  const handleSave = async () => {
    try {
      const targetAmount = parseFloat(incomeTarget);
      if (isNaN(targetAmount)) {
        alert('Please enter a valid target amount');
        return;
      }
      
      const goalData = {
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEndDate.toISOString(),
        incomeTarget: targetAmount,
        actualIncome: existingGoal?.actualIncome || 0,
        allocatedBills,
        notes: notes.trim() || undefined,
      };
      
      if (existingGoal) {
        // Update existing goal
        await updateWeeklyGoal({
          ...existingGoal,
          ...goalData
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
    if (existingGoal) {
      // Reset to existing goal values
      setIncomeTarget(existingGoal.incomeTarget.toString());
      setAllocatedBills(existingGoal.allocatedBills);
      setNotes(existingGoal.notes || '');
    } else if (suggestedGoal) {
      // Reset to suggested values
      setIncomeTarget(suggestedGoal.incomeTarget.toFixed(2));
      setAllocatedBills(suggestedGoal.allocatedBills);
    }
    setIsModified(false);
  };
  
  // Render bill item
  const renderBillItem = ({ item, index }: { item: AllocatedBill; index: number }) => (
    <List.Item
      title={item.expenseName}
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
  
  if (isLoading) {
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
            value={incomeTarget}
            onChangeText={(text) => {
              setIncomeTarget(text);
              setIsModified(true);
            }}
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
            {isModified && (
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
          
          {allocatedBills.length === 0 ? (
            <Paragraph style={styles.emptyState}>
              No upcoming bills to allocate funds for.
            </Paragraph>
          ) : (
            <FlatList
              data={allocatedBills}
              renderItem={renderBillItem}
              keyExtractor={(item, index) => `${item.expenseId}-${index}`}
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
            value={notes}
            onChangeText={(text) => {
              setNotes(text);
              setIsModified(true);
            }}
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
          {existingGoal ? 'Update Goal' : 'Set Goal'}
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