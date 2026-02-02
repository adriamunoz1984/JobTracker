// src/types/index.ts
export type PaymentMethod = 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';

export type UserRole = 'owner' | 'employee';

export type JobStatus = 'pending' | 'accepted' | 'in-progress' | 'completed';

export type JobType = 'owner' | 'personal'; // owner = assigned by owner, personal = side hustle

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  
  // Owner-specific fields
  businessName?: string;
  
  // Employee-specific fields
  ownerId?: string; // ID of the owner they work for
  ownerStatus?: 'invited' | 'active' | 'none'; // none = independent employee
  commissionRate?: number;
  keepsCash?: boolean;
  keepsCheck?: boolean;
}

export interface Employee {
  uid: string;
  email: string;
  name: string;
  status: 'invited' | 'active';
  commissionRate: number;
  keepsCash: boolean;
  keepsCheck: boolean;
  invitedAt: string;
  acceptedAt?: string;
}

export interface Job {
  id: string;
  date: string;
  companyName?: string;
  address: string;
  city: string;
  yards: number;
  amount: number;
  isPaid: boolean;
  isPaidToMe: boolean;
  paymentMethod: PaymentMethod;
  checkNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Multi-user fields
  ownerId?: string; // If assigned by owner
  assignedTo?: string; // Employee this job is assigned to
  jobType: JobType; // 'owner' or 'personal'
  status?: JobStatus; // For owner-assigned jobs
  
  // Billing details
  billingDetails?: {
    invoiceNumber?: string;
    billingDate?: string;
    dueDate?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}

export interface WeeklySummary {
  startDate: string;
  endDate: string;
  totalJobs: number;
  totalEarnings: number;
  totalUnpaid: number;
  cashPayments: number;
  paidToMeAmount: number;
  netEarnings: number;
}