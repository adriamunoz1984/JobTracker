// src/context/WeeklyGoalsContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeeklyGoal, AllocatedBill } from '../types';
import { startOfWeek, endOfWeek, format, isWithinInterval } from 'date-fns';

interface WeeklyGoalsContextType {
  weeklyGoals: WeeklyGoal[];
  addWeeklyGoal: (goal: Omit<WeeklyGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<WeeklyGoal>;
  updateWeeklyGoal: (goal: WeeklyGoal) => Promise<void>;
  deleteWeeklyGoal: (id: string) => Promise<void>;
  getWeeklyGoalById: (id: string) => WeeklyGoal | undefined;
  getCurrentWeekGoal: (startDate: string, endDate: string) => WeeklyGoal | null;
  allocateBillToWeek: (goalId: string, expenseId: string, amount: number) => Promise<void>;
  markAllocationComplete: (goalId: string, expenseId: string, isComplete: boolean) => Promise<void>;
  isLoading: boolean;
}

const WeeklyGoalsContext = createContext<WeeklyGoalsContextType | undefined>(undefined);

export const useWeeklyGoals = () => {
  const context = useContext(WeeklyGoalsContext);
  if (context === undefined) {
    throw new Error('useWeeklyGoals must be used within a WeeklyGoalsProvider');
  }
  return context;
};

export const WeeklyGoalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load weekly goals from AsyncStorage on component mount
  useEffect(() => {
    const loadWeeklyGoals = async () => {
      try {
        const storedGoals = await AsyncStorage.getItem('weeklyGoals');
        if (storedGoals) {
          setWeeklyGoals(JSON.parse(storedGoals));
        }
      } catch (error) {
        console.error('Failed to load weekly goals:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWeeklyGoals();
  }, []);

  // Save weekly goals to AsyncStorage whenever they change
  useEffect(() => {
    const saveWeeklyGoals = async () => {
      try {
        await AsyncStorage.setItem('weeklyGoals', JSON.stringify(weeklyGoals));
      } catch (error) {
        console.error('Failed to save weekly goals:', error);
      }
    };

    if (!isLoading) {
      saveWeeklyGoals();
    }
  }, [weeklyGoals, isLoading]);

  const addWeeklyGoal = async (goalData: Omit<WeeklyGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeeklyGoal> => {
    const now = new Date().toISOString();
    const newGoal: WeeklyGoal = {
      ...goalData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };

    setWeeklyGoals((prevGoals) => [...prevGoals, newGoal]);
    return newGoal;
  };

  const updateWeeklyGoal = async (updatedGoal: WeeklyGoal) => {
    const updatedGoals = weeklyGoals.map((goal) =>
      goal.id === updatedGoal.id
        ? { ...updatedGoal, updatedAt: new Date().toISOString() }
        : goal
    );
    setWeeklyGoals(updatedGoals);
  };

  const deleteWeeklyGoal = async (id: string) => {
    setWeeklyGoals((prevGoals) => prevGoals.filter((goal) => goal.id !== id));
  };

  const getWeeklyGoalById = (id: string) => {
    return weeklyGoals.find((goal) => goal.id === id);
  };

  const getCurrentWeekGoal = (startDateStr: string, endDateStr: string): WeeklyGoal | null => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Try to find an existing goal for this week
    const existingGoal = weeklyGoals.find(goal => {
      const goalStart = new Date(goal.weekStartDate);
      const goalEnd = new Date(goal.weekEndDate);
      
      return (
        format(goalStart, 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd') &&
        format(goalEnd, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')
      );
    });
    
    if (existingGoal) {
      return existingGoal;
    }
    
    // No existing goal found, create a default one
    const defaultGoal = {
      id: Date.now().toString(),
      weekStartDate: startDate.toISOString(),
      weekEndDate: endDate.toISOString(),
      incomeTarget: 0, // Default target
      actualIncome: 0,
      allocatedBills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Add this goal to the state
    setWeeklyGoals(prev => [...prev, defaultGoal]);
    
    return defaultGoal;
  };

  const allocateBillToWeek = async (goalId: string, expenseId: string, amount: number) => {
    const goal = weeklyGoals.find(g => g.id === goalId);
    if (!goal) return;
    
    // Check if this expense is already allocated to this week
    const existingAllocation = goal.allocatedBills.find(a => a.expenseId === expenseId);
    
    let updatedAllocatedBills: AllocatedBill[];
    
    if (existingAllocation) {
      // Update existing allocation
      updatedAllocatedBills = goal.allocatedBills.map(a => 
        a.expenseId === expenseId 
          ? { ...a, weeklyAmount: amount }
          : a
      );
    } else {
      // Add new allocation
      updatedAllocatedBills = [
        ...goal.allocatedBills, 
        { expenseId, weeklyAmount: amount, isComplete: false }
      ];
    }
    
    const updatedGoal = {
      ...goal,
      allocatedBills: updatedAllocatedBills,
      updatedAt: new Date().toISOString()
    };
    
    await updateWeeklyGoal(updatedGoal);
  };

  const markAllocationComplete = async (goalId: string, expenseId: string, isComplete: boolean) => {
    const goal = weeklyGoals.find(g => g.id === goalId);
    if (!goal) return;
    
    const updatedAllocatedBills = goal.allocatedBills.map(a => 
      a.expenseId === expenseId 
        ? { ...a, isComplete }
        : a
    );
    
    const updatedGoal = {
      ...goal,
      allocatedBills: updatedAllocatedBills,
      updatedAt: new Date().toISOString()
    };
    
    await updateWeeklyGoal(updatedGoal);
  };

  const value = {
    weeklyGoals,
    addWeeklyGoal,
    updateWeeklyGoal,
    deleteWeeklyGoal,
    getWeeklyGoalById,
    getCurrentWeekGoal,
    allocateBillToWeek,
    markAllocationComplete,
    isLoading
  };

  return <WeeklyGoalsContext.Provider value={value}>{children}</WeeklyGoalsContext.Provider>;
};