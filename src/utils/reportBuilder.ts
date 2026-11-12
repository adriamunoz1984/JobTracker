import { addDays, addMonths, endOfDay, endOfMonth, endOfWeek, endOfYear, format, parseISO, startOfDay, startOfMonth } from 'date-fns';
import { Job } from '../types';
import { calculateEmployeeEarnings, calculateOwnerPay, isEmployeeJob, getJobPumperName } from './jobMath';

export type ReportGroup = 'day' | 'week' | 'month' | 'year';
export type ReportMetric = 'owed' | 'earned' | 'revenue';
export type ReportScope = 'all' | 'company' | 'independent';
export type DirectMode = 'exclude' | 'balance';
export type ReportBreakdown = 'period' | 'customer' | 'payment' | 'pumper';
export type ReportOptions = { group: ReportGroup; metric: ReportMetric; scope: ReportScope; direct: DirectMode; status: 'all' | 'paid' | 'unpaid'; breakdown?: ReportBreakdown; weekStartsOn?: 0 | 1 };
export type ReportRow = { start: Date; end: Date; label: string; amount: number; jobs: number; yards: number };
export const defaultReportOptions: ReportOptions = { group: 'week', metric: 'owed', scope: 'company', direct: 'exclude', status: 'all', breakdown: 'period', weekStartsOn: 0 };
export const metricLabel = (metric: ReportMetric, owner: boolean, breakdown?: ReportBreakdown) => metric === 'revenue' ? 'Job revenue' : owner ? metric === 'owed' ? 'Owed to pumpers' : breakdown === 'pumper' ? 'Pumper earnings' : 'Owner earnings' : metric === 'owed' ? 'Amount owed' : 'Amount earned';
export const money = (n: number) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function selectReportJobs(jobs: Job[], start: Date, end: Date, options: ReportOptions, owner = false) {
  const from = startOfDay(start).getTime(), to = endOfDay(end).getTime();
  return jobs.filter(j => {
    const t = parseISO(j.date).getTime();
    if (!Number.isFinite(t) || t < from || t > to) return false;
    if (options.breakdown === 'pumper' && !isEmployeeJob(j)) return false;
    const companyJob = owner ? isEmployeeJob(j) : j.jobType !== 'personal';
    if (options.scope === 'company' && !companyJob) return false;
    if (options.scope === 'independent' && companyJob) return false;
    if (options.direct === 'exclude' && j.isPaidToMe && companyJob) return false;
    if (options.status === 'paid' && !j.isPaid) return false;
    if (options.status === 'unpaid' && j.isPaid) return false;
    return true;
  });
}
export function reportAmount(jobs: Job[], metric: ReportMetric, owner: boolean, rate: number, breakdown?: ReportBreakdown) {
  if (metric === 'revenue') return jobs.reduce((sum, j) => sum + Number(j.amount || 0), 0);
  if (owner) {
    const pay = calculateOwnerPay(jobs);
    return metric === 'owed' ? pay.amountOwedToPumpers : breakdown === 'pumper' ? pay.grossPumperPay : pay.ownerAfterPumperPay;
  }
  const pay = calculateEmployeeEarnings(jobs, rate);
  return metric === 'owed' ? pay.owed : pay.earned;
}
export function reportRows(jobs: Job[], start: Date, end: Date, options: ReportOptions, owner: boolean, rate: number): ReportRow[] {
  const first = startOfDay(start), last = endOfDay(end);
  if (first > last) return [];
  const selected = selectReportJobs(jobs, first, last, options, owner);
  const rows: ReportRow[] = [];
  if (options.breakdown && options.breakdown !== 'period') {
    const grouped = new Map<string, { label: string; jobs: Job[] }>();
    selected.forEach(j => {
      const label = options.breakdown === 'customer' ? j.companyName?.trim() || 'No company' : options.breakdown === 'payment' ? j.paymentMethod || 'Not specified' : getJobPumperName(j);
      const key = options.breakdown === 'pumper' ? j.employeeId || j.assignedTo || label : label;
      const bucket = grouped.get(key) || { label, jobs: [] };
      bucket.jobs.push(j); grouped.set(key,bucket);
    });
    return Array.from(grouped.values(), g => ({ start:first, end:last, label:g.label, amount:reportAmount(g.jobs,options.metric,owner,rate,options.breakdown), jobs:g.jobs.length, yards:g.jobs.reduce((n,j)=>n+Number(j.yards||0),0) })).sort((a,b)=>b.amount-a.amount || a.label.localeCompare(b.label));
  }
  // Sort dates once; advance through jobs and periods together rather than scanning every job for each date range.
  const dated = selected.map(job=>({job,time:parseISO(job.date).getTime()})).sort((a,b)=>a.time-b.time);
  let jobIndex=0;
  let cursor = first;
  while (cursor <= last && rows.length < 4000) {
    const boundary = options.group === 'day' ? endOfDay(cursor) : options.group === 'week' ? endOfWeek(cursor, {weekStartsOn: options.weekStartsOn ?? 0}) : options.group === 'month' ? endOfMonth(cursor) : endOfYear(cursor);
    const stop = new Date(Math.min(boundary.getTime(), last.getTime()));
    const included: Job[] = [];
    while (jobIndex < dated.length && dated[jobIndex].time <= stop.getTime()) {
      if (dated[jobIndex].time >= cursor.getTime()) included.push(dated[jobIndex].job);
      jobIndex++;
    }
    rows.push({ start: cursor, end: stop, label: format(cursor, 'MMM d, yyyy') + (format(cursor,'yyyy-MM-dd') === format(stop,'yyyy-MM-dd') ? '' : ' – ' + format(stop,'MMM d, yyyy')), amount: reportAmount(included, options.metric, owner, rate), jobs: included.length, yards: included.reduce((n,j)=>n+Number(j.yards||0),0) });
    cursor = startOfDay(addDays(stop, 1));
  }
  return rows;
}
export function monthRanges(start: Date, end: Date) {
  const result: {start: Date; end: Date; label: string}[] = [];
  if (startOfDay(start) > endOfDay(end)) return result;
  let cursor = startOfMonth(start);
  while (cursor <= end && result.length < 1200) {
    result.push({start: new Date(Math.max(cursor.getTime(), startOfDay(start).getTime())), end: new Date(Math.min(endOfMonth(cursor).getTime(), endOfDay(end).getTime())), label: format(cursor,'MMMM yyyy')});
    cursor = addMonths(cursor,1);
  }
  return result;
}
