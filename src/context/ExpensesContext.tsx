// src/context/ExpensesContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, ExpenseCategory, RecurrenceType, DailyExpenseSummary } from '../types';
import { format, addDays, addWeeks, addMonths, addQuarters, addYears, isBefore, isAfter, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface ExpensesContextType {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  markAsPaid: (id: string, paidDate?: string) => Promise<void>;
  markAsUnpaid: (id: string) => Promise<void>;
  getExpenseById: (id: string) => Expense | undefined;
  getUpcomingExpenses: (startDate: string, endDate: string) => Expense[];
  getDailyExpenses: (startDate: string, endDate: string) => Expense[];
  getDailyExpensesByDate: (date: string) => Expense[];
  getDailyExpenseSummary: (startDate: string, endDate: string) => DailyExpenseSummary[];
  getTotalDailyExpensesForRange: (startDate: string, endDate: string) => number;
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
    // Only include regular (non-daily) expenses
    const regularExpenses = expenses.filter(expense => !expense.isDailyExpense);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return regularExpenses.filter((expense) => {
      const dueDate = new Date(expense.dueDate);
      return (dueDate >= start && dueDate <= end) || 
        (!expense.isPaid && dueDate < start); // Also include overdue unpaid expenses
    });
  };

  // New method to get only daily expenses
  const getDailyExpenses = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return expenses.filter(expense => {
      if (!expense.isDailyExpense) return false;
      
      const expenseDate = new Date(expense.expenseDate || expense.dueDate);
      return expenseDate >= start && expenseDate <= end;
    });
  };

  // Get daily expenses for a specific date
  const getDailyExpensesByDate = (date: string) => {
    const targetDate = new Date(date);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);
    
    return expenses.filter(expense => {
      if (!expense.isDailyExpense) return false;
      
      const expenseDate = new Date(expense.expenseDate || expense.dueDate);
      return expenseDate >= dayStart && expenseDate <= dayEnd;
    });
  };

  // Get daily expense summaries grouped by date
  const getDailyExpenseSummary = (startDate: string, endDate: string): DailyExpenseSummary[] => {
    const dailyExpenses = getDailyExpenses(startDate, endDate);
    
    // Group expenses by date
    const expensesByDate: Record<string, Expense[]> = {};
    
    dailyExpenses.forEach(expense => {
      const dateStr = format(new Date(expense.expenseDate || expense.dueDate), 'yyyy-MM-dd');
      
      if (!expensesByDate[dateStr]) {
        expensesByDate[dateStr] = [];
      }
      
      expensesByDate[dateStr].push(expense);
    });
    
    // Convert to array of summaries
    const summaries: DailyExpenseSummary[] = Object.keys(expensesByDate).map(dateStr => {
      const dateExpenses = expensesByDate[dateStr];
      const totalAmount = dateExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      return {
        date: dateStr,
        totalAmount,
        expenses: dateExpenses
      };
    });
    
    // Sort by date (newest first)
    return summaries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Calculate total daily expenses for a date range
  const getTotalDailyExpensesForRange = (startDate: string, endDate: string): number => {
    const dailyExpenses = getDailyExpenses(startDate, endDate);
    return dailyExpenses.reduce((total, expense) => total + expense.amount, 0);
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
    getDailyExpenses,
    getDailyExpensesByDate,
    getDailyExpenseSummary,
    getTotalDailyExpensesForRange,
    generateNextRecurringExpense,
    isLoading
  };

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
};