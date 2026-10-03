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
