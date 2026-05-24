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
  invitedAt: string;
  acceptedAt?: string;
}

export interface Job {
  id: string;
  userId: string;
  companyName?: string;
  address: string;
  city: string;
  yards: number;
  isPaid: boolean;
  isPaidToMe?: boolean;
  paymentMethod: 'Cash' | 'Check' | 'Charge' | 'Zelle' | 'Card';
  amount: number;
  date: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  sequenceNumber?: number;
  totalJobsOnDate?: number;
  
  // Check payment
  checkNumber?: string;
  
  // Zelle payment details
  zellePhone?: string;
  zelleName?: string;
  zelleNumber?: string;
  
  // Billing override (NEW)
  useDifferentBilling?: boolean;
  billingName?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingPO?: string;
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
  name: string;
  addresses: ClientAddress[];
  defaultPricePerYard?: number;
  defaultSetupCharge?: number;
  createdAt: string;
  updatedAt?: string;
  
  // Billing Information (NEW)
  billingName?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingPO?: string; // Purchase Order number
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  clientPhone?: string;
  jobIds: string[];
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  sentDate?: string;
  paidDate?: string;
  notes?: string;
  terms?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}