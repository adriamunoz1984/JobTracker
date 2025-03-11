// src/context/ExpensesContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, ExpenseCategory, RecurrenceType } from '../types';
import { format, addDays, addWeeks, addMonths, addQuarters, addYears, isBefore, isAfter } from 'date-fns';

interface ExpensesContextType {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string, paidDate?: string) => Promise<void>;
  markAsUnpaid: (id: string) => Promise<void>;
  getExpenseById: (id: string) => Expense | undefined;
  getUpcomingExpenses: (startDate: string, endDate: string) => Expense[];
  generateNextRecurringExpense: (expenseId: string) => Promise<void>;
  isLoading: boolean;
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const useExpenses = () => {
  const context = useContext(ExpensesContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpensesProvider');
  }
  return context;
};

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load expenses from AsyncStorage on component mount
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const storedExpenses = await AsyncStorage.getItem('expenses');
        if (storedExpenses) {
          setExpenses(JSON.parse(storedExpenses));
        }
      } catch (error) {
        console.error('Failed to load expenses:', error);
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
        await AsyncStorage.setItem('expenses', JSON.stringify(expenses));
      } catch (error) {
        console.error('Failed to save expenses:', error);
      }
    };

    if (!isLoading) {
      saveExpenses();
    }
  }, [expenses, isLoading]);

  // Helper function to calculate next due date based on recurrence
  const calculateNextDueDate = (dueDate: string, recurrence: RecurrenceType): string => {
    const currentDueDate = new Date(dueDate);
    let nextDueDate: Date;

    switch (recurrence) {
      case 'Daily':
        nextDueDate = addDays(currentDueDate, 1);
        break;
      case 'Weekly':
        nextDueDate = addWeeks(currentDueDate, 1);
        break;
      case 'Biweekly':
        nextDueDate = addWeeks(currentDueDate, 2);
        break;
      case 'Monthly':
        nextDueDate = addMonths(currentDueDate, 1);
        break;
      case 'Quarterly':
        nextDueDate = addQuarters(currentDueDate, 1);
        break;
      case 'Yearly':
        nextDueDate = addYears(currentDueDate, 1);
        break;
      case 'OneTime':
      default:
        // No next due date for one-time expenses
        return dueDate;
    }

    return nextDueDate.toISOString();
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now,
    };

    setExpenses((prevExpenses) => [...prevExpenses, newExpense]);
  };

  const updateExpense = async (updatedExpense: Expense) => {
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

  const markAsPaid = async (id: string, paidDate: string = new Date().toISOString()) => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    const updatedExpense: Expense = {
      ...expense,
      isPaid: true,
      paidDate,
      updatedAt: new Date().toISOString()
    };

    // For recurring expenses, also generate the next occurrence
    if (expense.recurrence !== 'OneTime') {
      await generateNextRecurringExpense(id);
    }

    setExpenses(expenses.map(e => e.id === id ? updatedExpense : e));
  };

  const markAsUnpaid = async (id: string) => {
    setExpenses(expenses.map(e => 
      e.id === id 
        ? { ...e, isPaid: false, paidDate: undefined, updatedAt: new Date().toISOString() } 
        : e
    ));
  };

  const getExpenseById = (id: string) => {
    return expenses.find((expense) => expense.id === id);
  };

  const getUpcomingExpenses = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return expenses.filter((expense) => {
      const dueDate = new Date(expense.dueDate);
      return (dueDate >= start && dueDate <= end) || 
        (!expense.isPaid && dueDate < start); // Also include overdue unpaid expenses
    });
  };

  const generateNextRecurringExpense = async (expenseId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense || expense.recurrence === 'OneTime') return;

    const nextDueDate = calculateNextDueDate(expense.dueDate, expense.recurrence);
    
    // Only create a new expense if it doesn't already exist
    const existingNextExpense = expenses.find(e => 
      e.name === expense.name && 
      e.dueDate === nextDueDate &&
      e.amount === expense.amount
    );

    if (!existingNextExpense) {
      const now = new Date().toISOString();
      const newExpense: Expense = {
        ...expense,
        id: Date.now().toString(),
        dueDate: nextDueDate,
        nextDueDate: calculateNextDueDate(nextDueDate, expense.recurrence),
        isPaid: false,
        paidDate: undefined,
        createdAt: now,
        updatedAt: now,
      };

      setExpenses(prev => [...prev, newExpense]);
    }
  };

  const value = {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    markAsPaid,
    markAsUnpaid,
    getExpenseById,
    getUpcomingExpenses,
    generateNextRecurringExpense,
    isLoading
  };

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
};