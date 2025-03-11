export type PaymentMethod = 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';

export interface Job {
  id: string;
  date: string;
  companyName?: string;
  address: string;
  city: string;
  yards: number;
  isPaid: boolean;
  paymentMethod: PaymentMethod;
  amount: number;
  checkNumber?: string; // Only for Check payment
  notes?: string;
  createdAt: string;
  updatedAt: string;
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