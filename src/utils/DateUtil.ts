// src/utils/DateUtils.ts
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Utility functions for consistent date handling throughout the app
 * These functions address timezone issues that can cause dates to appear off by one day
 */

/**
 * Formats a date string consistently across the app
 * @param dateString ISO date string
 * @param formatStr Format string for date-fns
 * @returns Formatted date string
 */
export const formatDateString = (dateString: string, formatStr: string = 'EEE, MMM d'): string => {
  try {
    // Force noon UTC to avoid timezone shifting the date
    const datePart = dateString.split('T')[0];
    const date = parseISO(`${datePart}T12:00:00Z`);
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Gets a date-only ISO string (YYYY-MM-DD)
 * @param date Date object or ISO string
 * @returns Date-only ISO string
 */
export const getDateOnlyString = (date: Date | string): string => {
  try {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error getting date-only string:', error);
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * Creates a timezone-safe date object for comparison
 * @param dateString ISO date string
 * @returns Date object set to noon UTC
 */
export const createSafeDate = (dateString: string): Date => {
  // Set to noon UTC to avoid date shifting when comparing
  const datePart = dateString.split('T')[0];
  return parseISO(`${datePart}T12:00:00Z`);
};

/**
 * Gets ISO date strings for start and end of week
 * @param date Current date
 * @param weekStartsOn Day of week that starts the week (0 = Sunday)
 * @returns Object with start and end ISO strings
 */
export const getWeekRange = (date: Date, weekStartsOn: number = 0): { start: string, end: string } => {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  
  // Force timezone-safe ISO strings
  return {
    start: `${getDateOnlyString(start)}T00:00:00Z`,
    end: `${getDateOnlyString(end)}T23:59:59Z`
  };
};

/**
 * Gets ISO date strings for start and end of month
 * @param date Current date
 * @returns Object with start and end ISO strings
 */
export const getMonthRange = (date: Date): { start: string, end: string } => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  // Force timezone-safe ISO strings
  return {
    start: `${getDateOnlyString(start)}T00:00:00Z`,
    end: `${getDateOnlyString(end)}T23:59:59Z`
  };
};

/**
 * Groups array items by date
 * @param items Array of items with a date property
 * @param dateField Name of the date field in each item
 * @returns Record with date keys and arrays of items
 */
export const groupByDate = <T extends { [key: string]: any }>(
  items: T[],
  dateField: string = 'date'
): Record<string, T[]> => {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    // Get date-only string as the key
    const dateKey = getDateOnlyString(item[dateField]);
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    
    acc[dateKey].push(item);
    return acc;
  }, {});
};

/**
 * Compares if a date is within a date range
 * @param date Date to check
 * @param startDate Start of range
 * @param endDate End of range
 * @returns Boolean indicating if date is in range
 */
export const isDateInRange = (
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean => {
  // Convert all to safe date objects for comparison
  const safeDate = typeof date === 'string' ? createSafeDate(date) : date;
  const safeStart = typeof startDate === 'string' ? createSafeDate(startDate) : startDate;
  const safeEnd = typeof endDate === 'string' ? createSafeDate(endDate) : endDate;
  
  return safeDate >= safeStart && safeDate <= safeEnd;
};