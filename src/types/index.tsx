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
  amountPerYard?: number;  // Add this
  setupCharge?: number;     // Add this
  amount: number;
  isPaid: boolean;
  isPaidToMe: boolean;
  isFlatRate?: boolean;
  flatRateAmount?: number;
  paymentMethod: PaymentMethod;
  checkNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Multi-user fields
  ownerId?: string;
  assignedTo?: string;
  jobType: JobType;
  status?: JobStatus;
  
  // Employee job metadata (for owners viewing employee jobs)
  isEmployeeJob?: boolean;
  employeeName?: string;
  employeeId?: string;
  isOwnerJob?: boolean;
  
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

export interface ClientAddress {
  id: string;
  label: string; // "Main Office", "North Site", etc.
  address: string;
  city: string;
  pricePerYard?: number; // Optional custom pricing for this address
  setupCharge?: number;
}

export interface Client {
  id: string;
  name: string; // Company/Client name
  phone?: string;
  email?: string;
  defaultPricePerYard?: number; // Client-level default
  defaultSetupCharge?: number;
  isPrivate?: boolean; // Add this - marks client as private
  addresses: ClientAddress[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}