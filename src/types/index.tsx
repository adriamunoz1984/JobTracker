// src/types/index.tsx
export type PaymentMethod = 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';

export interface Job {
  id: string;
  companyName?: string;
  address: string;
  city: string;
  yards: number;
  isPaid: boolean;
  paymentMethod: 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';
  amount: number;
  date: string;
  sequenceNumber: number; // Add this field
  notes?: string;
}

export interface WeeklySummary {
  startDate: string;
  endDate: string;
  totalJobs: number;
  totalEarnings: number;
  totalUnpaid: number;
  cashPayments: number;
  netEarnings: number; // (Total Earnings / 2) - Cash Payments
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

// New types for Expense Tracker and Weekly Income Planner

export type ExpenseCategory = 'Fixed' | 'Variable' | 'Business' | 'Personal' | 'Other';
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
  nextDueDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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