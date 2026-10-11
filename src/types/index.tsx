// src/types/index.ts
import type { PumpFinderBusinessProfile } from './pumpFinder';

export type PaymentMethod = 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge' | 'Card';

export type UserRole = 'owner' | 'employee';

export type JobStatus = 'pending' | 'accepted' | 'in-progress' | 'completed';

export type JobType = 'owner' | 'employee' | 'personal'; // owner = assigned by owner, employee = completed by employee, personal = side hustle

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

  // Private estimated-income-tax settings
  taxEstimateEnabled?: boolean;
  estimatedTaxRate?: number;
  includeCashInTaxEstimate?: boolean;

  // Pump Finder marketplace profile
  pumpFinderProfile?: PumpFinderBusinessProfile;
}

export interface Employee {
  uid: string;
  email: string;
  name: string;
  status: 'invited' | 'active';
  commissionRate: number;
  invitedAt: string;
  acceptedAt?: string;
  keepsCash?: boolean;
  keepsCheck?: boolean;

  // Security linkage for owner/employee relationships. The active employee
  // record points back to the invitation that authorized the connection.
  ownerId?: string;
  inviteId?: string;
}

export interface Job {
  id: string;
  userId: string;
  clientName: string;
  isFlatRate: boolean;
  flatRateAmount?: number;
  companyName?: string;
  address: string;
  city: string;
  yards: number;
  isPaid: boolean;
  isPaidToMe?: boolean;
  paymentMethod: PaymentMethod;
  amount: number;
  amountPerYard?: number;
  setupCharge?: number;
  date: string;
  notes?: string;

  // Owner / employee attribution used for owner reporting
  ownerId?: string;
  assignedTo?: string;
  employeeId?: string;
  employeeName?: string;
  employeeCommissionRate?: number;
  isEmployeeJob?: boolean;
  isOwnerJob?: boolean;
  jobType?: JobType;
  status?: JobStatus;

  // Provenance for shared ownerJobs. Employee-entered jobs can be edited or
  // deleted by that employee; owner-assigned jobs remain owner-controlled.
  createdByUid?: string;
  entrySource?: 'employee-entry';

  // Optional customer reference numbers for billing/reporting
  jobNumber?: string | null;
  poNumber?: string | null;

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

  // Snapshot of the invoice presentation so reopening a stored invoice can
  // reproduce the same document that was generated/sent.
  issuerName?: string;
  issuerEmail?: string;
  jobAddress?: string;
  rmc?: string;
  dueTime?: string;
  arriveTime?: string;
  startTime?: string;
  finishTime?: string;
  renderedHtml?: string;

  // Snapshot of per-job references included on this invoice
  jobReferences?: Array<{
    jobId: string;
    date?: string;
    address?: string;
    jobNumber?: string;
    poNumber?: string;
  }>;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}