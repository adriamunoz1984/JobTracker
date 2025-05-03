// src/utils/DateUtil.ts
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  addMonths, subMonths, addWeeks, subWeeks, isValid } from 'date-fns';

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
export const formatDate = (dateString: string, formatStr: string = 'EEE, MMM d'): string => {
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
 * Converts a Date object to a date string (YYYY-MM-DD)
 * @param date Date object
 * @returns Date string in YYYY-MM-DD format
 */
export const toDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Creates a date object that's guaranteed to be noon UTC
 * to avoid timezone issues when comparing dates
 * @param dateString ISO date string or YYYY-MM-DD string
 * @returns Date object at noon UTC
 */
export const createSafeDate = (dateString: string): Date => {
  // Extract just the date part (YYYY-MM-DD)
  const datePart = dateString.split('T')[0];
  // Create new date at noon UTC
  return new Date(`${datePart}T12:00:00Z`);
};

/**
 * Creates a safe date at noon UTC from year, month, day components
 * @param year Full year (e.g., 2023)
 * @param month Month index (0-11)
 * @param day Day of month (1-31)
 * @returns Date object at noon UTC
 */
export const createSafeDateFromComponents = (year: number, month: number, day: number): Date => {
  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return new Date(`${dateString}T12:00:00Z`);
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
    start: `${toDateString(start)}T00:00:00Z`,
    end: `${toDateString(end)}T23:59:59Z`
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
    start: `${toDateString(start)}T00:00:00Z`,
    end: `${toDateString(end)}T23:59:59Z`
  };
};

/**
 * Gets start and end Date objects for a month
 * @param date Current date
 * @returns Object with start and end Date objects
 */
export const getMonthBoundaries = (date: Date): { start: Date, end: Date } => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  // Create timezone-safe dates at noon
  return {
    start: new Date(`${toDateString(start)}T12:00:00Z`),
    end: new Date(`${toDateString(end)}T12:00:00Z`)
  };
};

/**
 * Gets start and end Date objects for a week
 * @param date Current date
 * @param weekStartsOn Day of week that starts the week (0 = Sunday)
 * @returns Object with start and end Date objects
 */
export const getWeekBoundaries = (date: Date, weekStartsOn: number = 0): { start: Date, end: Date } => {
  const start = startOfWeek(date, { weekStartsOn });
  const end = endOfWeek(date, { weekStartsOn });
  
  // Create timezone-safe dates at noon
  return {
    start: new Date(`${toDateString(start)}T12:00:00Z`),
    end: new Date(`${toDateString(end)}T12:00:00Z`)
  };
};

/**
 * Safe method to navigate to the previous month
 * @param date Current date
 * @returns New date in the previous month
 */
export const goToPreviousMonth = (date: Date): Date => {
  const prevMonth = subMonths(date, 1);
  // Create timezone-safe date at noon
  return new Date(`${toDateString(prevMonth)}T12:00:00Z`);
};

/**
 * Safe method to navigate to the next month
 * @param date Current date
 * @returns New date in the next month
 */
export const goToNextMonth = (date: Date): Date => {
  const nextMonth = addMonths(date, 1);
  // Create timezone-safe date at noon
  return new Date(`${toDateString(nextMonth)}T12:00:00Z`);
};

/**
 * Safe method to navigate to the previous week
 * @param date Current date
 * @returns New date in the previous week
 */
export const goToPreviousWeek = (date: Date): Date => {
  const prevWeek = subWeeks(date, 1);
  // Create timezone-safe date at noon
  return new Date(`${toDateString(prevWeek)}T12:00:00Z`);
};

/**
 * Safe method to navigate to the next week
 * @param date Current date
 * @returns New date in the next week
 */
export const goToNextWeek = (date: Date): Date => {
  const nextWeek = addWeeks(date, 1);
  // Create timezone-safe date at noon
  return new Date(`${toDateString(nextWeek)}T12:00:00Z`);
};

/**
 * Groups array items by date
 * @param items Array of items with a date property
 * @returns Record with date keys and arrays of items
 */
export const groupItemsByDate = <T extends { date: string }>(
  items: T[]
): Record<string, T[]> => {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    // Get date-only string as the key
    const dateKey = item.date.split('T')[0];
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    
    acc[dateKey].push(item);
    return acc;
  }, {});
};

/**
 * Safely formats a date string, handling invalid dates
 * @param dateString ISO date string or date string
 * @param formatString Format string for date-fns
 * @returns Formatted date string or error message if invalid
 */
export const formatDateSafely = (dateString: string | undefined, formatString: string = 'MMMM dd, yyyy'): string => {
  if (!dateString) return 'No date';
  
  try {
    const date = new Date(dateString);
    // Check if the date is valid
    if (!isValid(date)) {
      console.warn('Invalid date encountered:', dateString);
      return 'Invalid date';
    }
    
    // Create a timezone-safe version at noon UTC
    const datePart = dateString.split('T')[0];
    const safeDate = new Date(`${datePart}T12:00:00Z`);
    
    return format(safeDate, formatString);
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return 'Error with date';
  }
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