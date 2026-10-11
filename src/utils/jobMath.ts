// src/utils/jobMath.ts
import { Job } from '../types';

export interface PumperPayRow {
  key: string;
  name: string;
  jobs: number;
  revenue: number;
  grossPay: number;
  directPayments: number;
  amountOwed: number;
}

export interface OwnerPaySummary {
  totalRevenue: number;
  employeeRevenue: number;
  grossPumperPay: number;
  directPaymentsToPumpers: number;
  amountOwedToPumpers: number;
  ownerAfterPumperPay: number;
  byPumper: PumperPayRow[];
}

export const isEmployeeJob = (job: Job): boolean =>
  Boolean(
    job.isEmployeeJob ||
    job.employeeId ||
    job.assignedTo ||
    job.jobType === 'employee'
  );

export const getJobPumperName = (job: Job, ownerName = 'Owner'): string => {
  if (!isEmployeeJob(job)) return ownerName;
  return job.employeeName?.trim() || 'Employee';
};

export const getJobCommissionRate = (job: Job): number => {
  if (!isEmployeeJob(job)) return 0;
  const rate = Number(job.employeeCommissionRate);
  return Number.isFinite(rate) && rate >= 0 ? rate : 50;
};

export const getJobPumperGrossPay = (job: Job): number =>
  isEmployeeJob(job)
    ? (Number(job.amount || 0) * getJobCommissionRate(job)) / 100
    : 0;

export const calculateOwnerPay = (jobs: Job[]): OwnerPaySummary => {
  const totalRevenue = jobs.reduce((sum, job) => sum + Number(job.amount || 0), 0);
  const employeeJobs = jobs.filter(isEmployeeJob);

  const employeeRevenue = employeeJobs.reduce(
    (sum, job) => sum + Number(job.amount || 0),
    0
  );

  const grossPumperPay = employeeJobs.reduce(
    (sum, job) => sum + getJobPumperGrossPay(job),
    0
  );

  const directPaymentsToPumpers = employeeJobs
    .filter(job => job.isPaidToMe)
    .reduce((sum, job) => sum + Number(job.amount || 0), 0);

  const grouped = new Map<string, PumperPayRow>();

  employeeJobs.forEach(job => {
    const key = job.employeeId || job.assignedTo || job.employeeName || 'employee';
    const existing = grouped.get(key) || {
      key,
      name: job.employeeName?.trim() || 'Employee',
      jobs: 0,
      revenue: 0,
      grossPay: 0,
      directPayments: 0,
      amountOwed: 0,
    };

    existing.jobs += 1;
    existing.revenue += Number(job.amount || 0);
    existing.grossPay += getJobPumperGrossPay(job);
    if (job.isPaidToMe) {
      existing.directPayments += Number(job.amount || 0);
    }
    existing.amountOwed = existing.grossPay - existing.directPayments;
    grouped.set(key, existing);
  });

  return {
    totalRevenue,
    employeeRevenue,
    grossPumperPay,
    directPaymentsToPumpers,
    amountOwedToPumpers: grossPumperPay - directPaymentsToPumpers,
    ownerAfterPumperPay: totalRevenue - grossPumperPay,
    byPumper: Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name)),
  };
};


export interface TaxEstimateSummary {
  taxableBase: number;
  estimatedTax: number;
  afterTax: number;
  excludedCashBase: number;
}

const normalizedTaxRate = (rate?: number): number => {
  const value = Number(rate || 0);
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

export const getTaxableShareForJob = (
  job: Job,
  role: 'owner' | 'employee',
  includeCash = true,
  employeeFallbackCommissionRate = 50
): number => {
  const amount = Number(job.amount || 0);
  if (amount <= 0) return 0;
  if (!includeCash && job.paymentMethod === 'Cash') return 0;

  if (role === 'owner') {
    if (!isEmployeeJob(job)) return amount;
    return Math.max(0, amount - getJobPumperGrossPay(job));
  }

  if (isEmployeeJob(job)) {
    const snapshotRate = Number(job.employeeCommissionRate);
    const rate = Number.isFinite(snapshotRate)
      ? snapshotRate
      : employeeFallbackCommissionRate;
    return Math.max(0, amount * Math.min(100, Math.max(0, rate)) / 100);
  }

  // A pumper's own/personal job is fully theirs for this estimate.
  return amount;
};

export const getEstimatedTaxForJob = (
  job: Job,
  role: 'owner' | 'employee',
  taxRate?: number,
  includeCash = true,
  employeeFallbackCommissionRate = 50
): number => {
  const taxableShare = getTaxableShareForJob(
    job,
    role,
    includeCash,
    employeeFallbackCommissionRate
  );
  return taxableShare * normalizedTaxRate(taxRate) / 100;
};

export const calculateTaxEstimate = (
  jobs: Job[],
  role: 'owner' | 'employee',
  taxRate?: number,
  includeCash = true,
  employeeFallbackCommissionRate = 50
): TaxEstimateSummary => {
  const taxableBase = jobs.reduce(
    (sum, job) =>
      sum +
      getTaxableShareForJob(
        job,
        role,
        includeCash,
        employeeFallbackCommissionRate
      ),
    0
  );

  const excludedCashBase = includeCash
    ? 0
    : jobs
        .filter(job => job.paymentMethod === 'Cash')
        .reduce(
          (sum, job) =>
            sum +
            getTaxableShareForJob(
              job,
              role,
              true,
              employeeFallbackCommissionRate
            ),
          0
        );

  const estimatedTax = taxableBase * normalizedTaxRate(taxRate) / 100;

  return {
    taxableBase,
    estimatedTax,
    afterTax: taxableBase - estimatedTax,
    excludedCashBase,
  };
};
