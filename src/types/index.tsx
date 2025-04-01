// src/types/index.tsx
export type PaymentMethod = 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';
export type UserRole = 'owner' | 'employee';

// Extended User type to include role and commission settings
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: UserRole;
  commissionRate?: number;
  keepsCash?: boolean;
  keepsCheck?: boolean;
}

export interface Job {
  id: string;
  companyName?: string;
  address: string;
  city: string;
  yards: number;
  isPaid: boolean;
  paymentMethod: PaymentMethod;
  amount: number;
  date: string;
  sequenceNumber: number;
  notes?: string;
  paymentToMe?: boolean; // Whether this payment goes to the employee
  createdAt?: string;
  updatedAt?: string;
}

export interface WeeklySummary {
  startDate: string;
  endDate: string;
  totalJobs: number;
  totalEarnings: number;
  totalUnpaid: number;
  cashPayments: number;
  checkPayments?: number;
  netEarnings: number; // Calculated based on role and settings
  userRole?: UserRole;
  commissionRate?: number;
}

export interface MonthlySummary {
  month: number;
  year: number;
  totalJobs: number;
  totalEarnings: number;
  totalUnpaid: number;
}

export interface YearlySummary {
  year: number;
  totalJobs: number;
  totalEarnings: number;
  totalUnpaid: number;
  monthlyBreakdown: {
    month: number;
    earnings: number;
  }[];
}

// Expense types
export type ExpenseCategory = 'Fixed' | 'Variable' | 'Business' | 'Personal' | 'Other' | 'Food' | 'Gas' | 'Water' | 'Daily';
export type RecurrenceType = 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'OneTime';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidDate?: string;
  category: ExpenseCategory;
  recurrence: RecurrenceType;
  nextDueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDailyExpense?: boolean; // Flag to identify daily expenses
  affectsEarnings?: boolean; // Whether this expense should be subtracted from earnings
}

export interface WeeklyGoal {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  incomeTarget: number;
  actualIncome: number;
  allocatedBills: AllocatedBill[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AllocatedBill {
  expenseId: string; // Reference to Expense
  weeklyAmount: number; // How much to save this week for this bill
  isComplete: boolean; // Whether this week's allocation has been met
}

export interface DailyExpenseSummary {
  date: string;
  totalAmount: number;
  expenses: Expense[];
}