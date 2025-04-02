// src/types/index.tsx - Updated Job interface
export type PaymentMethod = 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';

export interface Job {
  id: string;
  companyName?: string;
  address: string;
  city: string;
  yards: number;
  isPaid: boolean;
  isPaidToMe?: boolean;  // Add this field to track payments made directly to you
  paymentMethod: PaymentMethod;
  amount: number;
  date: string;
  sequenceNumber: number;
  notes?: string;
}

// Other types remain the same
export interface WeeklySummary {
  startDate: string;
  endDate: string;
  totalJobs: number;
  totalEarnings: number;
  totalUnpaid: number;
  cashPayments: number;
  paidToMeAmount: number; // Add this field to track payments made directly to you
  netEarnings: number; // (Total Earnings / 2) - Cash Payments - Paid To Me Payments
}

// Rest of the types file remains the same