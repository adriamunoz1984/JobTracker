// src/context/PersonalExpensesContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersonalExpense, PersonalExpenseCategory } from '../types';

interface PersonalExpensesContextType {
  expenses: PersonalExpense[];
  addExpense: (expense: Omit<PersonalExpense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateExpense: (expense: PersonalExpense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  getExpenseById: (id: string) => PersonalExpense | undefined;
  getExpensesByDateRange: (startDate: string, endDate: string) => PersonalExpense[];
  getExpensesByCategory: (category: PersonalExpenseCategory) => PersonalExpense[];
  getTotalExpensesForDateRange: (startDate: string, endDate: string) => number;
  getExpenseBreakdownByCategory: (startDate: string, endDate: string) => Record<PersonalExpenseCategory, number>;
  isLoading: boolean;
}

const PersonalExpensesContext = createContext<PersonalExpensesContextType | undefined>(undefined);

export const usePersonalExpenses = () => {
  const context = useContext(PersonalExpensesContext);
  if (context === undefined) {
    throw new Error('usePersonalExpenses must be used within a PersonalExpensesProvider');
  }
  return context;
};

export const PersonalExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load expenses from AsyncStorage on component mount
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setIsLoading(true);
        const expensesData = await AsyncStorage.getItem('personalExpenses');
        if (expensesData) {
          const parsedExpenses = JSON.parse(expensesData);
          console.log(`Loaded ${parsedExpenses.length} personal expenses from storage`);
          setExpenses(parsedExpenses);
        } else {
          console.log('No personal expenses found in storage');
          setExpenses([]);
        }
      } catch (error) {
        console.error('Error loading personal expenses:', error);
        setExpenses([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadExpenses();
  }, []);

  // Save expenses to AsyncStorage whenever they change
  useEffect(() => {
    const saveExpenses = async () => {
      try {
        await AsyncStorage.setItem('personalExpenses', JSON.stringify(expenses));
      } catch (error) {
        console.error('Failed to save personal expenses:', error);
      }
    };
  
    if (!isLoading) {
      saveExpenses();
    }
  }, [expenses, isLoading]);

  const addExpense = async (expenseData: Omit<PersonalExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const now = new Date().toISOString();
    const expenseId = `expense-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const newExpense: PersonalExpense = {
      ...expenseData,
      id: expenseId,
      createdAt: now,
      updatedAt: now,
    };

    setExpenses((prevExpenses) => [...prevExpenses, newExpense]);
    return expenseId;
  };

  const updateExpense = async (updatedExpense: PersonalExpense) => {
    const updatedExpenses = expenses.map((expense) =>
      expense.id === updatedExpense.id
        ? { ...updatedExpense, updatedAt: new Date().toISOString() }
        : expense
    );
    setExpenses(updatedExpenses);
  };

  const deleteExpense = async (id: string) => {
    setExpenses((prevExpenses) => prevExpenses.filter((expense) => expense.id !== id));
  };

  const getExpenseById = (id: string) => {
    return expenses.find((expense) => expense.id === id);
  };

  const getExpensesByDateRange = (startDate: string, endDate: string): PersonalExpense[] => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return expenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= start && expenseDate <= end;
      });
    } catch (error) {
      console.error('Error in getExpensesByDateRange:', error);
      return [];
    }
  };

  const getExpensesByCategory = (category: PersonalExpenseCategory): PersonalExpense[] => {
    return expenses.filter((expense) => expense.category === category);
  };

  const getTotalExpensesForDateRange = (startDate: string, endDate: string): number => {
    const expensesInRange = getExpensesByDateRange(startDate, endDate);
    return expensesInRange.reduce((total, expense) => total + expense.amount, 0);
  };

  const getExpenseBreakdownByCategory = (startDate: string, endDate: string): Record<PersonalExpenseCategory, number> => {
    const expensesInRange = getExpensesByDateRange(startDate, endDate);
    
    // Initialize all categories with 0
    const breakdown: Record<PersonalExpenseCategory, number> = {
      'Gas': 0,
      'Food': 0,
      'Water': 0,
      'Entertainment': 0,
      'Supplies': 0,
      'Tools': 0,
      'Repairs': 0,
      'Other': 0
    };
    
    // Sum expenses by category
    expensesInRange.forEach(expense => {
      breakdown[expense.category] += expense.amount;
    });
    
    return breakdown;
  };

  const value = {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpenseById,
    getExpensesByDateRange,
    getExpensesByCategory,
    getTotalExpensesForDateRange,
    getExpenseBreakdownByCategory,
    isLoading
  };

  return <PersonalExpensesContext.Provider value={value}>{children}</PersonalExpensesContext.Provider>;
};